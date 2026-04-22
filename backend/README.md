## Katha Ekadeshko Backend (Multi-AI Orchestration)

### Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### API

`POST /api/generate-katha`

```json
{
  "theme": "urban legend",
  "country": "Japan",
  "genre": "horror",
  "length": "medium"
}
```

### Output

```json
{
  "story": { "title": "", "setting": "", "characters": [], "story": "" },
  "script": [ { "scene": 1, "visual_description": "", "narration": "", "dialogue": [] } ],
  "images": [ { "scene": 1, "image_url": "", "prompt": "" } ],
  "audio": [ { "scene": 1, "audio_url": "" } ],
  "metadata": { "country": "", "region": "", "genre": "", "theme": "", "length": "" }
}
```

### Notes

- DeepSeek + Gemini run in **parallel**.
- Leonardo + TTS run in **parallel**.
- Anti-repetition uses a lightweight fingerprint store at `MEMORY_PATH` (default `./data/memory.json`).

