import { useCallback, useEffect, useRef, useState } from "react";

/** "2026-10-18 14:32:07 EDT" — date, 24h local time, short timezone name. */
function formatTimestamp(date) {
  const datePart = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const timePart = date.toLocaleTimeString("en-GB", { hour12: false }); // HH:MM:SS
  const tz = date.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop();
  return `${datePart} ${timePart} ${tz}`;
}

/** Resolves with coordinates, or null if denied/unavailable — never rejects. */
function getPosition() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function describeError(err) {
  if (err?.name === "NotAllowedError") return "Camera permission was denied. Allow camera access in your browser and try again.";
  if (err?.name === "NotFoundError") return "No camera was found on this device.";
  if (window.isSecureContext === false)
    return "Camera access requires HTTPS or localhost.";
  return err?.message || "Could not start the camera.";
}

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [active, setActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [lastCaptureAt, setLastCaptureAt] = useState(null);
  const [geo, setGeo] = useState({ lat: null, lon: null, accuracy: null });

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setActive(true);
      // Kick off an initial location readout; capture refreshes it anyway.
      getPosition().then((pos) => pos && setGeo(pos));
    } catch (err) {
      setCameraError(describeError(err));
    }
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !video.videoWidth) return;

    setCapturing(true);
    try {
      // Fresh location at the exact moment of the photo.
      const position = await getPosition();
      if (position) setGeo(position);

      const timestamp = new Date();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Bake timestamp + location into the image itself.
      const lines = [formatTimestamp(timestamp)];
      lines.push(
        position
          ? `${position.lat.toFixed(5)}, ${position.lon.toFixed(5)} (±${Math.round(position.accuracy)}m)`
          : "Location unavailable"
      );

      const fontSize = Math.max(16, Math.round(canvas.height * 0.035));
      const padding = Math.round(fontSize * 0.6);
      const lineHeight = Math.round(fontSize * 1.4);
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const boxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2;
      const boxHeight = lines.length * lineHeight + padding * 2;

      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      ctx.fillRect(0, canvas.height - boxHeight, boxWidth, boxHeight);
      ctx.fillStyle = "#f8fafc";
      lines.forEach((line, i) => {
        ctx.fillText(line, padding, canvas.height - boxHeight + padding + lineHeight * i + fontSize * 0.8);
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      setLastCaptureAt(timestamp);
      onCapture({ blob, timestamp: timestamp.toISOString(), location: position });
    } finally {
      setCapturing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Camera</h2>
        {active && (
          <button
            onClick={stopCamera}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Stop camera
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`aspect-video w-full object-cover ${active ? "" : "hidden"}`}
        />
        {!active && (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl">📷</span>
            <p className="max-w-xs text-sm text-slate-400">
              Start the camera to capture an attendance photo with a timestamp and location.
            </p>
          </div>
        )}
        {active && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Live
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {cameraError && (
        <p className="mt-3 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{cameraError}</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-300">
        <span>
          {geo.lat != null
            ? `📍 ${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)} (±${Math.round(geo.accuracy ?? 0)}m)`
            : "📍 Location not fetched yet"}
        </span>
        {active && (
          <button
            onClick={() => getPosition().then((pos) => pos && setGeo(pos))}
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="mt-4">
        {!active ? (
          <button
            onClick={startCamera}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Start camera
          </button>
        ) : (
          <button
            onClick={handleCapture}
            disabled={capturing}
            className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-wait disabled:opacity-60"
          >
            {capturing ? "Getting location & capturing…" : "Capture photo"}
          </button>
        )}
        {lastCaptureAt && (
          <p className="mt-2 text-center text-xs text-slate-500">
            Last captured {formatTimestamp(lastCaptureAt)}
          </p>
        )}
      </div>
    </section>
  );
}
