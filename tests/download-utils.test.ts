import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerBlobDownload } from '../utils/download';

describe('triggerBlobDownload', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let appendedElements: Element[] = [];
  let removedElements: Element[] = [];
  let clickedElements: Element[] = [];
  let fakeDoc: Document;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
      return originalCreateObjectURL.call(URL, blob);
    });
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
      originalRevokeObjectURL.call(URL, url);
    });

    appendedElements = [];
    removedElements = [];
    clickedElements = [];

    const body = {
      appendChild: (el: Element) => {
        appendedElements.push(el);
      },
      removeChild: (el: Element) => {
        removedElements.push(el);
      },
    };

    fakeDoc = {
      createElement: (tagName: string) => {
        const el = {
          tagName: tagName.toUpperCase(),
          href: '',
          download: '',
          rel: '',
          click: () => clickedElements.push(el as unknown as Element),
        } as unknown as HTMLAnchorElement;
        return el;
      },
      body,
    } as unknown as Document;
  });

  afterEach(() => {
    vi.useRealTimers();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('creates anchor, triggers click, removes element, and delays revokeObjectURL', () => {
    const blob = new Blob(['test'], { type: 'audio/wav' });
    const fileName = 'mastered.wav';

    triggerBlobDownload(blob, fileName, fakeDoc);

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(appendedElements).toHaveLength(1);
    expect(appendedElements[0]).toMatchObject({ tagName: 'A', download: fileName, rel: 'noopener noreferrer' });
    expect(clickedElements).toHaveLength(1);
    expect(removedElements).toHaveLength(1);
    expect(removedElements[0]).toBe(appendedElements[0]);

    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it('sets anchor href to blob URL and download attribute', () => {
    const blob = new Blob(['x'], { type: 'application/octet-stream' });
    let capturedEl: HTMLAnchorElement | null = null;
    (fakeDoc as { createElement: (tag: string) => HTMLAnchorElement }).createElement = (tagName: string) => {
      const el = {
        tagName: tagName.toUpperCase(),
        href: '',
        download: '',
        rel: '',
        click: () => clickedElements.push(el as unknown as Element),
      } as unknown as HTMLAnchorElement;
      capturedEl = el;
      return el;
    };

    triggerBlobDownload(blob, 'out.bin', fakeDoc);

    expect(capturedEl?.href).toMatch(/^blob:/);
    expect(capturedEl?.download).toBe('out.bin');
  });
});
