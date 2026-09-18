# ETL Tourist SIM Registration — Ready Version

OTP has been completely removed from the customer registration flow.

## Main workflow

1. Customer opens `/customer-registration`.
2. Selects Physical SIM or eSIM.
3. Takes/uploads passport photo.
4. Passport OCR reads the passport data.
5. Customer confirms/corrects personal information and enters phone number.
6. Customer submits registration — **no OTP is required**.
7. Registration is created with status **Pending**.
8. Admin opens **Registrations** and approves or rejects the request.
9. Approving changes the SIM from **Available** to the configured active/approved SIM status.
10. Rejecting returns the SIM to **Available**.

## Backend

Folder: `my-api`

### Configure database

Edit `.env`:

- `DB_HOST=localhost`
- `DB_USER=root`
- `DB_PASSWORD=YOUR_MYSQL_PASSWORD`
- `DB_NAME=sim_management_db`
- `DB_PORT=3306`
- `PORT=3000`

Then:

```powershell
cd my-api
npm install
npm start
```

API: `http://localhost:3000`

Swagger: `http://localhost:3000/api-docs`

## Frontend

Folder: `sim-frontend`

```powershell
cd sim-frontend
npm install
npm run dev
```

Open the Vite address shown in the terminal, normally:
`http://localhost:5173`

## Admin login

Use the admin account already created in your MySQL database. Do not put the real password in source code.

## OTP database cleanup

The application no longer uses `customer_otp`.

If the old table still exists and you want to remove it, run:

```sql
SOURCE my-api/cleanup_otp.sql;
```

or run:

```sql
DROP TABLE IF EXISTS customer_otp;
```

## Important status behavior

The customer success screen now says the registration was **submitted for review**, not immediately activated. This matches the backend workflow: the customer creates a Pending registration, and an administrator must approve it.

## Files changed for OTP removal

- `my-api/server.js`
- `my-api/controllers/public-registration.controller.js`
- deleted `my-api/controllers/public-otp.controller.js`
- deleted `my-api/routes/public-otp.routes.js`
- deleted `my-api/services/otp.service.js`
- `sim-frontend/src/pages/customer/CustomerRegistration.jsx`
- `sim-frontend/src/App.css`
- `my-api/.env`
- `my-api/package.json`

## Complete modules added
- Packages CRUD
- Payments create/history/status
- Admin-only registration approve/reject endpoints
- Customer/SIM search endpoints
- SIM Reserved status during pending review
- Customer phone + passport expiry storage
- Health check at `/health`
- Static image URL at `/uploads/...`
- Database schema, upgrade, seed and test SQL

The customer registration flow does not use OTP.
