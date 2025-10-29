import express from 'express';
import { tenantContextMiddleware, releaseDbClientMiddleware } from './middleware/tenantContext.middleware';
// ... other router imports
import { usageEventsRouter } from './routes/usageEvents.router'; // <-- IMPORT THE NEW ROUTER

const app = express();
app.use(express.json()); // <-- IMPORTANT: Add body parser for JSON

// 1. --- Critical Setup Middleware ---
app.use(tenantContextMiddleware);

// 2. --- Define Routes ---
// ... your other routes
app.use('/api/v1/usage-events', usageEventsRouter); // <-- REGISTER THE NEW ROUTER

// 3. --- Cleanup Middleware ---
app.use(releaseDbClientMiddleware);

// 4. --- Centralized Error Handler ---
app.use((err, req, res, next) => {
  console.error(err); // Log the error
  
  // Handle AJV validation errors specifically
  if (err.message.includes('UsageEvent schema validation failed')) {
    return res.status(422).json({
      code: 'VALIDATION_ERROR',
      message: 'Request body does not conform to usagepilot.v1 schema.',
      details: JSON.parse(err.message.split(': ')[1])
    });
  }

  // Generic error response
  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred.',
  });
});

export default app;
