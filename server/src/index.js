import "dotenv/config";
import express from "express";
import cors from "cors";
import attendanceRouter from "./routes/upload.js";
import { isDriveConfigured } from "./services/drive.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, driveConfigured: isDriveConfigured() });
});

app.use("/api/attendance", attendanceRouter);

// Central error handler — multer and route errors land here.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err?.status ?? 500).json({ error: err?.message || "Unexpected server error." });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Attendance API listening on http://localhost:${port}`);
  if (!isDriveConfigured()) {
    console.warn(
      "Warning: Google Drive is not configured (GOOGLE_SERVICE_ACCOUNT_KEY / DRIVE_FOLDER_ID). " +
        "Uploads will fail until server/.env is filled in — see README."
    );
  }
});
