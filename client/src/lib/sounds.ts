/**
 * Sound management for Argus Panoptes
 *
 * Plays gentle audio cues when projects become blocked
 */

let audioContext: AudioContext | null = null;
let chimeBuffer: AudioBuffer | null = null;

/**
 * Initialize audio context (lazy)
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Generate a gentle chime sound (C major chord arpeggio)
 * Using Web Audio API to synthesize audio instead of loading files
 */
async function generateChime(): Promise<AudioBuffer> {
  if (chimeBuffer) return chimeBuffer;

  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const duration = 0.8; // 800ms
  const length = sampleRate * duration;

  chimeBuffer = ctx.createBuffer(1, length, sampleRate);
  const data = chimeBuffer.getChannelData(0);

  // C major chord frequencies: C5, E5, G5, C6
  const frequencies = [523.25, 659.25, 783.99, 1046.50];

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Arpeggio: play each note in sequence with overlap
    frequencies.forEach((freq, idx) => {
      const noteStart = idx * 0.15; // 150ms apart
      const noteEnd = noteStart + 0.5; // 500ms duration each

      if (t >= noteStart && t < noteEnd) {
        const noteTime = t - noteStart;
        // ADSR envelope: quick attack, gentle decay, sustain, release
        const attack = Math.min(noteTime / 0.02, 1); // 20ms attack
        const decay = 1 - Math.max(0, (noteTime - 0.02) / 0.1) * 0.3; // 100ms decay to 0.7
        const release = 1 - Math.max(0, (noteTime - 0.4) / 0.1); // 100ms release
        const envelope = attack * decay * release;

        // Sine wave with gentle harmonics
        sample += Math.sin(2 * Math.PI * freq * noteTime) * envelope * 0.15;
        sample += Math.sin(2 * Math.PI * freq * 2 * noteTime) * envelope * 0.03; // 2nd harmonic
      }
    });

    data[i] = sample;
  }

  return chimeBuffer;
}

/**
 * Play the notification chime
 */
export async function playChime(): Promise<void> {
  try {
    const ctx = getAudioContext();
    const buffer = await generateChime();

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Add gentle gain control
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.4; // Calm volume

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
  } catch (error) {
    console.warn('[Argus] Failed to play chime:', error);
  }
}

/**
 * Preload the chime sound (call on app init if sound is enabled)
 */
export async function preloadChime(): Promise<void> {
  try {
    await generateChime();
  } catch (error) {
    console.warn('[Argus] Failed to preload chime:', error);
  }
}
