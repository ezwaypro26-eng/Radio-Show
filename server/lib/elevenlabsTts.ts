/**
 * Optional ElevenLabs speech for the OG BEATZ direct-episode pipeline.
 * The API key is read server-side only; do not expose it to the browser.
 * PCM 24 kHz / 16-bit / mono matches the existing episode mixer.
 */
export async function elevenLabsPcmChunk(text: string, signal: AbortSignal): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ElevenLabs voice is selected but ELEVENLABS_API_KEY is not configured on the server. Run the ElevenLabs onboarding command in the project folder.");
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || "JBFqnCBsd6RMkjVDRZzb"; // George sample voice
  const modelId = process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_multilingual_v2";
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voiceId) + "?output_format=pcm_24000",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/pcm"
        },
        body: JSON.stringify({ text, model_id: modelId }),
        signal: controller.signal
      }
    );
    if (!response.ok) {
      const explanation = (await response.text()).slice(0, 350);
      throw new Error("ElevenLabs speech HTTP " + response.status + ": " + explanation);
    }
    const pcm = Buffer.from(await response.arrayBuffer());
    if (pcm.length < 1024 || pcm.length % 2 !== 0) {
      throw new Error("ElevenLabs returned incomplete or invalid PCM speech audio.");
    }
    return pcm;
  } catch (error: any) {
    if (controller.signal.aborted && !signal.aborted) {
      throw new Error("ElevenLabs speech request timed out after 90 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}
