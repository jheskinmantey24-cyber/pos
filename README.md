# JESKIN POS

A production-style Point of Sale system for small businesses, built with Express, MySQL, and vanilla JavaScript front-end assets.

## Business profile
- Business type: general retail / convenience store
- Currency: GH₵
a
- Special needs: mobile money, basic stock control, printable receipts

## Stack
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Database: MySQL via mysql2
- Authentication: JWT + bcrypt
- Config: dotenv

## Folder structure
- `config/` — environment configuration and database pool
- `controllers/` — request handlers for auth, users, products, inventory, sales, refunds, reports
- `middleware/` — auth, authorization, error handling
- `routes/` — route registration and API endpoints
- `utils/` — reusable logic for auth, sales, refunds, reports, inventory
- `tests/` — behavior tests for key modules
- `schema.sql` — MySQL schema
- `seed.sql` — initial seed data

## Setup
1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Create a MySQL database and user.
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with real values:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=replace_with_secure_secret
   JWT_EXPIRES_IN=8h
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=jeskin_pos
   CORS_ORIGIN=http://localhost:3000
   ```
5. Import the schema and seed data:
   ```bash
   mysql -u root -p < schema.sql
   mysql -u root -p < seed.sql
   ```

## Aiven MySQL + Render deployment

### 1. Aiven (one time)
1. Create a MySQL service and download its **CA certificate**; the project already ships it as `ca.pem` in the repository root (it is a public CA certificate, safe to commit).
2. Note the connection details shown in the Aiven console: service host, port, user (`avnadmin`), password, and database name (`defaultdb`).
3. Run schema initialization once against Aiven (from your machine, with a temporary `.env` pointing at Aiven):
   ```bash
   npm run init-db
   ```
   The script is idempotent (`CREATE TABLE IF NOT EXISTS`) and never drops or alters tables.

### 2. Render (service → Environment)
Set these environment variables on the backend web service (values only in Render, never in Git):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST` | Aiven service host |
| `DB_PORT` | Aiven service port |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | Aiven service password |
| `DB_NAME` | `defaultdb` |
| `JWT_SECRET` | random 32+ character secret |
| `JWT_EXPIRES_IN` | `8h` |
| `CORS_ORIGIN` | `https://<your-render-service>.onrender.com` (or `*`) |

Optional: `DB_SSL_CA` (certificate path, defaults to `ca.pem`), `DB_CONNECTION_LIMIT` (default `10`).

Build command: `npm install` — Start command: `npm start` (listens on `process.env.PORT` as Render requires). Node >= 18 is declared in `package.json`.

The server exits on startup if required variables are missing or the database connection fails, and only ever logs variable **names** — never values.

### 3. First admin account
There is **no default admin password** in production. Create the first user by running once in the Render shell:
```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-random-password' ADMIN_FULL_NAME='Root Admin' npm run create-admin
```
Variables are read from the environment only, and neither the email nor password is logged. Do not run the old `seed.sql` against production.

### 4. Verify
- Health check reports real database connectivity: `GET /api/health` → `{"status":"ok","database":"connected"}` (HTTP 503 when the DB is unreachable).
- Persistence check: create a product, restart/redeploy the backend in Render, log in, and confirm the product and any sales still exist — data lives in Aiven, so redeploying the app never resets it.
- Local backups still work with `npm run backup` (mysqldump with the same `DB_*` variables).

## Run the app
```bash
npm start
```

For development:
```bash
npm run dev
```

## Business operations
```bash
npm run backup
npm run healthcheck
```

## Backup and restore
- Run `npm run backup` to create a MySQL dump in the `backups/` folder.
- Store backups in a second location such as OneDrive, Google Drive, or an external drive.
- To restore locally:
  ```bash
  mysql -u root -p < backups/jeskin_pos-YYYYMMDD-HHMMSS.sql
  ```

## API health check
```bash
curl http://localhost:3000/api/health
```

## Key endpoints
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products`
- `GET /api/inventory/low-stock`
- `POST /api/inventory/adjustments`
- `POST /api/sales`
- `POST /api/refunds/sales/:saleId/refund`
- `GET /api/reports/sales`

## Testing
Run the project test suite:
```bash
npm test
```

or individual files:
```bash
node --test tests/auth.test.js
node --test tests/products.test.js
node --test tests/sales.test.js
node --test tests/refunds.test.js
node --test tests/reports.test.js
```

## Security notes
- JWT secret is stored in `.env` and not hard-coded.
- Passwords are bcrypt hashed.
- Role-based authorization is enforced on privileged endpoints.
- Input validation and centralized error handling are used.
- Rate limiting and Helmet middleware are enabled.

## Known limitations
- Frontend UI is a backend-first foundation; a full browser UI is not yet implemented.
- Reports are server-side summary endpoints and can be extended for richer charts.
- Multi-branch inventory and offline synchronization are not yet included.
- MoMo gateway integration is stubbed rather than fully connected to a provider.

## Suggested next steps
- Build the actual HTML/CSS/JS storefront and dashboard pages.
- Add a proper print stylesheet for receipts.
- Integrate real payment providers for mobile money and card processing.
- Add multi-branch support and more detailed reporting dashboards.
- Add e2e tests and CI automation.
