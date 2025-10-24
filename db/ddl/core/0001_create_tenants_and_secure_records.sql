// src/app.ts (or wherever you configure Express/middleware)
import express from 'express';
// Import the middleware functions
import { tenantContextMiddleware, releaseDbClientMiddleware } from './middleware/tenantContext.middleware'; 
import { router as clientRouter } from './routes/client';

const app = express();

// 1. --- Critical Setup Middleware ---
// This must run before any routes that access the DB via client connection.
// It acquires the DB connection and sets the RLS context.
app.use(tenantContextMiddleware); 

// 2. --- Define Routes ---
// These routes will now automatically filter data based on the set 'app.tenant_id'
app.use('/api/v1/client', clientRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/catalog', catalogRouter);

// 3. --- Cleanup Middleware ---
// This must run after all processing, or as close to the response finish event as possible.
// It releases the connection back to the pool.
app.use(releaseDbClientMiddleware);

// Handle errors last (e.g., RLS violations, JWT errors)
app.use((err, req, res, next) => { 
//... your centralized error handler...
});

export default app;
