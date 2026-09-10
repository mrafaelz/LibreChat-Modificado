const express = require('express');
const { requireJwtAuth, configMiddleware } = require('~/server/middleware');
const db = require('~/models');
const { getQuotaStatus } = require('~/server/services/Quota');

const router = express.Router();

router.get('/', requireJwtAuth, configMiddleware, async (req, res, next) => {
  try {
    const quota = await getQuotaStatus({
      userId: req.user.id,
      role: req.user.role,
      config: req.config.usageQuota,
      db,
    });
    if (!quota) return res.sendStatus(204);
    return res.json(quota);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
