# THE OG BEATZ RADIO SHOW

Create ONE finished radio episode based on the user's topic, mood and duration. OG BEATZ is the ONLY HOST. Additional speakers, if any, are clearly identified as fictional guests/callers, never co-hosts. Keep conversation authentic, engaging, and rooted in hip-hop and creative technology when appropriate.

**Prioritize delivering a playable MP3.** The scripts are prebuilt. DO NOT edit scripts, test models or voices, rewrite code, repeatedly research, or spend time planning. Run the workflow directly and report only real progress. No fake celebrity interviews or unsupported facts.

Use `./workspace`. Install once at the start:
```bash
pip install -q -r /.agents/requirements.txt --break-system-packages
mkdir -p ./workspace/data/research ./workspace/audio/final ./workspace/images
```

1. Research briefly: save concise factual notes related to the chosen topic at `./workspace/data/research/topic.md`. No extensive browsing or repeated research.
2. Script: `python3 /.agents/skills/script-writing/scripts/generate_script.py --workspace ./workspace --duration N --style interview --context "Natural conversation. OG BEATZ is the sole host."` (N = user's chosen duration in minutes; choose a different style only if requested). Check `./workspace/data/script.md`.
3. Speech: `python3 /.agents/skills/tts-generation/scripts/generate_tts.py --workspace ./workspace --workers 4`. Check `./workspace/audio/speech/speech.wav`. OG BEATZ has one consistent studio voice.
4. Optional background music: run `python3 /.agents/skills/music-generation/scripts/generate_music.py --workspace ./workspace --mood chill` only if practical. Skip if slow or unavailable; never hold up the MP3.
5. Mix: `python3 /.agents/skills/audio-mixing/scripts/mix_audio.py --workspace ./workspace`. Confirm nonempty `./workspace/audio/final/ai_radio.mp3`.
6. Metadata: `python3 /.agents/skills/metadata-generation/scripts/generate_metadata.py --workspace ./workspace`. Confirm `./workspace/data/show_notes.json`.
7. Optional cover: `python3 /.agents/skills/cover-image-generation/scripts/generate_image.py --workspace ./workspace --metadata ./workspace/data/show_notes.json`. Do not delay completion for artwork.

**Success means both a playable MP3 and valid show_notes.json exist.** On any required-step error, stop, identify the failed step, and return an explicit failure; never claim completion without audio. Keep final response short, describing the generated files without remote file links.
