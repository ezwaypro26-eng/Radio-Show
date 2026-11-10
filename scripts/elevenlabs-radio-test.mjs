/**
 * One-request OG BEATZ ElevenLabs voice demo.
 * Run after CLI authorization: npm run test:elevenlabs
 * Writes output/elevenlabs-radio-test.mp3; uses ElevenLabs account credits.
 */
import { config } from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// The key is intentionally never printed, imported into client code, or committed.
config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

if (!process.env.ELEVENLABS_API_KEY) {
  console.error("No ElevenLabs key found. Run: npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local");
  process.exitCode = 1;
} else {
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || "JBFqnCBsd6RMkjVDRZzb";
  const modelId = process.env.ELEVENLABS_TTS_MODEL?.trim() || "eleven_multilingual_v2";
  const text = [
    "What's good, everybody? OG BEATZ in the building, and welcome to the OG BEATZ Radio Show!",
    "Today we're talking hip-hop and artificial intelligence. Not about replacing creativity, but giving producers another tool to experiment with.",
    "The beat still needs the right pocket. The lyrics still need a story. And nothing replaces your own taste.",
    "We're testing a new voice engine right now, so listen closely to the rhythm, the delivery, and the personality.",
    "This is OG BEATZ Radio. Let's get into it!"
  ].join(" ");

  console.log("Creating one OG BEATZ voice test using the ElevenLabs SDK...");
  try {
    const client = new ElevenLabsClient();
    const stream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId,
      outputFormat: "mp3_44100_128"
    }, { timeoutInSeconds: 90, maxRetries: 0 });
    const reader = stream.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value?.length) continue;
        bytes += value.byteLength;
        if (bytes > 20 * 1024 * 1024) throw new Error("Voice response exceeded the expected size.");
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    const audio = Buffer.concat(chunks);
    if (audio.length < 1024) throw new Error("ElevenLabs did not return a usable MP3.");
    const outputPath = path.join("output", "elevenlabs-radio-test.mp3");
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, audio);
    console.log("Finished! Listen to: " + outputPath);
  } catch (error) {
    console.error("Voice test failed: " + (error?.message || error));
    process.exitCode = 1;
  }
}
