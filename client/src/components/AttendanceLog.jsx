function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AttendanceLog({ records }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Recent attendance
        </h2>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
          {records.length}
        </span>
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
          No attendance records yet. Captured photos will appear here after they upload to Google
          Drive.
        </p>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => (
            <li
              key={record.id}
              className="rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-white">{record.name}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    record.status === "check-in"
                      ? "bg-emerald-950 text-emerald-400"
                      : "bg-amber-950 text-amber-400"
                  }`}
                >
                  {record.status === "check-in" ? "Check-In" : "Check-Out"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{formatDate(record.timestamp)}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {record.locationLabel ||
                  (record.location
                    ? `${record.location.lat.toFixed(5)}, ${record.location.lon.toFixed(5)}`
                    : "No location")}
              </p>
              {record.driveWebViewLink && (
                <a
                  href={record.driveWebViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-sky-400 hover:text-sky-300"
                >
                  View in Google Drive ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
