import { spawn } from "child_process";

type EpisodeRequest = {
  topic: string;
  duration: number;
  mood: string;
  signal: AbortSignal;
  progress: (message: string) => void;
};

type AudioSegment = { pcm: Buffer; rate: number; channels: number; sampleWidth: number };

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

async function askGemini(model: string, body: unknown, signal: AbortSignal, timeout = 90000, endpoint: "generateContent" | "interactions" = "generateContent"): Promise<any> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY has not been configured.");
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const url = endpoint === "interactions"
      ? API_ROOT + "/interactions"
      : API_ROOT + "/models/" + encodeURIComponent(model) + ":generateContent";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(endpoint === "interactions" ? { model, ...(body as Record<string, unknown>) } : body),
      signal: controller.signal
    });
    const text = await response.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = {}; }
    if (!response.ok) {
      const explanation = json?.error?.message || text.slice(0, 280);
      throw new Error("Gemini " + model + " HTTP " + response.status + ": " + explanation);
    }
    return json;
  } catch (error: any) {
    if (controller.signal.aborted && !signal.aborted) {
      throw new Error("A Gemini audio or script request exceeded " + Math.round(timeout / 1000) + " seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

async function writeEpisodeScript(topic: string, duration: number, mood: string, signal: AbortSignal): Promise<string> {
  const targetWords = Math.round(duration * 125);
  const brief = [
    "Write a spoken-word script for THE OG BEATZ RADIO SHOW.",
    "OG BEATZ is the one and only host. No co-host, guest, callers or second speaker.",
    "Topic: " + topic.slice(0, 900),
    "Mood: " + mood,
    "Target length: approximately " + targetWords + " spoken words, with an intro, detailed discussion and a closing.",
    "Sound like a knowledgeable, friendly, natural hip-hop producer talking to listeners.",
    "Make the show entertaining and useful, not robotic or forced slang. Do not invent interviews or quotations.",
    "Return ONLY the exact words to be spoken. No speaker labels, headings, numbered sections or stage directions."
  ].join("\n");
  const configured = process.env.GEMINI_TEXT_MODEL?.trim();
  const preferred = configured && /^gemini-3\.(5-flash-lite|6-flash|8-flash)$/.test(configured)
    ? configured : "gemini-3.5-flash-lite";
  let lastError: Error | null = null;
  for (const model of [...new Set([preferred, "gemini-3.8-flash"])]) {
    try {
      const result = await askGemini(model, {
        contents: [{ role: "user", parts: [{ text: brief }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: Math.max(700, Math.round(targetWords * 2.4)) }
      }, signal, 75000);
      const script = (result?.candidates?.[0]?.content?.parts || [])
        .map((part: any) => part.text || "").join("\n")
        .replace(/^\s*(OG BEATZ|HOST)\s*:\s*/gim, "")
        .replace(/\[[^\]]{1,50}\]/g, "")
        .trim();
      if (script.split(/\s+/).length < 65) throw new Error("The script came back too short.");
      return script;
    } catch (error: any) {
      lastError = error;
      if (signal.aborted) throw error;
    }
  }
  throw lastError || new Error("Google could not write the episode script.");
}

function speechChunks(script: string, maximumCharacters = 630): string[] {
  const sentences = script.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    for (const word of words) {
      if (current.length + word.length + 1 > maximumCharacters && current) {
        chunks.push(current.trim());
        current = "";
      }
      current += (current ? " " : "") + word;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function decodeAudio(buffer: Buffer): AudioSegment {
  if (buffer.subarray(0, 4).toString("ascii") !== "RIFF") {
    return { pcm: buffer, rate: 24000, channels: 1, sampleWidth: 2 };
  }
  if (buffer.subarray(8, 12).toString("ascii") !== "WAVE") {
    throw new Error("The TTS response is not a valid WAV file.");
  }
  let offset = 12, sampleRate = 24000, channels = 1, width = 2;
  let audio: Buffer | null = null;
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString("ascii");
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) break;
    if (type === "fmt " && size >= 16) {
      const format = buffer.readUInt16LE(start);
      if (format !== 1) throw new Error("TTS returned unsupported compressed WAV.");
      channels = buffer.readUInt16LE(start + 2);
      sampleRate = buffer.readUInt32LE(start + 4);
      width = buffer.readUInt16LE(start + 14) / 8;
    }
    if (type === "data") audio = buffer.subarray(start, start + size);
    offset = start + size + (size % 2);
  }
  if (!audio?.length) throw new Error("TTS generated an empty WAV file.");
  return { pcm: audio, rate: sampleRate, channels, sampleWidth: width };
}

async function voiceChunk(script: string, signal: AbortSignal): Promise<AudioSegment> {
  let lastError: Error | null = null;
  // The Gemini 3.8 TTS models use the Interactions API and a speech_config voice.
  // Do not fall back to 2.5 TTS: access to legacy 2.5 models is restricted for new users.
  const configured = process.env.GEMINI_TTS_MODEL?.trim();
  const preferred = configured && /^gemini-3\.8-flash(-lite)?-tts$/.test(configured)
    ? configured : "gemini-3.8-flash-lite-tts";
  const models = [...new Set([preferred, "gemini-3.8-flash-tts"])];
  for (const model of models) {
    try {
      const result = await askGemini(model, {
        input: [{
          type: "user_input",
          content: [{
            type: "text",
            text: script,
            annotations: [{
              type: "speech_metadata",
              style: "Warm, charismatic, conversational American hip-hop radio host; natural pacing, confident but never exaggerated."
            }]
          }]
        }],
        response_format: { type: "audio", mime_type: "audio/l16", sample_rate: 24000 },
        generation_config: { speech_config: [{ voice: "Fenrir" }] }
      }, signal, 90000, "interactions");
      const audioBlock = (result?.steps || [])
        .flatMap((step: any) => Array.isArray(step?.content) ? step.content : [])
        .find((part: any) => part?.type === "audio" && typeof part?.data === "string");
      const encoded = audioBlock?.data || result?.output_audio?.data;
      if (!encoded) throw new Error("The speech model returned no audio.");
      const audio = decodeAudio(Buffer.from(encoded, "base64"));
      if (audio.sampleWidth !== 2 || audio.channels !== 1 || audio.rate !== 24000) {
        throw new Error("The voice model returned an unsupported audio format.");
      }
      return audio;
    } catch (error: any) {
      lastError = error;
      if (signal.aborted) throw error;
      console.warn("[direct-radio] TTS attempt failed:", String(error?.message || error).slice(0, 300));
    }
  }
  throw lastError || new Error("Google could not generate the speech.");
}

function waveFromPcm(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(pcm.length + 36, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function encodeMp3(pcm: Buffer): Promise<Buffer | null> {
  return await new Promise(resolve => {
    const encoder = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-f", "s16le",
      "-ar", "24000", "-ac", "1", "-i", "pipe:0",
      "-codec:a", "libmp3lame", "-b:a", "96k", "-f", "mp3", "pipe:1"
    ], { stdio: ["pipe", "pipe", "pipe"] });
    const pieces: Buffer[] = [];
    let done = false;
    const finish = (data: Buffer | null) => { if (!done) { done = true; resolve(data); } };
    encoder.on("error", () => finish(null));
    encoder.stdout.on("data", chunk => pieces.push(Buffer.from(chunk)));
    encoder.on("close", code => finish(code === 0 ? Buffer.concat(pieces) : null));
    encoder.stdin.on("error", () => {});
    encoder.stdin.end(pcm);
  });
}

function stamp(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds));
  return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
}

export async function generateDirectEpisode(options: EpisodeRequest): Promise<any> {
  const minutes = Number(options.duration);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 5) {
    throw new Error("For reliable voice generation, choose a duration between 1 and 5 minutes.");
  }
  if (!options.topic?.trim()) throw new Error("Please enter a show topic.");
  options.progress("Writing the OG BEATZ radio script...");
  const script = await writeEpisodeScript(options.topic, minutes, options.mood, options.signal);
  const chunks = speechChunks(script);
  if (!chunks.length) throw new Error("The show script was empty.");

  const audios: Buffer[] = [];
  const transcript: Array<{ timecode: string; speaker: string; text: string }> = [];
  let seconds = 0;
  for (let i = 0; i < chunks.length; i++) {
    if (options.signal.aborted) throw new Error("Generation was cancelled.");
    options.progress("Recording OG BEATZ voice segment " + (i + 1) + " of " + chunks.length + "...");
    transcript.push({ timecode: stamp(seconds), speaker: "OG BEATZ", text: chunks[i] });
    const clip = await voiceChunk(chunks[i], options.signal);
    audios.push(clip.pcm);
    seconds += clip.pcm.length / 48000;
  }

  options.progress("Assembling the full episode audio...");
  const pcm = Buffer.concat(audios);
  if (pcm.length < 48000 * 10) throw new Error("Audio was incomplete; less than ten seconds of speech was produced.");
  const mp3 = await encodeMp3(pcm);
  const audioUrl = mp3?.length
    ? "data:audio/mpeg;base64," + mp3.toString("base64")
    : "data:audio/wav;base64," + waveFromPcm(pcm).toString("base64");

  return {
    show_title: "THE OG BEATZ RADIO SHOW",
    show_duration: stamp(seconds),
    two_sentence_summary: "OG BEATZ discusses " + options.topic.replace(/\s+/g, " ").slice(0, 160) + ". One host, one conversation about music and creative tools.",
    date_of_generation: new Date().toISOString().slice(0, 10),
    timecoded_transcript: transcript,
    audioUrl,
    isBase64Encoded: true
  };
}
