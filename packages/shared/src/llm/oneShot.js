import { createClient } from './createClient.js';

/**
 * 单轮对话：发一条 system + user，返回拼接后的文本。
 * @param {{ model: string, system?: string, user: string, maxTokens?: number, timeout?: number }} opts
 * @returns {Promise<string>}
 */
export async function oneShot({ model, system, user, maxTokens = 64, timeout = 8000 }) {
  const client = createClient({ timeout });
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}
