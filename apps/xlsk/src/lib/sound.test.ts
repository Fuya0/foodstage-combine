import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('audio public asset requests', () => {
  it('rebases bite recordings and milestone cues while deduplicating canonical cache keys', async () => {
    vi.stubEnv('BASE_URL', './');
    const audio = { state: 'running', decodeAudioData: async () => ({ duration: 0.5 }) };
    vi.stubGlobal('AudioContext', class { constructor() { return audio; } });
    const fetchAudio = vi.fn(async (_url: string) => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
    vi.stubGlobal('fetch', fetchAudio);
    const { primeBiteAudio, primeTastingCues } = await import('./sound');
    primeBiteAudio('satay');
    primeTastingCues();
    const requested = fetchAudio.mock.calls.map(call => call[0]);
    expect(requested.length).toBeGreaterThan(2);
    expect(requested.every(url => typeof url === 'string' && url.startsWith('./audio/'))).toBe(true);
    expect(requested).toContain('./audio/ui/stage-transition.wav');
    expect(requested).toContain('./audio/ui/complete.ogg');
    primeBiteAudio('satay');
    primeTastingCues();
    expect(fetchAudio).toHaveBeenCalledTimes(requested.length);
  });
});
