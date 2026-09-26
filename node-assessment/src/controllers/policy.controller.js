const User = require('../models/User');
const Policy = require('../models/Policy');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatPolicy(p) {
  return {
    policyNumber: p.policyNumber,
    policyStartDate: p.policyStartDate,
    policyEndDate: p.policyEndDate,
    user: p.userId,
    category: p.lobId ? p.lobId.categoryName : null,
    carrier: p.carrierId ? p.carrierId.companyName : null
  };
}

// GET /api/policies/search?username=<firstname-or-email>
async function searchPoliciesByUser(req, res) {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Query param "username" is required.' });
  }

  try {
    const users = await User.find({
      $or: [{ firstname: new RegExp(`^${escapeRegex(username)}$`, 'i') }, { email: username.toLowerCase() }]
    }).lean();

    if (!users.length) {
      return res.status(404).json({ success: false, message: `No user found matching "${username}".` });
    }

    const userIds = users.map((u) => u._id);

    const policies = await Policy.find({ userId: { $in: userIds } })
      .populate('userId', 'firstname email phone state')
      .populate('lobId', 'categoryName')
      .populate('carrierId', 'companyName')
      .lean();

    return res.json({ success: true, count: policies.length, data: policies.map(formatPolicy) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/policies/aggregate -> policies grouped/rolled up per user
async function aggregatedPoliciesByUser(req, res) {
  try {
    const pipeline = [
      { $lookup: { from: 'lobs', localField: 'lobId', foreignField: '_id', as: 'lob' } },
      { $unwind: '$lob' },
      { $lookup: { from: 'carriers', localField: 'carrierId', foreignField: '_id', as: 'carrier' } },
      { $unwind: '$carrier' },
      {
        $group: {
          _id: '$userId',
          totalPolicies: { $sum: 1 },
          policies: {
            $push: {
              policyNumber: '$policyNumber',
              policyStartDate: '$policyStartDate',
              policyEndDate: '$policyEndDate',
              category: '$lob.categoryName',
              carrier: '$carrier.companyName'
            }
          }
        }
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          firstname: '$user.firstname',
          email: '$user.email',
          totalPolicies: 1,
          policies: 1
        }
      },
      { $sort: { firstname: 1 } }
    ];

    const data = await Policy.aggregate(pipeline);
    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { searchPoliciesByUser, aggregatedPoliciesByUser };
