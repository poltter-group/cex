import { Router } from 'express';
import { marketsRouter } from './routes/markets.js';
import { nowpaymentsRouter } from './routes/nowpayments.js';

export const buildApp = () => {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount specific route handlers
  router.use('/markets', marketsRouter);
  router.use('/nowpayments', nowpaymentsRouter);

  return router;
};
