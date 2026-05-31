// Optional AI integration.
// Designed to be "best-effort":
// - If no API key is provided, it returns a friendly fallback explanation.
// - If the API request fails, it returns a shorter fallback.
//
// This keeps the project portfolio-ready without breaking core conversions.

const DEFAULT_PROVIDER = 'openai';

function getEnvKey() {
  // Works if user sets global variable in browser console or via script injection.
  // Example: window.OPENAI_API_KEY = '...'
  if (typeof window !== 'undefined') {
    return window.OPENAI_API_KEY || window.aiApiKey || '';
  }
  return '';
}

function buildFallbackExplanation({ kind, value, from, to }) {
  if (kind === 'temperature') {
    return `Temperature conversion: convert ${from} → °C → ${to}. Value ${value} is transformed using the standard °C/°F/K formulas.`;
  }
  if (kind === 'units') {
    return `Unit conversion: convert ${from} → base units → ${to}. Value ${value} is transformed using fixed conversion factors.`;
  }
  if (kind === 'currency') {
    return `Currency conversion: multiply ${value} ${from} by the live exchange rate to get ${to}.`;
  }
  return `Conversion explanation is not available for this input type.`;
}

function safeString(x) {
  return typeof x === 'string' ? x : String(x);
}

async function explainWithOpenAI({ prompt, apiKey, model }) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful coding tutor. Provide a concise, step-by-step explanation of the specific conversion.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed: ${res.status} ${res.statusText}${text ? ' - ' + text.slice(0, 200) : ''}`);
  }

  const data = await res.json();
  const out = data?.choices?.[0]?.message?.content;
  if (!out) throw new Error('AI response did not include content.');
  return safeString(out).trim();
}

export async function getConversionExplanation({ kind, value, from, to, aiMode = 'explain', provider = DEFAULT_PROVIDER, model } = {}) {
  const apiKey = getEnvKey().trim();


  const fallback = buildFallbackExplanation({ kind, value, from, to });
  if (!apiKey) return { explanation: fallback, usedAI: false };

  // Keep prompt deterministic and small.
  const prompt = [
    `Task: ${aiMode}`,
    `Conversion type: ${kind}`,
    `Input: ${value} ${from} to ${to}`,
    `Give a short, step-by-step explanation and include the final result formula relationship (no need to compute numerically).`,
  ].join('\n');

  try {
    if (provider === 'openai') {
      const explanation = await explainWithOpenAI({ prompt, apiKey, model });
      return { explanation, usedAI: true };
    }

    return { explanation: fallback, usedAI: false };
  } catch {
    return { explanation: fallback, usedAI: false };
  }
}

