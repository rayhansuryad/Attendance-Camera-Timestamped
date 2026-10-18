import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { uploadToDrive } from "../services/drive.js";
import { reverseGeocode } from "../services/geocode.js";
import { appendRecord, listRecords } from "../services/log.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image uploads are allowed."));
  },
});

function slugify(value) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "unknown"
  );
}

// POST /api/attendance — photo + name + status (+ optional coords/timestamp)
router.post("/", upload.single("photo"), async (req, res, next) => {
  try {
    const { name, status, lat, lon, accuracy, timestamp } = req.body;

    if (!req.file) return res.status(400).json({ error: "Missing photo file (field: photo)." });
    if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
    if (!["check-in", "check-out"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'check-in' or 'check-out'." });
    }

    const capturedAt =
      timestamp && !Number.isNaN(Date.parse(timestamp))
        ? new Date(timestamp).toISOString()
        : new Date().toISOString();

    const location =
      lat && lon
        ? { lat: Number(lat), lon: Number(lon), accuracy: accuracy ? Number(accuracy) : null }
        : null;

    const locationLabel = location ? await reverseGeocode(location.lat, location.lon) : null;

    const fileName = `attendance_${slugify(name)}_${status === "check-out" ? "out" : "in"}_${capturedAt.replace(
      /[:.]/g,
      "-"
    )}.jpg`;

    const driveFile = await uploadToDrive({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      name: fileName,
      description: [`${name.trim()} — ${status} @ ${capturedAt}`, locationLabel]
        .filter(Boolean)
        .join("\n"),
      properties: {
        employee: name.trim(),
        status,
        timestamp: capturedAt,
        latitude: location ? String(location.lat) : "unknown",
        longitude: location ? String(location.lon) : "unknown",
      },
    });

    const record = await appendRecord({
      id: randomUUID(),
      name: name.trim(),
      status,
      timestamp: capturedAt,
      location,
      locationLabel,
      fileName,
      driveFileId: driveFile.id ?? null,
      driveWebViewLink: driveFile.webViewLink ?? null,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ ok: true, record });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance — most recent records from the local log
router.get("/", async (_req, res, next) => {
  try {
    res.json({ records: await listRecords(50) });
  } catch (err) {
    next(err);
  }
});

export default router;
