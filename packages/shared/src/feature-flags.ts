import { pgTable, uuid, varchar, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const featureFlags = pgTable('feature_flags', {
  id:          uuid('id').primaryKey().defaultRandom(),
  key:         varchar('key', { length: 100 }).unique().notNull(),
  isEnabled:   boolean('is_enabled').default(false),
  description: text('description'),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const FLAGS = {
  TRADING_ENABLED:      'trading_enabled',
  COPY_TRADING_ENABLED: 'copy_trading_enabled',
  WITHDRAWALS_ENABLED:  'withdrawals_enabled',
  KYC_REQUIRED:         'kyc_required',
  HALAL_MODE_AVAILABLE: 'halal_mode_available',
  DEMO_TRADING:         'demo_trading_enabled',
  API_KEYS_ENABLED:     'api_keys_enabled',
} as const;
