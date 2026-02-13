import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerBlobDownload, __test__ } from '../utils/download';

describe('triggerBlobDownload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates and clicks a temporary anchor, then revokes object URL after delay', () => {
    const blob = new Blob(['mastered audio'], { type: 'audio/wav' });
    const anchor = {
      href: '',
      download: '',
      rel: '',
      click: vi.fn(),
    };
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const fakeDocument = {
      createElement: vi.fn(() => anchor),
      body: {
        appendChild,
        removeChild,
      },
    } as unknown as Document;
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    triggerBlobDownload(blob, 'file.wav', fakeDocument);

    expect(fakeDocument.createElement).toHaveBeenCalledWith('a');
    expect(anchor.href).toContain('blob:test-url');
    expect(anchor.download).toBe('file.wav');
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(createUrlSpy).toHaveBeenCalledWith(blob);
    expect(revokeSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(__test__.OBJECT_URL_REVOKE_DELAY_MS);

    expect(revokeSpy).toHaveBeenCalledWith('blob:test-url');
  });
});
