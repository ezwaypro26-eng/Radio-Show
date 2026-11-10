# ElevenLabs Voice Test — THE OG BEATZ RADIO SHOW

This draft integration uses the **official ElevenLabs JavaScript SDK** for a standalone MP3 voice test and an optional narrator in the direct episode pipeline. Gemini remains the original scriptwriter and the default speech provider. This is **not deployed**.

## 1. Onboard once (already completed on the user's Mac)

Within the Radio Show project directory:

```bash
npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local
```

An approved key must already exist in `.env.local`. Keep it there. Do **not** open, print, cat, copy to GitHub, or share that file. The server loads it using `dotenv` into `process.env`; only the server creates `ElevenLabsClient`.

## 2. Bring this feature branch into your Mac project safely

If using a git checkout, ensure `git status --short` is empty first, so that you do not overwrite uncommitted changes. Then run:

```bash
git fetch origin feature/elevenlabs-radio-test
git switch --track origin/feature/elevenlabs-radio-test
npm install @elevenlabs/elevenlabs-js
```

If a tracking branch already exists, use `git switch feature/elevenlabs-radio-test` instead. **Never delete or overwrite `.env.local`.** The npm install updates `package-lock.json` for the SDK.

## 3. Verify and make one voice clip

```bash
npx -y @elevenlabs/cli@latest onboard check --answered --env-path .env.local
npm run test:elevenlabs
```

This produces `output/elevenlabs-radio-test.mp3` and uses credits for **one** text-to-speech call. It uses ElevenLabs' sample voice George, not a clone of OG BEATZ.

## 4. Optional: use ElevenLabs for complete direct episodes

In your private local `.env.local` (use an editor, not a chat message), set:

```
RADIO_TTS_PROVIDER=elevenlabs
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
```

Then restart the server and generate a short test episode in the app. Gemini writes the script, ElevenLabs voices it. `RADIO_TTS_PROVIDER=gemini` switches the voice pipeline back without code changes. The default is still Gemini unless explicitly changed.

Voice chunks use `pcm_24000`, 24 kHz mono 16-bit, matching the existing direct-episode mixer. Generation uses ElevenLabs credits for each narration chunk. No music or two-host feature is included in this first test.

## Limits and readiness

- Draft only, not merged or deployed
- Not yet installed or runtime-tested on the user's Mac by the assistant
- Requires the approved `.env.local` key on the computer that runs the server
- The existing `package-lock.json` must be refreshed by running `npm install @elevenlabs/elevenlabs-js` in the local project before a production deployment or `npm ci`
- Do not expose `ELEVENLABS_API_KEY` via a `VITE_` variable or browser code

Official docs: https://elevenlabs.io/docs/eleven-api/quickstart
