const TOPICS = {
  ORDERS_CREATED:     'orders.created',
  ORDERS_FILLED:      'orders.filled',
  COPY_FAN_OUT:       'copy.fan_out',
  WITHDRAWALS_REQ:    'withdrawals.requested',
  DEPOSITS_CONFIRMED: 'deposits.confirmed',
  KYC_UPDATED:        'kyc.updated',
  NOTIFICATIONS_SEND: 'notifications.send',
  EXCHANGE_FILLS:     'exchange.fills',
};

// Event schemas (produce/consume using these exact shapes):

export interface OrderFilledEvent {
  orderId: string;
  userId: string;
  pair: string;
  side: 'buy' | 'sell';
  quantity: string;
  price: string;
  fee: string;
  feeAsset: string;
  timestamp: number;
}

export interface CopyFanOutEvent {
  traderUserId: string;
  orderId: string;
  pair: string;
  side: 'buy' | 'sell';
  traderPortfolioValue: string;
}

export interface NotificationSendEvent {
  userId: string;
  type: string;
  title: string;
  body: string;
  emailTemplate?: string;
  emailData?: Record<string, unknown>;
}

export default TOPICS;
