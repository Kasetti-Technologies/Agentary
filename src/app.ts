// src/app.ts
import express, {
  type Request,
  type Response,
  type NextFunction,
  type ErrorRequestHandler,
} from 'express';

import {
  tenantContextMiddleware,
  releaseDbClientMiddleware,
} from './middleware/tenantContext.middleware';
import { usageEventsRouter } from './routes/usageEvents.router';
import { billingSubscriptionsRouter } from './routes/billingSubscriptions.router';

const app = express();
app.get('/health', (_req, res) => { res.status(200).json({ ok: true }); });
// JSON body parser
app.use(express.json());

// Critical Setup Middleware (attaches tenantContext + dbClient)
app.use(tenantContextMiddleware);

// Routes
app.use('/api/v1/usage-events', usageEventsRouter);
app.use('/api/v1/billing/subscriptions', billingSubscriptionsRouter);

// Cleanup Middleware (releases dbClient after response)
app.use(releaseDbClientMiddleware);

// Centralized Error Handler (typed)
const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next,
) => {
  console.error(err);

  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    (err as any).message.includes('UsageEvent schema validation failed')
  ) {
    const message = (err as any).message as string;

    return res.status(422).json({
      code: 'VALIDATION_ERROR',
      message:
        'Request body does not conform to usagepilot.v1 schema.',
      details: JSON.parse(message.split(': ')[1]),
    });
  }

  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred.',
  });
};

app.use(errorHandler);

export default app;
