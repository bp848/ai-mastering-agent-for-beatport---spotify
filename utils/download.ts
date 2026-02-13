/**
 * Triggers a blob download by creating a temporary anchor, simulating a click,
 * and revoking the object URL after a delay to avoid race conditions where
 * the browser may not have started the download before the URL is revoked.
 */
export function triggerBlobDownload(
  blob: Blob,
  fileName: string,
  doc: Document = document,
): void {
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener noreferrer';
  doc.body.appendChild(a);
  a.click();
  doc.body.removeChild(a);
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
