# Attendance Camera

An attendance web app that captures facial photos with the device camera, bakes in a **timestamp** and **real-time GPS location**, and automatically uploads each photo to **Google Drive** via a Google Cloud **service account**.

- **Frontend:** React 18 + Tailwind CSS 4 (Vite)
- **Backend:** Node.js + Express
- **Storage:** Google Drive (service account) + a local JSON attendance log

## Project layout

```
attendance-app/
├── client/                 # React + Tailwind app (Vite)
│   └── src/
│       ├── components/
│       │   ├── CameraCapture.jsx    # webcam preview, canvas capture, overlay
│       │   ├── AttendanceForm.jsx   # name + check-in/out + photo preview
│       │   └── AttendanceLog.jsx    # recent attendance records
│       ├── lib/api.js               # fetch helpers
│       └── App.jsx
├── server/                 # Express API
│   ├── .env.example        # copy to .env and fill in
│   ├── data/attendance.json  # local attendance log (created at runtime)
│   └── src/
│       ├── index.js
│       ├── routes/upload.js        # POST/GET /api/attendance
│       └── services/
│           ├── drive.js            # Google Drive upload (service account)
│           ├── geocode.js          # reverse geocoding (OpenStreetMap, free)
│           └── log.js              # JSON attendance log
└── README.md
```

## Prerequisites

- **Node.js 18+** (uses the built-in `fetch`)
- A Google account
- A device with a camera and GPS (phone/laptop). Camera and geolocation require **HTTPS or `localhost`** — local development on `localhost` works out of the box.

## 1. Set up Google Drive (service account)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (or use an existing one).
2. **Enable the Drive API:** APIs & Services → Library → search "Google Drive API" → Enable.
3. **Create a service account:** IAM & Admin → Service Accounts → Create service account.
   - Name it e.g. `attendance-uploader`. No roles or permissions are required.
   - Open the service account → **Keys** tab → **Add key** → **Create new key** → **JSON** → Create. A JSON key file downloads.
4. **Create a Drive folder** in your own Drive (this is where attendance photos will land).
   - **Share the folder** with the service account's email address (the `client_email` inside the JSON file, e.g. `attendance-uploader@your-project.iam.gserviceaccount.com`) and give it **Editor** access.
   - Copy the **folder ID** from the URL: `https://drive.google.com/drive/folders/<THIS_PART>`.

## 2. Configure the backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | The **entire contents** of the downloaded JSON key file, pasted as a single line |
| `DRIVE_FOLDER_ID` | The folder ID from step 4 above |
| `PORT` | Optional, defaults to `3001` |

> `.env` is git-ignored. Never commit the service account key.

## 3. Install & run

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev        # http://localhost:3001

# Terminal 2 — frontend
cd client
npm install
npm run dev        # http://localhost:5173
```

Open **http://localhost:5173**, allow camera and location permissions, then:

1. **Start camera** → 2. **Capture photo** → 3. Enter your name and pick Check-In/Check-Out → 4. **Submit attendance**.

The photo uploads to your Drive folder and appears in the "Recent attendance" list with a link to open it in Drive.

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | `{ ok, driveConfigured }` — whether Drive credentials are present |
| `/api/attendance` | POST | multipart form: `photo` (image file), `name`, `status` (`check-in`\|`check-out`), `timestamp` (ISO), `lat`, `lon`, `accuracy` → uploads to Drive, appends to the local log. Returns `201` with the record. |
| `/api/attendance` | GET | Last 50 records from the local JSON log (newest first) |

Example upload with [curl](https://curl.se/):

```bash
curl -X POST http://localhost:3001/api/attendance \
  -F "photo=@capture.jpg" \
  -F "name=Jordan Alvarez" \
  -F "status=check-in" \
  -F "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## How it works

- **Camera:** `navigator.mediaDevices.getUserMedia()` streams video to a `<video>` element; "Capture" draws the current frame to a `<canvas>`.
- **Timestamp overlay:** the local date/time + timezone (e.g. `2026-10-18 14:32:07 EDT`) is drawn **into the image pixels** so it can't be edited out later.
- **Location:** `navigator.geolocation.getCurrentPosition()` is called at the exact moment of capture. Coordinates are drawn into the image, and the backend reverse-geocodes them (OpenStreetMap Nominatim, free, no API key) into a readable address stored as the Drive file's description.
- **Google Drive:** the backend authenticates as the service account and calls Drive API v3 `files.create`. Each file gets searchable **custom properties**: `employee`, `status`, `timestamp`, `latitude`, `longitude` — search them in Drive via `properties has { key='employee' and value='Jordan Alvarez' }`.
- **Local log:** every record is also appended to `server/data/attendance.json` so the UI's recent list is instant.

## Behavior notes & limits

- **Camera/location denied:** the app degrades gracefully — you'll be prompted to re-allow, and photos without a location are marked "Location unavailable".
- **No database:** attendance records live in a flat JSON file. Easy to swap for SQLite/Postgres later — see `server/src/services/log.js`.
- **Privacy:** attendance photos and location are visible to anyone with access to the Drive folder. Get consent from people using this, and check your local laws before deploying.
- **Service account scope:** files live in the shared folder only — the service account has no access to users' "My Drive".
- **Single server process:** the JSON log is written with no locking; fine for a small team, not for concurrent multi-server deployments.
