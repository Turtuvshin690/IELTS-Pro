import { WRITING_SYSTEM } from './prompts';

export const NIM_BASE = 'https://integrate.api.nvidia.com';

export function buildChatPayload(messages: unknown[]) {
  return {
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    messages,
    temperature: 1.0,
    top_p: 0.95,
    max_tokens: 2048
  };
}

export async function chat(key: string, messages: unknown[]) {
  const r = await fetch(`${NIM_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildChatPayload(messages))
  });
  if (!r.ok) throw new Error(`NIM ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { choices: { message: { content: string } }[] };
  return j.choices[0].message.content as string;
}

// Re-export for callers that need prompt context (keeps WRITING_SYSTEM usage explicit)
export { WRITING_SYSTEM };
