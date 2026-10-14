import 'dotenv/config';
import { createApp } from './app.js';
import { pool } from './config/db.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before starting Mentor360.');
}

if (!process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32)) {
  throw new Error('Set JWT_SECRET to at least 32 characters (required in production).');
}

if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  throw new Error('Set CLIENT_URL to the deployed frontend origin in production.');
}

const app = createApp();
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Mentor360 SaaS Backend running on http://localhost:${PORT}`);
  console.log(`📡 Connected to Neon DB PostgreSQL`);
  console.log(`🎓 Modules Active: 11 SRS Core Functional Modules`);
  console.log(`🛡️ Rate Limiting & High-Speed Cache Activated`);
  console.log(`=======================================================`);
});

// Graceful Shutdown for Cloud Container Hosting
const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('PostgreSQL database pool closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('Error while closing database pool:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
