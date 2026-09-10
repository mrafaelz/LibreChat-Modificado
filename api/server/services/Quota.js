const { computeUsageCostUSD } = require('@librechat/api');

/** One token credit is one millionth of a USD, matching the balance ledger. */
const CREDITS_PER_USD = 1000000;
const DEFAULT_RESERVATION_CREDITS = 1;
const CONSERVATIVE_OUTPUT_TOKENS = 4096;
function currentWeek(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - ((day + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function getPlan(config, role) {
  const normalizedRole = role?.toUpperCase();
  const freePlan = config.plans?.free ?? config.plans?.[config.defaultPlan];
  const proPlan = config.plans?.pro;

  if (normalizedRole === 'ADMIN' && proPlan) {
    return { name: 'admin', weeklyCredits: proPlan.weeklyCredits * 10 };
  }

  if (normalizedRole === 'PRO' && proPlan) {
    return { name: 'pro', ...proPlan };
  }

  return freePlan ? { name: 'free', ...freePlan } : null;
}

async function getQuotaStatus({ userId, role, config, db }) {
  if (!config?.enabled) return null;
  const balance = await db.findBalanceByUser(userId);
  const plan = getPlan(config, role);
  if (!plan) return null;
  const { start, end } = currentWeek();
  const stale =
    balance?.quotaCurrency !== 'credits' ||
    balance?.quotaLimit !== plan.weeklyCredits ||
    !balance?.quotaPeriodEnd ||
    new Date(balance.quotaPeriodEnd).getTime() !== end.getTime();
  let record = balance;
  if (stale) {
    record = await db.upsertBalanceFields(userId, {
      quotaPlan: plan.name,
      quotaCurrency: 'credits',
      quotaLimit: plan.weeklyCredits,
      tokenCredits: plan.weeklyCredits,
      quotaReserved: 0,
      quotaPeriodStart: start,
      quotaPeriodEnd: end,
    });
  } else if (balance?.quotaPlan !== plan.name) {
    record = await db.upsertBalanceFields(userId, {
      quotaPlan: plan.name,
      quotaLimit: plan.weeklyCredits,
    });
  }
  const credits = Math.max(0, record?.tokenCredits ?? 0);
  const reserved = Math.max(0, record?.quotaReserved ?? 0);
  const used = Math.max(0, plan.weeklyCredits - credits - reserved);
  return {
    plan: plan.name,
    limit: plan.weeklyCredits,
    used,
    reserved,
    percent: Math.min(100, Math.round((used / plan.weeklyCredits) * 100)),
    resetsAt: end.toISOString(),
  };
}

async function reserveQuota({ userId, role, config, db, amount = DEFAULT_RESERVATION_CREDITS }) {
  const status = await getQuotaStatus({ userId, role, config, db });
  if (!status) {
    return null;
  }
  const { start, end } = currentWeek();
  const record = await db.reserveQuota({
    user: userId,
    amount,
    limit: status.limit,
    periodStart: start,
    periodEnd: end,
    plan: status.plan,
  });
  if (!record) {
    return false;
  }
  return { amount, status: { ...status, reserved: Math.max(0, record.quotaReserved ?? 0) } };
}

/** Reserve against the producing model's completion rate. Exact usage is not
 * available until the stream closes, so this deliberately assumes a sizeable
 * response and is reconciled after the provider reports final usage. */
function estimateReservationUnits({ model, endpointTokenConfig, db }) {
  if (!model) return DEFAULT_RESERVATION_CREDITS;
  const rate = db.getMultiplier({
    model,
    endpointTokenConfig,
    tokenType: 'completion',
    inputTokenCount: CONSERVATIVE_OUTPUT_TOKENS,
  });
  const credits = Math.ceil(
    ((Math.abs(rate) * CONSERVATIVE_OUTPUT_TOKENS) / 1e6) * CREDITS_PER_USD,
  );
  return Math.max(DEFAULT_RESERVATION_CREDITS, credits);
}

async function settleQuota({
  userId,
  role,
  config,
  db,
  reservation,
  usages,
  pricing,
  endpointTokenConfig,
}) {
  if (!config?.enabled || !reservation) {
    return null;
  }
  const hasUsage = Array.isArray(usages) && usages.length > 0;
  const cost = hasUsage
    ? usages.reduce(
        (sum, usage) => sum + computeUsageCostUSD(usage, pricing, endpointTokenConfig),
        0,
      )
    : 0;
  /** Some compatible providers omit usage metadata or a price for streamed
   * responses. Keep the conservative preflight hold in either case so a
   * successful reply cannot consume no weekly quota. */
  const actual = cost > 0 ? Math.ceil(cost * CREDITS_PER_USD) : reservation.amount;
  await db.settleQuota({ user: userId, reserved: reservation.amount, actual });
  return getQuotaStatus({ userId, role, config, db });
}

async function releaseQuota({ userId, role, config, db, reservation }) {
  if (!config?.enabled || !reservation) {
    return null;
  }
  await db.releaseQuota({ user: userId, reserved: reservation.amount });
  return getQuotaStatus({ userId, role, config, db });
}

module.exports = {
  getQuotaStatus,
  reserveQuota,
  estimateReservationUnits,
  settleQuota,
  releaseQuota,
};
