import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

let cachedClient = null;

function getServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not set. Copy server/.env.example to server/.env and fill it in (see README)."
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY must be the raw JSON of the service account key file, pasted as a single line."
    );
  }
}

function getFolderId() {
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error(
      "DRIVE_FOLDER_ID is not set. Copy server/.env.example to server/.env and fill it in (see README)."
    );
  }
  return folderId;
}

function getDriveClient() {
  if (cachedClient) return cachedClient;
  const auth = new google.auth.GoogleAuth({
    credentials: getServiceAccount(),
    scopes: SCOPES,
  });
  cachedClient = google.drive({ version: "v3", auth });
  return cachedClient;
}

export function isDriveConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.DRIVE_FOLDER_ID);
}

/**
 * Uploads a photo buffer to the configured Google Drive folder.
 * `properties` are indexed custom fields, so files can be searched in Drive
 * by employee name, status, or timestamp.
 */
export async function uploadToDrive({ buffer, mimeType, name, description = "", properties = {} }) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      description,
      parents: [getFolderId()],
      properties,
    },
    media: { mimeType, body: buffer },
    fields: "id, name, webViewLink, createdTime",
  });
  return res.data;
}
