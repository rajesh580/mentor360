# Mentor360

Mentor360 is a multi-tenant student mentoring and academic support platform. The workspace includes authenticated access, student records, mentor assignments, meetings, interventions, confidential counselling access, and academic imports.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- API: Node.js, Express, TypeScript
- Database: PostgreSQL
- Authentication: JWT and role-based access control

## Local development

1. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters.
2. Run `npm install` at the project root and `npm install` in `client` and `server`.
3. Run `npm run db:migrate`, then optionally `npm run db:seed` to add development accounts and sample records.
4. Run `npm run dev` to start the API and frontend.

The frontend runs at `http://localhost:5173` and the API at `http://localhost:5000`. The frontend uses Vite's `/api` proxy locally.

## Production deployment

Deploy the API and built frontend as separate services. Build from the repository root with `npm run build`.

### API service

- Build command: `npm install && npm run build:server`
- Start command: `npm start`
- Root directory: repository root
- Set `NODE_ENV=production`, `PORT` (provided by the host), `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_URL`.
- `JWT_SECRET` must be a private random value of at least 32 characters. `CLIENT_URL` must be the exact frontend origin, such as `https://mentor.example.edu` (no path). Multiple origins may be comma-separated.
- Run database migrations against the production database before serving traffic: `npm run db:migrate`.

### Frontend static service

- Build command: `npm install && npm run build:client`
- Publish directory: `client/dist`
- Set `VITE_API_URL` to the public API origin, such as `https://api.mentor.example.edu` (no trailing slash), before building.
- Configure the static host to serve `index.html` for application routes.

Never run the seed command against production data. Keep environment files and database credentials out of source control. The API refuses to start when its database or JWT configuration is missing.

## Environment variables

See [`server/.env.example`](./server/.env.example) and [`client/.env.example`](./client/.env.example). Generate a JWT secret with a cryptographically secure random generator, for example `openssl rand -base64 48`.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend and API for local development |
| `npm run build` | Build frontend and API |
| `npm start` | Start the compiled API |
| `npm run db:migrate` | Apply the database schema |
| `npm run db:seed` | Add development sample data |
