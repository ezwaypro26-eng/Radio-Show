/**
 * Small standalone OG BEATZ voice test. No Gemini requests and no browser API key.
 * After ElevenLabs CLI onboarding, run: node scripts/elevenlabs-radio-test.mjs
 * Makes ONE paid/quota-metered ElevenLabs TTS request; writes one MP3.
 */
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY. Run: npx -y @elevenlabs/cli@latest onboard init");
  process.exitCode = 1;
} else {
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || "JBFqnCBsd6RMkjVDRZzb";
  const modelId = process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_multilingual_v2";
  const script = [
    "What's good, everybody? OG BEATZ in the building, and welcome to the OG BEATZ Radio Show!",
    "Today we're talking hip-hop and artificial intelligence. Not about replacing creativity, but giving producers another tool to experiment with.",
    "The beat still needs the right pocket. The lyrics still need a story. And nothing replaces your own taste.",
    "We're testing a new voice engine right now, so listen closely to the rhythm, the delivery, and the personality.",
    "This is OG BEATZ Radio. Let's get into it!"
  ].join(" ");

  console.log("Requesting one OG BEATZ test clip from ElevenLabs...");
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voiceId) + "?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({ text: script, model_id: modelId }),
        signal: AbortSignal.timeout(90000)
      }
    );
    if (!response.ok) {
      throw new Error("ElevenLabs HTTP " + response.status + ": " + (await response.text()).slice(0, 300));
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length < 1024) throw new Error("No usable MP3 returned.");
    const destination = path.join("output", "elevenlabs-radio-test.mp3");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, audio);
    console.log("Saved: " + destination);
    console.log("Play this file on your Mac to evaluate the host voice. The existing Gemini generation is unchanged.");
  } catch (error) {
    console.error("Voice test failed: " + (error?.message || error));
    process.exitCode = 1;
  }
}
