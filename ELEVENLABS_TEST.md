# Test ElevenLabs on THE OG BEATZ RADIO SHOW

This test is **optional**. It does not replace Gemini or change the live app until you enable it.

## 1. Authorize ElevenLabs

From a terminal in this Radio-Show project folder:

```bash
npx -y @elevenlabs/cli@latest onboard init
```

Follow the printed instructions. The official CLI opens a browser to authorize your ElevenLabs account and saves `ELEVENLABS_API_KEY` into `.env.local`. **Do not paste your API key into GitHub or ChatGPT.**

If the CLI cannot reach npm, fix your local network/DNS and try again. The credential is not created until onboarding succeeds.

## 2. Make one short voice clip

```bash
npm install
node scripts/elevenlabs-radio-test.mjs
```

The test makes exactly one ElevenLabs text-to-speech API request (which uses account credits) and saves `output/elevenlabs-radio-test.mp3`. Play it to judge the voice quality.

The initial voice is ElevenLabs' example voice **George**, not OG BEATZ's real voice. To change it, set `ELEVENLABS_VOICE_ID` in `.env.local` to an eligible voice ID from your ElevenLabs account.

## 3. Optional: use it in the app

Add these settings to your server's environment (keeping the real key secret):

```
RADIO_TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=the-key-created-by-onboarding
ELEVENLABS_VOICE_ID=your-authorized-voice-id
```

Restart `npm run dev`, then generate a **3-minute** show. Gemini still writes the episode script; only narration switches to ElevenLabs. The app keeps the original Gemini TTS when `RADIO_TTS_PROVIDER` is unset or `gemini`.

Switching back is instant: set `RADIO_TTS_PROVIDER=gemini` and restart. The existing quotas and backend controls are unchanged. This test does not include music or a second host.

**Security:** Never place your API key in `VITE_` variables or client-side code. `.env.local` is ignored by git. For deployment, set it as a private server-side environment variable.

References: https://elevenlabs.io/docs/eleven-api/quickstart and https://elevenlabs.io/docs/api-reference/text-to-speech/convert
