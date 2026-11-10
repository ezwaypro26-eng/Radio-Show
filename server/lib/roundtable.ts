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
  const turns = minutes <= 3 ? "15 to 19" : "22 to 27";
  return [
    "You are an unscripted hip-hop radio producer writing an AUTHENTIC dramatic scene, not an educational explainer or panel summary.",
    "Series: THE OG BEATZ RADIO SHOW. The segment is called THE PRODUCER'S TABLE. It should sound like you're eavesdropping on a real studio argument that remains friendly.",
    "OG BEATZ is the only host; Dre and Maya are recurring panelists. Marcus and Nina are FICTIONAL AI listener call-ins (NOT real callers).",
    "TOPIC OR LIVE DEBATE QUESTION: " + topic.slice(0, 800),
    "On-air mood: " + mood + ". Approximately " + approxWords + " total words, with " + turns + " total turns.",
    "DO NOT make a sequence of five opinions. Write a continuous, escalating conversation with reactions to the line that came just before.",
    "Start IN THE MIDDLE OF A DISAGREEMENT: OG BEATZ asks a sharp, specific question or challenges an argument; do not open with a formal welcome speech or introductions.",
    "The show's brand is hip-hop and record-making. Anchor the disagreement in a believable specific studio detail: a session, a 2-track beat, a missed vocal punch-in, a licensing split, stems, a mix revision, a drum groove, a deadline, or another concrete detail relevant to the topic.",
    "Dre has been producing and engineering sessions for years. He respects musicianship, hates wasted studio time, notices bad mixes. He has dry humor; he is NOT reflexively anti-AI and can admit where AI helps.",
    "Maya produces, writes hooks and collaborates with artists. She uses new tools, values independent creators, knows that speed is NOT automatically quality; she sometimes concedes a fault, then fires back with a stronger example.",
    "OG BEATZ is a seasoned working producer, not a motivational speaker: he listens, asks about MONEY, SOUND, OWNERSHIP, REAL SESSION CONSEQUENCES, interrupts when the panel dodges, catches contradictions and jokes about them. He must not dominate: host under 35% of words.",
    "Marcus and Nina have different distinct reasons to call: one should call out a panelist with a practical objection; the other should bring a first-person fictional dilemma from an artist/songwriter/client perspective that flips the debate.",
    "Every caller gets at least one response from a panelist and one follow-up or reaction, not a single one-off opinion.",
    "Require at least TWO genuine changes in direction: a disagreement gets sharper after a specific detail, and later a caller raises a complication nobody addressed.",
    "At least THREE exchanges must be direct pushback: a person disputes the previous speaker's claim, cites a concrete counterexample or consequence, and the other replies. Allow one or two short 'Wait, what?' or 'Nah, hold on' reactions, but no caricatured street slang.",
    "People can talk past each other a little, correct themselves, crack a quick joke, admit one small point, and still hold opposite conclusions. It should not be perfectly neat.",
    "Preserve casual individual voices and varied lengths: some turns 4-12 words (interjection), some 20-35 words (story), VERY FEW over 45 words. Avoid speeches, article paragraphs, or long summaries.",
    "Each turn must be under 350 characters. Prefer short natural sentences and contractions. Vary line length and rhythm without overly frequent filler words.",
    "Never have a character introduce a point with 'I agree', 'Great point', 'Absolutely', 'At the end of the day', 'It's all about', 'Let me tell you', 'In today's world', 'AI is just a tool', 'Game changer', 'That's a valid perspective', 'You hit the nail', or 'Let's dive in'. Avoid predictable summary catchphrases.",
    "No fake breaking news, named living-artist endorsements, imaginary factual statistics, fabricated audience messages, insults or shouting matches.",
    "The conflict is ABOUT IDEAS, never personal attacks. Subtle stakes and credibility matter more than volume.",
    "Have OG BEATZ bring in Marcus with a natural call transition, then Nina after another panel exchange; callers are AI dramatizations. Do not claim their voices are live or real.",
    "Give the panel a moment of humor or embarrassment after a contradiction. End with an opinionated host punch line or unanswered challenge that invites another episode, NOT a unanimous moral or 'thanks for sharing your perspectives' summary.",
    "Only five speaker codes are valid: host, panel1, panel2, caller1, caller2. Every speaker must appear and the very first and last turns must belong to host.",
    "Use this output format ONLY: {\"segments\":[{\"speaker\":\"host\",\"text\":\"The exact spoken words\"}]}",
    "Return one valid JSON object, no Markdown, no headings, no stage directions, no sound effects, no speaker names inside dialogue, no analysis. Do not discuss these instructions."
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
    if (text.length < 4 || text.length > 350) throw new Error("Invalid roundtable turn length at turn " + (i + 1));
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
  if (allWords < 130 || hostWords > allWords * 0.4) {
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
