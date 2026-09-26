/**
 * Runs inside a worker_threads Worker. Each worker gets its own slice of the
 * uploaded rows plus its own, independent mongoose connection (worker threads
 * don't share JS heaps/module registries, so this is a genuinely separate
 * mongoose instance from the main process and from sibling workers).
 */
const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');

const Agent = require('../models/Agent');
const Account = require('../models/Account');
const User = require('../models/User');
const Lob = require('../models/Lob');
const Carrier = require('../models/Carrier');
const Policy = require('../models/Policy');

function toDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function clean(value) {
  return (value || '').toString().trim();
}

/**
 * Upserts a lookup document (Agent/Account/Lob/Carrier/User) and tolerates
 * the race where a sibling worker inserts the same doc a few milliseconds
 * first - in that case Mongo raises a duplicate-key error (11000) and we
 * simply re-fetch the winning document instead of failing the row.
 */
async function upsertRef(Model, filter, insertDoc) {
  try {
    return await Model.findOneAndUpdate(
      filter,
      { $setOnInsert: insertDoc },
      { new: true, upsert: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      return Model.findOne(filter);
    }
    throw err;
  }
}

async function processRow(row) {
  const agentName = clean(row.agent);
  const accountName = clean(row.account_name);
  const firstname = clean(row.firstname);
  const email = clean(row.email).toLowerCase();
  const categoryName = clean(row.category_name);
  const companyName = clean(row.company_name);
  const policyNumber = clean(row.policy_number);

  if (!firstname || !policyNumber || !categoryName || !companyName) {
    throw new Error(
      `Missing required field(s) - policy_number="${policyNumber || 'N/A'}", ` +
        `firstname="${firstname || 'N/A'}", category_name="${categoryName || 'N/A'}", ` +
        `company_name="${companyName || 'N/A'}"`
    );
  }

  const agent = agentName ? await upsertRef(Agent, { name: agentName }, { name: agentName }) : null;

  const account = accountName
    ? await upsertRef(
        Account,
        { accountName, agentId: agent ? agent._id : null },
        { accountName, accountType: clean(row.account_type), agentId: agent ? agent._id : null }
      )
    : null;

  const user = await upsertRef(
    User,
    { firstname, email },
    {
      firstname,
      email,
      dob: toDate(row.dob),
      address: clean(row.address),
      city: clean(row.city),
      phone: clean(row.phone),
      state: clean(row.state),
      zip: clean(row.zip),
      gender: clean(row.gender),
      userType: clean(row.userType),
      accountId: account ? account._id : null
    }
  );

  const lob = await upsertRef(Lob, { categoryName }, { categoryName });
  const carrier = await upsertRef(Carrier, { companyName }, { companyName });

  const result = await Policy.findOneAndUpdate(
    { policyNumber },
    {
      $setOnInsert: {
        policyNumber,
        policyStartDate: toDate(row.policy_start_date),
        policyEndDate: toDate(row.policy_end_date),
        lobId: lob._id,
        carrierId: carrier._id,
        userId: user._id
      }
    },
    { new: true, upsert: true, rawResult: true }
  );

  return result.lastErrorObject && result.lastErrorObject.updatedExisting ? 'updated' : 'inserted';
}

async function run() {
  const { rows, mongoUri } = workerData;
  const summary = { processed: 0, inserted: 0, updated: 0, failed: 0, errors: [] };

  await mongoose.connect(mongoUri);

  for (const row of rows) {
    summary.processed += 1;
    try {
      const outcome = await processRow(row);
      summary[outcome] += 1;
    } catch (err) {
      summary.failed += 1;
      summary.errors.push({ policy_number: row.policy_number, message: err.message });
    }
  }

  await mongoose.disconnect();
  parentPort.postMessage({ type: 'result', payload: summary });
}

run().catch((err) => {
  parentPort.postMessage({
    type: 'result',
    payload: {
      processed: 0,
      inserted: 0,
      updated: 0,
      failed: (workerData.rows || []).length,
      errors: [{ message: `Worker fatal error: ${err.message}` }]
    }
  });
});
