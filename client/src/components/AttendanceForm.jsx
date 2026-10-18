import { useState } from "react";

const STATUSES = [
  { value: "check-in", label: "Check In", activeClass: "bg-emerald-600 text-white" },
  { value: "check-out", label: "Check Out", activeClass: "bg-amber-500 text-slate-950" },
];

export default function AttendanceForm({ photo, uploading, onSubmit }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("check-in");

  const canSubmit = Boolean(photo) && name.trim().length > 0 && !uploading;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), status });
    setName("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
        Attendance details
      </h2>

      <div className="mb-4 overflow-hidden rounded-xl border border-slate-800 bg-black">
        {photo ? (
          <img src={photo.previewUrl} alt="Captured attendance photo" className="w-full" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-sm text-slate-500">
            No photo captured yet
          </div>
        )}
        {photo?.location && (
          <p className="bg-slate-800 px-3 py-2 text-xs text-slate-400">
            📍 {photo.location.lat.toFixed(5)}, {photo.location.lon.toFixed(5)} · captured{" "}
            {new Date(photo.timestamp).toLocaleString()}
          </p>
        )}
        {photo && !photo.location && (
          <p className="bg-slate-800 px-3 py-2 text-xs text-amber-400">
            ⚠️ No location available for this photo
          </p>
        )}
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-400" htmlFor="name">
        Full name
      </label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Jordan Alvarez"
        autoComplete="name"
        className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
      />

      <span className="mb-2 block text-xs font-medium text-slate-400">Status</span>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {STATUSES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              status === option.value
                ? option.activeClass
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {uploading ? "Uploading to Google Drive…" : "Submit attendance"}
      </button>

      {!photo && (
        <p className="mt-2 text-center text-xs text-slate-500">Capture a photo first.</p>
      )}
    </form>
  );
}
