import { biteRecipe, biteUrls } from './biteRecipe';
import { assetUrl } from './assetUrl';

let context: AudioContext | null = null;

export function playTick(enabled: boolean, complete = false) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(complete ? 440 : 310, now);
    oscillator.frequency.exponentialRampToValueAtTime(complete ? 660 : 390, now + 0.09);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch {
    // Sound is optional; ordering never depends on it.
  }
}


type BiteVoice = { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode; released?: boolean };
type CueVoice = { source: AudioScheduledSourceNode; gain: GainNode; released?: boolean };
const decodedBites = new Map<string, Promise<AudioBuffer | null>>();
const fadingBites = new Set<BiteVoice>();
const cueVoices = new Set<CueVoice>();
const pendingAudio = new Set<() => void>();
let biteVoice: BiteVoice | null = null;
let biteGeneration = 0;
// Stage cues survive the next mouthful, but every tasting sound shares this stop boundary.
let audioEpoch = 0;

const tastingCueUrls = {
  stage: '/audio/ui/stage-transition.wav',
  complete: '/audio/ui/complete.ogg',
} as const;

const biteProfiles: Record<string, { level: number; lowpass: number; rate: number }> = {
  satay: { level: 0.42, lowpass: 6500, rate: 1 },
  "pad-thai": { level: 0.39, lowpass: 6200, rate: 1 },
  "mango-rice": { level: 0.47, lowpass: 12000, rate: 1 },
  "tom-yum": { level: 0.32, lowpass: 6500, rate: 1 },
};

function biteContext() {
  context ??= new AudioContext({ latencyHint: "interactive" });
  return context;
}

function decodeBite(audio: AudioContext, url: string): Promise<AudioBuffer | null> {
  let pending = decodedBites.get(url);
  if (!pending) {
    pending = fetch(assetUrl(url)).then(response => response.ok ? response.arrayBuffer() : Promise.reject())
      .then(bytes => audio.decodeAudioData(bytes)).catch(() => null);
    decodedBites.set(url, pending);
    void pending.then(buffer => { if (!buffer) decodedBites.delete(url); });
  }
  return pending;
}

// A stopped or late request may finish warming the cache, but cannot catch up audibly.
function withinAudioDeadline<T>(pending: Promise<T>): Promise<T | null> {
  return new Promise(resolve => {
    let settled = false;
    let deadline: ReturnType<typeof setTimeout>;
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true; clearTimeout(deadline); pendingAudio.delete(cancel); resolve(value);
    };
    const cancel = () => finish(null);
    pendingAudio.add(cancel);
    deadline = setTimeout(cancel, 80);
    void pending.then(finish, cancel);
  });
}

export function primeBiteAudio(dishId: string) {
  try {
    const audio = biteContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
    for (const url of biteUrls(dishId)) void decodeBite(audio, url);
  } catch { /* Optional sound must not block the menu. */ }
}

export function primeTastingCues() {
  try {
    const audio = biteContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
    for (const url of Object.values(tastingCueUrls)) void decodeBite(audio, url);
  } catch { /* Optional cues must not block tasting. */ }
}

function releaseVoice(voice: BiteVoice) {
  if (voice.released) return false;
  voice.released = true;
  if (biteVoice === voice) biteVoice = null;
  fadingBites.delete(voice);
  voice.source.disconnect(); voice.gain.disconnect(); voice.filter.disconnect();
  return true;
}

function releaseCue(voice: CueVoice) {
  if (voice.released) return;
  voice.released = true; cueVoices.delete(voice);
  voice.source.disconnect(); voice.gain.disconnect();
}

function cueIsCurrent(epoch: number, generation?: number) {
  return epoch === audioEpoch && (generation === undefined || generation === biteGeneration) && !document.hidden;
}

function startCue(audio: AudioContext, buffer: AudioBuffer, kind: keyof typeof tastingCueUrls, stage: number) {
  const source = audio.createBufferSource(), gain = audio.createGain();
  const voice: CueVoice = { source, gain };
  try {
    source.buffer = buffer;
    source.playbackRate.value = kind === 'complete' ? 1 : 1 + (stage - 1) * 0.03;
    gain.gain.value = kind === 'complete' ? 0.38 : 0.25;
    source.connect(gain).connect(audio.destination);
    source.addEventListener('ended', () => releaseCue(voice), { once: true });
    cueVoices.add(voice); source.start(audio.currentTime);
    return true;
  } catch {
    try { source.stop(); } catch { /* The source may never have started. */ }
    releaseCue(voice); return false;
  }
}

async function playCue(kind: keyof typeof tastingCueUrls, stage: number, epoch: number, generation?: number) {
  try {
    if (!cueIsCurrent(epoch, generation)) return false;
    const audio = biteContext(), started = performance.now();
    const resume = audio.state === 'suspended' ? audio.resume() : Promise.resolve();
    const buffer = await withinAudioDeadline(Promise.all([resume, decodeBite(audio, tastingCueUrls[kind])]).then(([, value]) => value));
    if (!buffer || !cueIsCurrent(epoch, generation) || audio.state !== 'running' || performance.now() - started > 80) return false;
    return startCue(audio, buffer, kind, stage);
  } catch { return false; }
}

// Used only when the final chewing and completion recording are both unavailable.
function playShortCompletion(audio: AudioContext) {
  let voice: CueVoice | undefined;
  try {
    const source = audio.createOscillator(), gain = audio.createGain();
    voice = { source, gain }; const current = voice;
    const now = audio.currentTime;
    source.type = 'sine';
    source.frequency.setValueAtTime(440, now);
    source.frequency.exponentialRampToValueAtTime(660, now + 0.12);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    source.connect(gain).connect(audio.destination);
    source.addEventListener('ended', () => releaseCue(current), { once: true });
    cueVoices.add(voice); source.start(now); source.stop(now + 0.23);
  } catch {
    if (voice) { try { voice.source.stop(); } catch { /* Never started. */ } releaseCue(voice); }
  }
}

async function playCompletionCue(generation: number, epoch: number, allowShortCue: boolean) {
  const played = await playCue('complete', 0, epoch, generation);
  if (!played && allowShortCue && cueIsCurrent(epoch, generation) && context?.state === 'running') playShortCompletion(context);
}

/** Stages 1, 2 and 3 correspond to mouthfuls 3, 6 and 9; the last bite owns completion. */
export function playStageCue(enabled: boolean, stage: number) {
  if (!enabled || !Number.isInteger(stage) || stage < 1 || stage > 3) return;
  void playCue('stage', stage, audioEpoch);
}

export function stopBiteAudio() {
  biteGeneration++; audioEpoch++;
  for (const cancel of [...pendingAudio]) cancel();
  const voices = [...fadingBites, ...(biteVoice ? [biteVoice] : [])];
  for (const voice of voices) {
    try { voice.source.stop(); } catch { /* The voice may already have finished. */ }
    releaseVoice(voice);
  }
  for (const voice of [...cueVoices]) {
    try { voice.source.stop(); } catch { /* The cue may already have finished. */ }
    releaseCue(voice);
  }
}

export function playBiteAudio(enabled: boolean, dishId: string, bites: number) {
  if (!enabled) return;
  const recipe = biteRecipe(dishId, bites);
  if (!recipe) return;
  const generation = ++biteGeneration, epoch = audioEpoch, finishing = bites === 12;
  void (async () => {
    let created: BiteVoice | undefined, biteStarted = false;
    try {
      const audio = biteContext(), started = performance.now();
      // Start device resume inside the actual click/key gesture, not after fetch.
      const resume = audio.state === "suspended" ? audio.resume() : Promise.resolve();
      if (finishing) void decodeBite(audio, tastingCueUrls.complete);
      const buffer = await withinAudioDeadline(Promise.all([resume, decodeBite(audio, recipe.url)]).then(([, value]) => value));
      if (!buffer || !cueIsCurrent(epoch, generation) || audio.state !== "running" || performance.now() - started > 80) return;
      for (const fading of [...fadingBites]) { try { fading.source.stop(); } catch { /* Already stopped. */ } releaseVoice(fading); }
      if (biteVoice) {
        const previous = biteVoice, now = audio.currentTime;
        previous.gain.gain.cancelScheduledValues(now);
        previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
        previous.gain.gain.linearRampToValueAtTime(0, now + 0.045);
        previous.source.stop(now + 0.045); fadingBites.add(previous); biteVoice = null;
      }
      const profile = biteProfiles[dishId];
      const source = audio.createBufferSource(), gain = audio.createGain(), filter = audio.createBiquadFilter();
      created = { source, gain, filter }; const voice = created;
      source.buffer = buffer; source.playbackRate.value = profile.rate;
      // Texture and portion differences are already in the edited recordings.
      filter.type = "lowpass"; filter.frequency.value = profile.lowpass;
      const now = audio.currentTime, end = now + buffer.duration / source.playbackRate.value;
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(profile.level, now + 0.012);
      gain.gain.setValueAtTime(profile.level, Math.max(now + 0.012, end - 0.06)); gain.gain.linearRampToValueAtTime(0, end);
      source.connect(filter).connect(gain).connect(audio.destination);
      source.addEventListener("ended", () => {
        if (releaseVoice(voice) && finishing && cueIsCurrent(epoch, generation)) void playCompletionCue(generation, epoch, false);
      }, { once: true });
      biteVoice = voice; source.start(now); source.stop(end); biteStarted = true;
    } catch { if (created) { try { created.source.stop(); } catch { /* Never started. */ } releaseVoice(created); } }
    finally {
      if (finishing && !biteStarted && cueIsCurrent(epoch, generation)) void playCompletionCue(generation, epoch, true);
    }
  })();
}
