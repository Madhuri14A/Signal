import axios from 'axios';
import { Router } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

type SignalRow = {
  id: number;
  label: string | null;
  summary: string | null;
};

const PRIMARY_MODEL = process.env.GEMINI_BLINDSPOT_MODEL || process.env.GEMINI_LABEL_MODEL || 'models/gemini-1.5-flash';
const FALLBACK_MODELS = ['models/gemini-1.5-flash-latest', 'models/gemini-2.0-flash'];

const router = Router();

async function generateCounterargument(apiKey: string, label: string, summary: string): Promise<string> {
  const prompt = `The following idea is gaining traction: ${label}. ${summary}. Write the strongest possible counterargument in 3 sentences. Be direct, not preachy.`;
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        },
        { timeout: 30000 }
      );

      const text = (response.data as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      })?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text?.trim()) {
        throw new Error('No text returned from Gemini');
      }

      return text.trim();
    } catch (error) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }

  if (axios.isAxiosError(lastError)) {
    const details = JSON.stringify(lastError.response?.data ?? {});
    throw new Error(`Gemini blindspot model not found. Tried: ${modelsToTry.join(', ')}. Response: ${details}`);
  }

  throw new Error(`Gemini blindspot model not found. Tried: ${modelsToTry.join(', ')}`);
}

router.post('/blindspot', authMiddleware, async (req, res) => {
  const { signalId } = req.body as { signalId?: number | string };
  const parsedSignalId = Number(signalId);

  if (!Number.isInteger(parsedSignalId) || parsedSignalId <= 0) {
    return res.status(400).json({ message: 'signalId must be a positive integer' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'GEMINI_API_KEY is required' });
  }

  try {
    const result = await query<SignalRow>(
      `SELECT id, label, summary
       FROM signals
       WHERE id = $1
       LIMIT 1`,
      [parsedSignalId]
    );

    const signal = result.rows[0];
    if (!signal) {
      return res.status(404).json({ message: 'signal not found' });
    }

    const label = signal.label?.trim() || 'Untitled signal';
    const summary = signal.summary?.trim() || 'No summary provided.';
    const counterargument = await generateCounterargument(apiKey, label, summary);

    return res.json({ counterargument });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to generate counterargument',
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

export default router;
