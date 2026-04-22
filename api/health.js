export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
      leonardo: Boolean(process.env.LEONARDO_API_KEY)
    }
  })
}

