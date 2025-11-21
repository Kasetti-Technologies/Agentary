import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  tenantContextMiddleware,
  releaseDbClientMiddleware,
} from './middleware/tenantContext.middleware';
import { usageEventsRouter } from './routes/usageEvents.router';

const app = express();

app.use(express.json());               // JSON body parser
app.use(tenantContextMiddleware);      //  Critical Setup Middleware
app.use('/api/v1/usage-events', usageEventsRouter); //  Routes
app.use(releaseDbClientMiddleware);   //  Cleanup Middleware

//  Centralized Error Handler (typed)
app.use(
  (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
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
        message: 'Request body does not conform to usagepilot.v1 schema.',
        details: JSON.parse(message.split(': ')[1]),
      });
    }

    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    });
  }
);

export default app;
