async function handle(res) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body; keep the default message
    }
    throw new Error(message);
  }
  return res.json();
}

export async function getHealth() {
  const res = await fetch("/api/health");
  return handle(res);
}

export async function listAttendance() {
  const res = await fetch("/api/attendance");
  const data = await handle(res);
  return data.records ?? [];
}

export async function submitAttendance({ photo, name, status, location, timestamp }) {
  const form = new FormData();
  form.append("photo", photo, "capture.jpg");
  form.append("name", name.trim());
  form.append("status", status);
  form.append("timestamp", timestamp);
  if (location) {
    form.append("lat", String(location.lat));
    form.append("lon", String(location.lon));
    if (location.accuracy != null) form.append("accuracy", String(location.accuracy));
  }
  const res = await fetch("/api/attendance", { method: "POST", body: form });
  return handle(res);
}
