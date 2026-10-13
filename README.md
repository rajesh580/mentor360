# Mentor360

Mentor360 is a multi-tenant student mentoring and academic support platform. The workspace includes authenticated access, institution user management, student records, mentor assignments, meetings, interventions, confidential counselling access, and academic imports.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- API: Node.js, Express, TypeScript
- Database: PostgreSQL
- Authentication: JWT and role-based access control

## Local development

1. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters.
2. In the same `server/.env` file, set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`, `ADMIN_INSTITUTION_CODE`, and `ADMIN_INSTITUTION_NAME` for the initial administrator.
3. Run `npm install` at the project root and `npm install` in `client` and `server`.
4. Run `npm run db:migrate`; run `npm run db:seed` only when you want the sample development institution and data.
5. Run `npm run db:bootstrap-admin` once the configured institution exists, then `npm run dev` to start the API and frontend.

The frontend runs at `http://localhost:5173` and the API at `http://localhost:5000`. The frontend uses Vite's `/api` proxy locally.


Deploy the API and built frontend as separate services. Build from the repository root with `npm run build`.

### API service

- Build command: `npm install --prefix server && npm run build:server`
- Start command: `npm start`
- Root directory: repository root
- Set `NODE_ENV=production`, `PORT` (provided by the host), `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_URL`.
- `JWT_SECRET` must be a private random value of at least 32 characters. `CLIENT_URL` must be the exact frontend origin, such as `https://mentor.example.edu` (no path). Multiple origins may be comma-separated.
- Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`, `ADMIN_INSTITUTION_CODE`, and `ADMIN_INSTITUTION_NAME` for the one-time administrator bootstrap. Use a private password of at least 12 characters.
- Run database migrations and then provision the first institution admin before serving traffic: `npm run db:migrate` followed by `npm run db:bootstrap-admin`. The bootstrap creates the configured institution if it does not exist.
- Institution administrators can create and review accounts in the app's **User Management** tab. They can assign staff, student, and parent roles; super administrators can manage accounts across institutions.

### Frontend static service

- Build command: `npm install --prefix client && npm run build:client`
- Publish directory: `client/dist`
- Set `VITE_API_URL` to the public API origin, such as `https://api.mentor.example.edu` (no trailing slash), before building.
- Configure the static host to serve `index.html` for application routes.

Never run the seed command against production data. Keep `.env` files and their credentials out of source control. The API refuses to start when its database or JWT configuration is missing.

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
| `npm run db:bootstrap-admin` | Create or reset the configured institution admin |
