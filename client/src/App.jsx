import { useCallback, useEffect, useState } from "react";
import CameraCapture from "./components/CameraCapture.jsx";
import AttendanceForm from "./components/AttendanceForm.jsx";
import AttendanceLog from "./components/AttendanceLog.jsx";
import { getHealth, listAttendance, submitAttendance } from "./lib/api.js";

export default function App() {
  const [capture, setCapture] = useState(null); // { blob, previewUrl, timestamp, location }
  const [records, setRecords] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "success" | "error", message }
  const [driveConfigured, setDriveConfigured] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setRecords(await listAttendance());
    } catch {
      // backend offline (e.g. first load); keep whatever we had
    }
  }, []);

  useEffect(() => {
    refresh();
    getHealth()
      .then((health) => setDriveConfigured(Boolean(health.driveConfigured)))
      .catch(() => setDriveConfigured(null));
  }, [refresh]);

  const handleCapture = useCallback(({ blob, timestamp, location }) => {
    setCapture((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { blob, previewUrl: URL.createObjectURL(blob), timestamp, location };
    });
    setNotice(null);
  }, []);

  const handleSubmit = async ({ name, status }) => {
    setUploading(true);
    setNotice(null);
    try {
      const result = await submitAttendance({
        photo: capture.blob,
        name,
        status,
        location: capture.location,
        timestamp: capture.timestamp,
      });
      setNotice({
        type: "success",
        message: `Saved ${status} for ${name}${
          result.record?.driveWebViewLink ? " — photo uploaded to Google Drive." : "."
        }`,
      });
      setCapture((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return null;
      });
      await refresh();
    } catch (err) {
      setNotice({ type: "error", message: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Attendance Camera</h1>
            <p className="text-xs text-slate-400">
              Timestamped, geo-tagged photos saved to Google Drive
            </p>
          </div>
          <span className="hidden rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 sm:block">
            Local dev
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {driveConfigured === false && (
          <div className="mb-6 rounded-xl border border-amber-800 bg-amber-950/50 px-4 py-3 text-sm text-amber-300">
            Google Drive is not configured on the server. Copy{" "}
            <code className="rounded bg-amber-900/60 px-1">server/.env.example</code> to{" "}
            <code className="rounded bg-amber-900/60 px-1">server/.env</code> and add your service
            account key and folder ID — see the README.
          </div>
        )}

        {notice && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-800 bg-emerald-950/50 text-emerald-300"
                : "border-red-800 bg-red-950/50 text-red-300"
            }`}
          >
            {notice.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <CameraCapture onCapture={handleCapture} />
            <AttendanceForm photo={capture} uploading={uploading} onSubmit={handleSubmit} />
          </div>
          <div className="lg:col-span-2">
            <AttendanceLog records={records} />
          </div>
        </div>
      </main>
    </div>
  );
}
