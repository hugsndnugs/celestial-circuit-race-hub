const FILENAME_SAFE = /[^a-zA-Z0-9._-]+/g;

export function sanitizeDownloadFilename(filename: string): string {
  const trimmed = filename.trim().replaceAll(FILENAME_SAFE, "_").replaceAll(/^_+|_+$/g, "");
  return trimmed.length > 0 ? trimmed.slice(0, 200) : "download";
}

export function downloadTextFile(filename: string, content: string): void {
  const safeName = sanitizeDownloadFilename(filename);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  globalThis.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
