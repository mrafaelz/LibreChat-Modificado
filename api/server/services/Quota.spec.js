const mockComputeUsageCostUSD = jest.fn();

jest.mock('@librechat/api', () => ({
  computeUsageCostUSD: (...args) => mockComputeUsageCostUSD(...args),
}));

const { settleQuota } = require('./Quota');

describe('settleQuota', () => {
  it('consumes the reservation when the provider omitted usage metadata', async () => {
    const db = {
      settleQuota: jest.fn().mockResolvedValue(),
      findBalanceByUser: jest.fn().mockResolvedValue(null),
      upsertBalanceFields: jest.fn().mockResolvedValue({ quotaUsed: 25, quotaReserved: 0 }),
    };

    await settleQuota({
      userId: 'user-123',
      role: 'USER',
      config: { enabled: true, plans: { free: { weeklyCredits: 10000000 } } },
      db,
      reservation: { amount: 25 },
      usages: [],
      pricing: {},
    });

    expect(db.settleQuota).toHaveBeenCalledWith({ user: 'user-123', reserved: 25, actual: 25 });
    expect(mockComputeUsageCostUSD).not.toHaveBeenCalled();
  });

  it('consumes the reservation when usage has no calculable price', async () => {
    mockComputeUsageCostUSD.mockReturnValue(0);
    const db = {
      settleQuota: jest.fn().mockResolvedValue(),
      findBalanceByUser: jest.fn().mockResolvedValue(null),
      upsertBalanceFields: jest.fn().mockResolvedValue({ quotaUsed: 25, quotaReserved: 0 }),
    };

    await settleQuota({
      userId: 'user-123',
      role: 'USER',
      config: { enabled: true, plans: { free: { weeklyCredits: 10000000 } } },
      db,
      reservation: { amount: 25 },
      usages: [{ input_tokens: 100, output_tokens: 50 }],
      pricing: {},
    });

    expect(db.settleQuota).toHaveBeenCalledWith({ user: 'user-123', reserved: 25, actual: 25 });
  });
});
