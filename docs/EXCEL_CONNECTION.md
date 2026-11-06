# Google Drive / Excel Connection Process

## Overview
TaskFlow AI uses a Google Drive service account to access the existing workbook `TaskFlow_AI_Workbook.xlsx`, which is kept as an `.xlsx` file (not converted to Google Sheets) because it relies on Excel Tables and structured-reference formulas. All Excel operations run server-side via ExcelJS.

## Required environment variables
Create a `.env.local` from `.env.example` and set:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` – Service account email (e.g. `name@project.iam.gserviceaccount.com`).
- `GOOGLE_PRIVATE_KEY` – The service account private key, with literal `\n` sequences (as in the JSON key file).
- `GOOGLE_DRIVE_FILE_ID` – The Google Drive file ID of `TaskFlow_AI_Workbook.xlsx`.
- `SESSION_SECRET` – At least 32 random characters.
- `ADMIN_EMAILS` – Comma-separated list of admin email addresses.
- `NODE_ENV` – `development` or `production`.

## Google Cloud setup
1. Enable the **Google Drive API** in your Google Cloud project.
2. Create a **Service Account** and generate a JSON key.
3. From the JSON key, copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` → `GOOGLE_PRIVATE_KEY`.
4. Share the `.xlsx` file in Google Drive with the service account email as **Editor**.
5. Copy the file ID from the Drive URL (`https://drive.google.com/file/d/<FILE_ID>/view`) → `GOOGLE_DRIVE_FILE_ID`.

## How the integration works
1. User signs in with email at `/login` (development placeholder; no password).
2. Server verifies the email against the Employees sheet (or `ADMIN_EMAILS` on first run).
3. Server services download the workbook via the Drive API (`files.get` with `alt=media`).
4. ExcelJS parses worksheets and tables.
5. Modifications are applied in memory and uploaded via `files.update`, with a version check (modifiedTime) to detect conflicts.
6. A mutex serializes writes; conflicts return HTTP 409.

## Concurrency and safety
- Version-token conflict detection prevents silent overwrites.
- Writes are serialized per process.
- Validation (Zod) runs before every modification.
- Workbook structure (sheets/tables/columns) is preserved; only data rows change.

## Troubleshooting
- `404` / file not found: the file is not shared with the service account email, or the file ID is wrong.
- Invalid private key format: ensure `GOOGLE_PRIVATE_KEY` contains literal `\n` sequences and the full key including headers.
- Drive API not enabled: enable it in Google Cloud Console.
- `invalid_grant`: service account credentials are wrong or the key was revoked.

## Notes
- Google Drive file content endpoints + ExcelJS are used; Graph/OneDrive/MSAL are not.
- No salary, payslip, attendance, or shift modules are included.
- Email-only sign-in has no password and is a development placeholder only.