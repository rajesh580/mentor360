import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import module routes
import authRoutes from './modules/auth/auth.routes.js';
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

  // Global Middlewares
  const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
          return callback(new Error('Origin is not allowed by CORS.'));
        }
      : true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      platform: 'Mentor360 SaaS Platform API',
      timestamp: new Date().toISOString(),
    });
  });

  // API V1 Routes (Model / Module-wise)
  app.use('/api/auth', authRoutes);
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

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  return app;
};
