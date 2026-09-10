const express = require('express');
const mongoose = require('mongoose');
const { createAdminUsersHandlers, revokeUserCodeEnvironmentWorkers } = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const {
  drainAgentTriggerDeliveriesForUser,
  prepareAgentTriggerUserPurge,
  cancelAgentTriggerUserPurge,
  purgeAgentTriggerDeliveriesForUser,
} = require('~/server/services/Agents/triggers');
const db = require('~/models');
const { getAppConfig, invalidateCodeEnvironmentConfigCache } = require('~/server/services/Config');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);
const requireReadUsers = requireCapability(SystemCapabilities.READ_USERS);
const requireManageUsers = requireCapability(SystemCapabilities.MANAGE_USERS);

const handlers = createAdminUsersHandlers({
  findUsers: db.findUsers,
  countUsers: db.countUsers,
  beginAgentTriggerUserDeletion: db.beginAgentTriggerUserDeletion,
  cancelAgentTriggerUserDeletion: db.cancelAgentTriggerUserDeletion,
  drainAgentTriggerDeliveriesForUser,
  prepareAgentTriggerUserPurge,
  cancelAgentTriggerUserPurge,
  purgeAgentTriggerDeliveriesForUser,
  revokeUserCodeEnvironmentWorkers: async (userId) =>
    revokeUserCodeEnvironmentWorkers({
      mongoose,
      userId,
      appConfig: await getAppConfig({ baseOnly: true }),
    }),
  deleteUserById: db.deleteUserById,
  deleteUserCodeEnvironments: db.deleteUserCodeEnvironments,
  invalidateCodeEnvironmentConfigCache,
  deleteConfig: db.deleteConfig,
  deleteAclEntries: db.deleteAclEntries,
});

router.use(requireJwtAuth, requireAdminAccess);

router.get('/', requireReadUsers, handlers.listUsers);
router.get('/search', requireReadUsers, handlers.searchUsers);
router.patch('/:id/quota', requireManageUsers, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, used } = req.body ?? {};
    if (typeof plan !== 'string' && !(typeof used === 'number' && used >= 0)) {
      return res.status(400).json({ error: 'Provide a plan or a non-negative used quota value.' });
    }
    const fields = {};
    if (typeof plan === 'string') fields.quotaPlan = plan;
    if (typeof used === 'number') fields.quotaUsed = used;
    const balance = await db.upsertBalanceFields(id, fields);
    return res.json({ plan: balance?.quotaPlan, used: balance?.quotaUsed ?? 0 });
  } catch (error) {
    return next(error);
  }
});
router.post('/:id/quota/refill', requireManageUsers, async (req, res, next) => {
  try {
    const { id } = req.params;
    const amount = req.body?.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      return res.status(400).json({ error: 'amount must be a finite number.' });
    }
    const current = await db.findBalanceByUser(id);
    const balance = await db.upsertBalanceFields(id, {
      quotaUsed: Math.max(0, (current?.quotaUsed ?? 0) - amount),
    });
    return res.json({ used: balance?.quotaUsed ?? 0 });
  } catch (error) {
    return next(error);
  }
});
// router.delete('/:id', requireManageUsers, handlers.deleteUser);

module.exports = router;
