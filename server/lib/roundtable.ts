/**
 * Roundtable authoring and telephone-line audio treatment.
 * Callers are fictional, AI-generated characters; this does not connect real phones.
 * Audio format is signed 16-bit mono PCM at 24,000 samples/sec.
 */
export type RoundtableSpeaker = "host" | "panel1" | "panel2" | "caller1" | "caller2";
export type RoundtableTurn = { speaker: RoundtableSpeaker; text: string };

const SPEAKERS = new Set<RoundtableSpeaker>(["host", "panel1", "panel2", "caller1", "caller2"]);

export const roundtableNames: Record<RoundtableSpeaker, string> = {
  host: "OG BEATZ",
  panel1: "Dre (Panelist)",
  panel2: "Maya (Panelist)",
  caller1: "Marcus (Caller — simulated)",
  caller2: "Nina (Caller — simulated)"
};

export function roundtableBrief(topic: string, minutes: number, mood: string): string {
  const approxWords = Math.round(minutes * 125);
  const turns = minutes <= 3 ? "14 to 18" : "20 to 25";
  return [
    "Write a lively, complete, realistic fictional panel discussion for THE OG BEATZ RADIO SHOW.",
    "Show format: OG BEATZ moderates. Dre and Maya are TWO DISTINCT expert panelists.",
    "Include two clearly FICTIONAL listener telephone call-ins: Marcus and Nina.",
    "The guests and call-ins are fictional performances created by AI, not real interviews or actual telephone calls.",
    "Topic: " + topic.slice(0, 800),
    "Mood: " + mood,
    "Target total speech: roughly " + approxWords + " words.",
    "Produce " + turns + " short, back-and-forth turns. Conversational pacing is important.",
    "OG BEATZ is a seasoned hip-hop producer: confident, warm, curious moderator.",
    "Do not let OG BEATZ dominate: panelists and callers together should speak AT LEAST half the words.",
    "Make Dre practical, a little skeptical; make Maya creative, curious and solutions-focused.",
    "Give callers their own specific takes, not just agreement. Let the panel respond to them.",
    "Begin with a brief host introduction, move to panel discussion, then a Marcus call, more panel discussion, a Nina call, and a host wrap-up.",
    "The host should verbally introduce each caller: e.g., 'Marcus, you're on the line.' No need to say 'simulated' out loud.",
    "Use normal American conversational English with natural questions, courteous disagreement, little acknowledgments, and no contrived catchphrases.",
    "Do not invent factual real-world testimonials, real callers' identities or imply this is a real phone-in broadcast.",
    "Use only the five speaker codes: host, panel1, panel2, caller1, caller2.",
    "Return ONLY a JSON object of shape {\"segments\":[{\"speaker\":\"host\",\"text\":\"Actual words spoken...\"}]}",
    "No Markdown, sound cues, speaker-name prefixes, descriptions, or directions in the text values."
  ].join("\n");
}

export function parseRoundtable(responseText: string): RoundtableTurn[] {
  const clean = responseText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try { parsed = JSON.parse(clean); } catch { throw new Error("The roundtable script was not valid JSON. Please retry the episode."); }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as any).segments)) {
    throw new Error("Gemini returned a script without speaker segments.");
  }
  const raw = (parsed as any).segments;
  if (raw.length < 10 || raw.length > 30) throw new Error("Roundtable needs between 10 and 30 speaking turns.");
  const turns: RoundtableTurn[] = raw.map((turn: any, i: number) => {
    if (!turn || !SPEAKERS.has(turn.speaker) || typeof turn.text !== "string") {
      throw new Error("Invalid roundtable speaker or dialogue at turn " + (i + 1));
    }
    const text = turn.text.replace(/\s+/g, " ").trim();
    if (text.length < 4 || text.length > 650) throw new Error("Invalid roundtable turn length at turn " + (i + 1));
    return { speaker: turn.speaker, text };
  });
  const tally = new Set(turns.map(turn => turn.speaker));
  for (const role of SPEAKERS) {
    if (!tally.has(role)) throw new Error("Roundtable script is missing " + role + ". Please retry.");
  }
  if (turns[0].speaker !== "host" || turns[turns.length - 1].speaker !== "host") {
    throw new Error("The roundtable must open and close with OG BEATZ.");
  }
  const hostWords = turns.filter(t => t.speaker === "host").reduce((sum, t) => sum + t.text.split(/\s+/).length, 0);
  const allWords = turns.reduce((sum, t) => sum + t.text.split(/\s+/).length, 0);
  if (allWords < 130 || hostWords > allWords * 0.5) {
    throw new Error("The roundtable needs more back-and-forth dialogue. Please retry.");
  }
  return turns;
}

export function isCaller(speaker: RoundtableSpeaker): boolean {
  return speaker === "caller1" || speaker === "caller2";
}

/** Mono telephone band-pass: ~300–3100 Hz, quieter signal, lightly saturated. */
export function telephonePcm(pcm: Buffer): Buffer {
  if (pcm.length % 2 !== 0) throw new Error("Telephone audio must be 16-bit PCM.");
  const out = Buffer.allocUnsafe(pcm.length);
  const sr = 24000;
  const hpA = 1 / (1 + 2 * Math.PI * 300 / sr);
  const lpA = 1 - Math.exp(-2 * Math.PI * 3100 / sr);
  let previousInput = 0;
  let hp = 0;
  let lp = 0;
  for (let i = 0; i < pcm.length; i += 2) {
    const input = pcm.readInt16LE(i) / 32768;
    hp = hpA * (hp + input - previousInput);
    previousInput = input;
    lp += lpA * (hp - lp);
    const y = Math.tanh(lp * 1.8) * 0.63;
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, y)) * 32767), i);
  }
  return out;
}

export function silenceMs(ms: number): Buffer {
  return Buffer.alloc(Math.max(0, Math.round(ms * 24 * 2)));
}

/** Audible short connect beep: fictional caller joining the line. */
export function callerBeep(): Buffer {
  const sampleRate = 24000;
  const samples = Math.round(sampleRate * 0.18);
  const out = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const fade = Math.min(1, i / 240, (samples - i) / 240);
    const value = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 620 * t)) * 0.07 * Math.max(0, fade);
    out.writeInt16LE(Math.round(value * 32767), i * 2);
  }
  return out;
}
