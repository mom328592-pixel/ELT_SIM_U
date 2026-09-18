# ETL Tourist SIM Registration — Complete No OTP

This project is prepared as a single backend + frontend package with OTP removed from customer registration.

## Included
- MySQL schema + safe upgrade SQL + seed/test SQL
- Auth: login, refresh, logout, logout-all, profile/session support
- Users and agents management
- Customer management and search
- SIM management, status and search
- Registration create/list/detail/update/delete
- Admin-only Approve / Reject endpoints
- SIM reservation while registration is Pending
- Passport image upload + OCR
- Customer phone and passport expiry storage
- Packages CRUD
- Payments create/history/status
- eSIM activation code / LPA value + QR display
- Image upload/static URL under `/uploads`
- Dashboard/reports/audit logs/notifications
- Swagger at `/api-docs`
- Health endpoint at `/health`
- No OTP dependency in application flow

## 1. Database
Use MySQL 8.x and database name `sim_management_db`.

Fresh setup:
1. Run `my-api/database/01_schema.sql`
2. Run `my-api/database/03_seed.sql`

Existing database:
1. Backup your database.
2. Run `my-api/database/02_upgrade_existing.sql`
3. Run `my-api/database/03_seed.sql`

Validation:
- Run `my-api/database/04_test_queries.sql`

Optional removal of old OTP table:
- Run `my-api/database/05_cleanup_otp.sql`

## 2. Backend
Edit `my-api/.env` and set your real MySQL password and strong JWT secrets.

PowerShell:
```powershell
cd my-api
npm install
npm start
```
API: `http://localhost:3000`
Swagger: `http://localhost:3000/api-docs`
Health: `http://localhost:3000/health`

## 3. Frontend
PowerShell:
```powershell
cd sim-frontend
npm install
npm run dev
```
Open the Vite URL, normally `http://localhost:5173`.

## 4. Customer flow (no OTP)
Customer Registration → Select SIM type → Select Package → Upload Passport → OCR → Verify details → Enter phone → Confirm → Pending → Admin Approve/Reject → Payment → Active/eSIM QR.

## 5. Important production notes
- Replace the JWT secrets before real deployment.
- The example QR display uses an online QR image service; for an offline/private deployment, replace this with a local QR generator.
- Payment currently records payment status and does not connect to a bank/payment gateway.
- OCR accuracy depends on passport image quality and MRZ readability.


## Registration Package Rule
Package is assigned to each SIM by Admin. Customer Registration does not submit or choose `id_package`; the backend reads the active package linked to the selected SIM.
