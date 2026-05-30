import {
  pgTable, uuid, varchar, boolean, integer, numeric,
  timestamp, inet, text, pgEnum, index, uniqueIndex
} from 'drizzle-orm/pg-core';

// ── ENUMS ──────────────────────────────────────────────────────
export const kycStatusEnum = pgEnum('kyc_status', ['none','pending','approved','rejected']);
export const planEnum = pgEnum('plan', ['free','pro','institutional']);
export const orderTypeEnum = pgEnum('order_type', ['market','limit','stop_limit','oco']);
export const sideEnum = pgEnum('side', ['buy','sell']);
export const orderStatusEnum = pgEnum('order_status', ['open','partial','filled','cancelled']);
export const depositStatusEnum = pgEnum('deposit_status', ['pending','confirmed','credited','failed']);
export const withdrawalStatusEnum = pgEnum('withdrawal_status', ['pending','processing','completed','failed','rejected']);
export const accountTypeEnum = pgEnum('account_type', ['live','demo']);
export const feeTypeEnum = pgEnum('fee_type', ['trade','withdrawal','subscription','referral','copy_profit']);

// ── USERS ──────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:               uuid('id').primaryKey().defaultRandom(),
  email:            varchar('email', { length: 255 }).unique().notNull(),
  passwordHash:     varchar('password_hash', { length: 255 }),
  totpSecret:       varchar('totp_secret', { length: 255 }),
  totpEnabled:      boolean('totp_enabled').default(false),
  authProvider:     varchar('auth_provider', { length: 50 }).default('email'),
  kycStatus:        kycStatusEnum('kyc_status').default('none'),
  kycLevel:         integer('kyc_level').default(0),
  subscriptionPlan: planEnum('subscription_plan').default('free'),
  referralCode:     varchar('referral_code', { length: 20 }).unique().notNull(),
  referredBy:       uuid('referred_by'),
  isHalalMode:      boolean('is_halal_mode').default(false),
  isActive:         boolean('is_active').default(true),
  isDeleted:        boolean('is_deleted').default(false),
  deletedAt:        timestamp('deleted_at', { withTimezone: true }),
  anonymizedAt:     timestamp('anonymized_at', { withTimezone: true }),
  isAdmin:          boolean('is_admin').default(false),
  lastLoginAt:      timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp:      inet('last_login_ip'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── REFRESH TOKENS ─────────────────────────────────────────────
export const refreshTokens = pgTable('refresh_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash:  varchar('token_hash', { length: 255 }).unique().notNull(),
  familyId:   uuid('family_id').notNull(),
  isRevoked:  boolean('is_revoked').default(false),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userIdx:   index('idx_rt_user').on(t.userId),
  familyIdx: index('idx_rt_family').on(t.familyId),
}));

// ── FEATURE FLAGS ──────────────────────────────────────────────
export const featureFlags = pgTable('feature_flags', {
  id:          uuid('id').primaryKey().defaultRandom(),
  key:         varchar('key', { length: 100 }).unique().notNull(),
  isEnabled:   boolean('is_enabled').default(false),
  description: text('description'),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── WALLETS ────────────────────────────────────────────────────
export const wallets = pgTable('wallets', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id),
  accountType:    accountTypeEnum('account_type').default('live'),
  assetSymbol:    varchar('asset_symbol', { length: 20 }).notNull(),
  network:        varchar('network', { length: 50 }).notNull(),
  depositAddress: varchar('deposit_address', { length: 255 }).unique(),
  hdIndex:        integer('hd_index'),
  balance:        numeric('balance', { precision: 36, scale: 18 }).default('0'),
  lockedBalance:  numeric('locked_balance', { precision: 36, scale: 18 }).default('0'),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userIdx:      index('idx_wallets_user').on(t.userId),
  uniqueWallet: uniqueIndex('uq_wallet').on(t.userId, t.assetSymbol, t.network, t.accountType),
}));

// ── ORDERS ─────────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id:                uuid('id').primaryKey().defaultRandom(),
  userId:            uuid('user_id').notNull().references(() => users.id),
  accountType:       accountTypeEnum('account_type').default('live'),
  pair:              varchar('pair', { length: 20 }).notNull(),
  orderType:         orderTypeEnum('order_type').notNull(),
  side:              sideEnum('side').notNull(),
  quantity:          numeric('quantity', { precision: 36, scale: 18 }).notNull(),
  price:             numeric('price', { precision: 36, scale: 18 }),
  stopPrice:         numeric('stop_price', { precision: 36, scale: 18 }),
  filledQuantity:    numeric('filled_quantity', { precision: 36, scale: 18 }).default('0'),
  status:            orderStatusEnum('status').default('open'),
  fee:               numeric('fee', { precision: 36, scale: 18 }).default('0'),
  feeAsset:          varchar('fee_asset', { length: 20 }),
  feeRate:           numeric('fee_rate', { precision: 10, scale: 6 }),
  externalExchange:  varchar('external_exchange', { length: 20 }),
  externalOrderId:   varchar('external_order_id', { length: 100 }),
  isCopyOrder:       boolean('is_copy_order').default(false),
  copyFromUserId:    uuid('copy_from_user_id'),
  clientOrderId:     varchar('client_order_id', { length: 100 }),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userIdx:       index('idx_orders_user').on(t.userId),
  pairStatusIdx: index('idx_orders_pair_status').on(t.pair, t.status),
}));

// ── TRADES ─────────────────────────────────────────────────────
export const trades = pgTable('trades', {
  id:          uuid('id').primaryKey().defaultRandom(),
  orderId:     uuid('order_id').notNull().references(() => orders.id),
  userId:      uuid('user_id').notNull().references(() => users.id),
  pair:        varchar('pair', { length: 20 }).notNull(),
  side:        sideEnum('side').notNull(),
  quantity:    numeric('quantity', { precision: 36, scale: 18 }).notNull(),
  price:       numeric('price', { precision: 36, scale: 18 }).notNull(),
  fee:         numeric('fee', { precision: 36, scale: 18 }).notNull(),
  feeAsset:    varchar('fee_asset', { length: 20 }).notNull(),
  isMaker:     boolean('is_maker').default(false),
  executedAt:  timestamp('executed_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userIdx: index('idx_trades_user').on(t.userId),
  pairIdx: index('idx_trades_pair').on(t.pair),
}));

// ── DEPOSITS ───────────────────────────────────────────────────
export const deposits = pgTable('deposits', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  userId:                uuid('user_id').notNull().references(() => users.id),
  assetSymbol:           varchar('asset_symbol', { length: 20 }).notNull(),
  network:               varchar('network', { length: 50 }).notNull(),
  amount:                numeric('amount', { precision: 36, scale: 18 }).notNull(),
  txHash:                varchar('tx_hash', { length: 255 }).unique(),
  toAddress:             varchar('to_address', { length: 255 }).notNull(),
  status:                depositStatusEnum('status').default('pending'),
  confirmations:         integer('confirmations').default(0),
  requiredConfirmations: integer('required_confirmations').notNull(),
  creditedAt:            timestamp('credited_at', { withTimezone: true }),
  createdAt:             timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── WITHDRAWALS ────────────────────────────────────────────────
export const withdrawals = pgTable('withdrawals', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  userId:             uuid('user_id').notNull().references(() => users.id),
  assetSymbol:        varchar('asset_symbol', { length: 20 }).notNull(),
  network:            varchar('network', { length: 50 }).notNull(),
  amount:             numeric('amount', { precision: 36, scale: 18 }).notNull(),
  fee:                numeric('fee', { precision: 36, scale: 18 }).notNull(),
  destinationAddress: varchar('destination_address', { length: 255 }).notNull(),
  txHash:             varchar('tx_hash', { length: 255 }),
  status:             withdrawalStatusEnum('status').default('pending'),
  adminApproved:      boolean('admin_approved').default(false),
  adminId:            uuid('admin_id'),
  adminNote:          text('admin_note'),
  createdAt:          timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── KYC DOCUMENTS ─────────────────────────────────────────────
export const kycDocuments = pgTable('kyc_documents', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  s3Key:        varchar('s3_key', { length: 500 }).notNull(),
  providerRef:  varchar('provider_ref', { length: 255 }),
  status:       varchar('status', { length: 50 }).default('pending'),
  reviewedBy:   uuid('reviewed_by'),
  reviewNote:   text('review_note'),
  submittedAt:  timestamp('submitted_at', { withTimezone: true }).defaultNow(),
});

// ── COPY TRADING ───────────────────────────────────────────────
export const copyTraders = pgTable('copy_traders', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull().references(() => users.id).unique(),
  isPublic:        boolean('is_public').default(false),
  profitSharePct:  numeric('profit_share_pct', { precision: 5, scale: 2 }).default('10.00'),
  minCopyAmount:   numeric('min_copy_amount', { precision: 36, scale: 18 }).default('100'),
  bio:             text('bio'),
  roi30d:          numeric('roi_30d', { precision: 10, scale: 4 }).default('0'),
  winRate:         numeric('win_rate', { precision: 5, scale: 2 }).default('0'),
  totalFollowers:  integer('total_followers').default(0),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const copyFollows = pgTable('copy_follows', {
  id:            uuid('id').primaryKey().defaultRandom(),
  copierUserId:  uuid('copier_user_id').notNull().references(() => users.id),
  traderUserId:  uuid('trader_user_id').notNull().references(() => users.id),
  copyAmount:    numeric('copy_amount', { precision: 36, scale: 18 }).notNull(),
  maxLossPct:    numeric('max_loss_pct', { precision: 5, scale: 2 }).default('20.00'),
  isActive:      boolean('is_active').default(true),
  startedAt:     timestamp('started_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  uniqueFollow: uniqueIndex('uq_copy_follow').on(t.copierUserId, t.traderUserId),
}));

// ── API KEYS ───────────────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id),
  label:       varchar('label', { length: 100 }),
  keyHash:     varchar('key_hash', { length: 255 }).unique().notNull(),
  keyPrefix:   varchar('key_prefix', { length: 20 }).notNull(),
  permissions: text('permissions').array().default(['read']),
  isActive:    boolean('is_active').default(true),
  lastUsedAt:  timestamp('last_used_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── FEE LEDGER ─────────────────────────────────────────────────
export const feeLedger = pgTable('fee_ledger', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id),
  feeType:     feeTypeEnum('fee_type').notNull(),
  amount:      numeric('amount', { precision: 36, scale: 18 }).notNull(),
  assetSymbol: varchar('asset_symbol', { length: 20 }).notNull(),
  referenceId: uuid('reference_id'),
  collectedAt: timestamp('collected_at', { withTimezone: true }).defaultNow(),
});

// ── REFERRAL COMMISSIONS ───────────────────────────────────────
export const referralCommissions = pgTable('referral_commissions', {
  id:               uuid('id').primaryKey().defaultRandom(),
  referrerId:       uuid('referrer_id').notNull().references(() => users.id),
  refereeId:        uuid('referee_id').notNull().references(() => users.id),
  tradeId:          uuid('trade_id').references(() => trades.id),
  commissionAmount: numeric('commission_amount', { precision: 36, scale: 18 }).notNull(),
  assetSymbol:      varchar('asset_symbol', { length: 20 }).notNull(),
  level:            integer('level').default(1),
  paid:             boolean('paid').default(false),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── SUBSCRIPTIONS ──────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id),
  plan:         planEnum('plan').notNull(),
  pricePaid:    numeric('price_paid', { precision: 36, scale: 18 }),
  paymentAsset: varchar('payment_asset', { length: 20 }),
  paymentTx:    varchar('payment_tx', { length: 255 }),
  startedAt:    timestamp('started_at', { withTimezone: true }).defaultNow(),
  expiresAt:    timestamp('expires_at', { withTimezone: true }).notNull(),
  isActive:     boolean('is_active').default(true),
});

// ── NOTIFICATIONS ─────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id),
  type:      varchar('type', { length: 50 }).notNull(),
  title:     varchar('title', { length: 255 }).notNull(),
  body:      text('body'),
  isRead:    boolean('is_read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  unreadIdx: index('idx_notif_user_unread').on(t.userId, t.isRead),
}));

// ── SUPPORT TICKETS ────────────────────────────────────────────
export const supportTickets = pgTable('support_tickets', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id),
  subject:    varchar('subject', { length: 255 }).notNull(),
  status:     varchar('status', { length: 50 }).default('open'),
  priority:   varchar('priority', { length: 20 }).default('normal'),
  assignedTo: uuid('assigned_to'),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const supportMessages = pgTable('support_messages', {
  id:        uuid('id').primaryKey().defaultRandom(),
  ticketId:  uuid('ticket_id').notNull().references(() => supportTickets.id),
  senderId:  uuid('sender_id').notNull().references(() => users.id),
  isStaff:   boolean('is_staff').default(false),
  content:   text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── AUDIT LOG ─────────────────────────────────────────────────
export const auditLog = pgTable('audit_log', {
  id:         uuid('id').primaryKey().defaultRandom(),
  adminId:    uuid('admin_id').notNull().references(() => users.id),
  action:     varchar('action', { length: 100 }).notNull(),
  targetId:   uuid('target_id'),
  targetType: varchar('target_type', { length: 50 }),
  details:    text('details'),
  ip:         inet('ip'),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
});
