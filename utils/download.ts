const OBJECT_URL_REVOKE_DELAY_MS = 1000;

export function triggerBlobDownload(blob: Blob, fileName: string, doc: Document = document): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';

  doc.body.appendChild(anchor);
  anchor.click();
  doc.body.removeChild(anchor);

  globalThis.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, OBJECT_URL_REVOKE_DELAY_MS);
}

export const __test__ = {
  OBJECT_URL_REVOKE_DELAY_MS,
};
