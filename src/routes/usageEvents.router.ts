import { Router } from 'express';
import { ingestUsageEventHandler } from '../controllers/usageEvents.controller';

const router = Router();

// Define the route
router.post('/', ingestUsageEventHandler);

export { router as usageEventsRouter };
