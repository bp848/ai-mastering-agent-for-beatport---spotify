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
  if (!blob || blob.size === 0) return;
  const safeName = (fileName || 'download.wav').replace(/[<>:"/\\|?*]/g, '_').trim() || 'download.wav';
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = safeName;
  a.rel = 'noopener noreferrer';
  a.style.cssText = 'position:fixed;left:-9999px;top:0;';
  doc.body.appendChild(a);
  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  try {
    if (isIOS) {
      window.open(url, '_blank');
    } else {
      a.click();
    }
  } catch {
    try {
      const ev = doc.createEvent('MouseEvents');
      ev.initEvent('click', true, true);
      a.dispatchEvent(ev);
    } catch {
      window.open(url, '_blank');
    }
  }
  globalThis.setTimeout(() => {
    try {
      if (a.parentNode) doc.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }, 10000);
}
