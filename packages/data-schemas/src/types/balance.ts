import type { RefillIntervalUnit } from 'librechat-data-provider';
import type { Document, Types } from 'mongoose';

export interface IBalance extends Document {
  user: Types.ObjectId;
  tokenCredits: number;
  // Automatic refill settings
  autoRefillEnabled: boolean;
  refillIntervalValue: number;
  refillIntervalUnit: RefillIntervalUnit;
  lastRefill: Date;
  refillAmount: number;
  quotaPlan?: string;
  quotaCurrency?: string;
  quotaLimit?: number;
  quotaUsed?: number;
  quotaReserved?: number;
  quotaPeriodStart?: Date;
  quotaPeriodEnd?: Date;
  tenantId?: string;
}

/** Plain data fields for creating or updating a balance record (no Mongoose Document methods) */
export interface IBalanceUpdate {
  user?: string;
  tokenCredits?: number;
  autoRefillEnabled?: boolean;
  refillIntervalValue?: number;
  refillIntervalUnit?: RefillIntervalUnit;
  refillAmount?: number;
  lastRefill?: Date;
  quotaPlan?: string;
  quotaCurrency?: string;
  quotaLimit?: number;
  quotaUsed?: number;
  quotaReserved?: number;
  quotaPeriodStart?: Date;
  quotaPeriodEnd?: Date;
}
