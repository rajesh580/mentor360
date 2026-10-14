import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { query } from './config/db.js';
import { securityHeadersMiddleware } from './middlewares/security.middleware.js';
import { apiLimiter, authLimiter, importExportLimiter } from './middlewares/rateLimit.middleware.js';
import { cacheService } from './services/cache.service.js';

// Import module routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import institutionRoutes from './modules/institution/institution.routes.js';
import studentRoutes from './modules/students/student.routes.js';
import proctorRoutes from './modules/proctor/proctor.routes.js';
import meetingRoutes from './modules/meetings/meeting.routes.js';
import academicRoutes from './modules/academic/academic.routes.js';
import interventionRoutes from './modules/interventions/intervention.routes.js';
import counsellingRoutes from './modules/counselling/counselling.routes.js';
import developmentRoutes from './modules/development/development.routes.js';
import communicationRoutes from './modules/communication/communication.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import fileRoutes from './modules/files/file.routes.js';

dotenv.config();

export const createApp = (): Express => {
  const app = express();

  // Trust first proxy (Render, AWS ALB, Cloudflare, NGINX)
  app.set('trust proxy', 1);

  // 1. Production Security Headers & Traceability
  app.use(securityHeadersMiddleware);

  // 2. High-Performance Gzip/Brotli Compression
  app.use(compression());

  // 3. CORS Configuration
  const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === 'production'
          ? (origin, callback) => {
              if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
              return callback(new Error('Origin is not allowed by CORS.'));
            }
          : true,
      credentials: true,
    })
  );

  // 4. Request Body Parsers with safe payload limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 5. Health Check (Liveness Probe)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      platform: 'Mentor360 Multi-Tenant Educational SaaS API',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // 6. Deep Readiness Probe (Verifies PostgreSQL connection & latency)
  app.get('/ready', async (_req: Request, res: Response) => {
    const start = Date.now();
    try {
      await query('SELECT 1');
      const latencyMs = Date.now() - start;
      const memUsage = process.memoryUsage();

      res.json({
        status: 'ready',
        database: 'connected',
        dbLatencyMs: latencyMs,
        cacheStats: cacheService.stats(),
        memory: {
          heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMb: Math.round(memUsage.rss / 1024 / 1024),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'unready',
        database: 'disconnected',
        error: err.message || 'Database ping failed',
      });
    }
  });

  // 7. Cache Management Endpoints (Admin inspection & manual purge)
  app.get('/api/cache/stats', (_req: Request, res: Response) => {
    res.json(cacheService.stats());
  });

  app.post('/api/cache/flush', (_req: Request, res: Response) => {
    cacheService.flush();
    res.json({ message: 'Server cache successfully cleared.' });
  });

  // 8. Rate Limiting Protection
  // Strict limiter for authentication
  app.use('/api/auth/login', authLimiter);
  // Heavy payload / import limiter
  app.use('/api/reports/import-preview', importExportLimiter);
  // Global API rate limit
  app.use('/api', apiLimiter);

  // 9. API V1 Routes (Model / Module-wise)
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/institution', institutionRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/proctors', proctorRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/academic', academicRoutes);
  app.use('/api/interventions', interventionRoutes);
  app.use('/api/counselling', counsellingRoutes);
  app.use('/api/development', developmentRoutes);
  app.use('/api/communication', communicationRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/files', fileRoutes);

  // 10. 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // 11. Production Error Handler (Safe error messages without leaking stack traces)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled API Error:', err);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      ...(isProd ? {} : { stack: err.stack }),
    });
  });

  return app;
};
