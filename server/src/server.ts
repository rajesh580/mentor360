import 'dotenv/config';
import { createApp } from './app.js';

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

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Mentor360 SaaS Backend running on http://localhost:${PORT}`);
  console.log(`📡 Connected to Neon DB PostgreSQL`);
  console.log(`🎓 Modules Active: 11 SRS Core Functional Modules`);
  console.log(`=======================================================`);
});
