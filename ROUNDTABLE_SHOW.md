# OG BEATZ Radio Show — Roundtable + Call-ins

This **draft feature** adds an optional roundtable format to the existing radio generator.

## What you hear

- **OG BEATZ** moderates in your approved ElevenLabs clone (`ELEVENLABS_VOICE_ID`).
- **Dre**, a skeptical, practical hip-hop producer, debates **Maya**, a creative producer who is more open to AI tools.
- **Marcus and Nina** are fictional listeners who call in, give opinions, and challenge the panel. Their voices are intentionally band-limited with phone-line audio effects, and a short connect tone plays before each first call.
- Expect **lightweight, entertaining disagreements**. OG BEATZ asks follow-up questions and keeps the discussion respectful. Speakers are instructed *not* to agree on everything.
- Callers are **scripted AI characters**. This feature does **not** connect to a real phone line or collect actual listener calls. The app and transcript disclose this.

## Use locally

In the existing Radio Show Git checkout:

```bash
cd "/Users/admin/Radio Show"
git pull --ff-only origin feature/elevenlabs-radio-test
npm run lint
npm run dev
```

Visit http://localhost:3000 and choose **Roundtable + Call-ins** from the Show Format dropdown. Choose **3 Min**, **Conversational** mood, and enter a topic such as:

> Is AI helping hip-hop creativity, or making producers lazy? Let the panelists challenge each other and take two fictional listener calls.

Press Generate. A new request uses Gemini scriptwriting and then ElevenLabs separately for each panel turn; multiple API calls and credits are required. Output is a single playable show with a speaker-labeled transcript.

## Private local configuration

The previous voice setup must already be present in the untracked `.env.local`. Don't print, share, or commit it. The server loads it on startup.

These must be set (or remain set) privately:
- `GEMINI_API_KEY`: Gemini scriptwriting
- `ELEVENLABS_API_KEY`: ElevenLabs speech
- `ELEVENLABS_VOICE_ID`: OG BEATZ cloned host voice
- `RADIO_TTS_PROVIDER=elevenlabs`: enables ElevenLabs voices

Additional optional voice slots use distinct ElevenLabs stock voices by default and can be changed in `.env.local`:
- `ELEVENLABS_PANEL_VOICE_1`: Dre
- `ELEVENLABS_PANEL_VOICE_2`: Maya
- `ELEVENLABS_CALLER_VOICE_1`: Marcus (phone filtered)
- `ELEVENLABS_CALLER_VOICE_2`: Nina (phone filtered)

Use **Solo Host** from the dropdown for the previous one-voice program.

## Limits

- The feature is in a GitHub draft branch, not live deployed and not yet runtime-tested on the user's Mac.
- It is intended for **3- or 5-minute** tests (generation may take substantially longer with 15–25 separate voice requests).
- Requires access to the specific voice IDs and enough ElevenLabs credits.
- If you get a `429` or quota/billing error, check your provider quota and retry later instead of running many repeated calls.
- Phone conversations here are simulated recordings, not live phone calls. Real phone call-in integration would be a separate feature with telecommunications accounts, consent, and audio capture.
