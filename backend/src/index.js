import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth.js';
import { assetRoutes } from './routes/assets.js';
import { workOrderRoutes } from './routes/workOrders.js';
import { templateRoutes } from './routes/templates.js';
import { userRoutes } from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['https://fixtime-ai.pages.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'FixTime AI API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes with authentication middleware
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.use('/api/*', authMiddleware); // Protect all API routes
app.route('/api/assets', assetRoutes);
app.route('/api/work-orders', workOrderRoutes);
app.route('/api/templates', templateRoutes);

// Error handling middleware (must be last)
app.use('*', errorHandler);

export default {
  fetch: app.fetch,
};