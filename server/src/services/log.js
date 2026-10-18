import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const LOG_PATH = path.join(DATA_DIR, "attendance.json");

async function readAll() {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function appendRecord(record) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const records = await readAll();
  records.push(record);
  await fs.writeFile(LOG_PATH, JSON.stringify(records, null, 2));
  return record;
}

export async function listRecords(limit = 50) {
  const records = await readAll();
  return records.slice(-limit).reverse();
}
