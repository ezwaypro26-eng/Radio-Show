/**
 * Optional server-only ElevenLabs narration for THE OG BEATZ RADIO SHOW.
 * Audio is 24 kHz / 16-bit / mono PCM, matching the existing episode mixer.
 * The SDK reads ELEVENLABS_API_KEY from process.env after server startup.
 */
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function elevenLabsPcmChunk(text: string, signal: AbortSignal): Promise<Buffer> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs is selected but the server is missing ELEVENLABS_API_KEY. Complete CLI onboarding in this project.");
  }
  if (signal.aborted) throw new Error("Episode generation was cancelled.");

  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || "JBFqnCBsd6RMkjVDRZzb"; // George, sample voice
  const modelId = process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_multilingual_v2";

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), 90_000);

  try {
    const client = new ElevenLabsClient();
    const stream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId,
      outputFormat: "pcm_24000"
    }, { abortSignal: controller.signal, timeoutInSeconds: 90, maxRetries: 0 });

    const reader = stream.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value?.length) continue;
        totalBytes += value.byteLength;
        // Guard against unexpected oversized responses; a single narration chunk is short.
        if (totalBytes > 20 * 1024 * 1024) {
          throw new Error("ElevenLabs returned unusually large audio.");
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    const pcm = Buffer.concat(chunks);
    if (pcm.length < 1024 || pcm.length % 2 !== 0) {
      throw new Error("ElevenLabs returned incomplete or invalid PCM speech.");
    }
    return pcm;
  } catch (error: any) {
    if (signal.aborted) throw new Error("Episode generation was cancelled.");
    if (controller.signal.aborted) throw new Error("ElevenLabs speech request exceeded 90 seconds.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}
