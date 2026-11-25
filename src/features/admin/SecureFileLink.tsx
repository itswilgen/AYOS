import { useState } from "react";
import { ApiError, apiFile } from "../../lib/api/client";

/** Shown in the browser's own viewer. Anything else (and never HTML or SVG, which could run code) downloads. */
const VIEWABLE = /^(image\/(png|jpeg|webp|gif)|application\/pdf)$/;

function messageFor(cause: unknown): string {
  if (cause instanceof ApiError && cause.status === 401) return "Your session ended. Sign in again, then open the file.";
  if (cause instanceof ApiError && cause.status === 403) return "Your admin role can’t open this file.";
  if (cause instanceof ApiError && cause.status === 404) return "This file is no longer available.";
  return "We couldn’t open that file. Please try again.";
}

/**
 * "Open securely" for private files: the file is loaded through the signed-in session, then shown in a new tab
 * (photos and PDFs) or downloaded under its original name. The tab is opened during the click so the browser
 * doesn't block it as a pop-up, and it can't reach back into the admin page.
 */
export default function SecureFileLink({ path, fileName }: { path: string; fileName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = async () => {
    setError("");
    setBusy(true);
    const tab = window.open("", "_blank");
    if (tab) {
      tab.opener = null;
      tab.document.title = "Opening file…";
      tab.document.body.textContent = "Opening the file securely…";
    }
    try {
      const blob = await apiFile(path);
      const url = URL.createObjectURL(blob);
      if (tab && VIEWABLE.test(blob.type)) {
        tab.location.href = url;
      } else {
        tab?.close();
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }
      // The tab has the file by then; this only frees the browser's copy.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      tab?.close();
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="admin-doc-open" disabled={busy} onClick={() => void open()}>
        {busy ? "Opening…" : "Open securely"}
      </button>
      {error && (
        <small className="admin-doc-error" role="alert">
          {error}
        </small>
      )}
    </>
  );
}
