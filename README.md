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
