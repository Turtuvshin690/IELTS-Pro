export async function synthesize(
  key: string,
  text: string,
  voice = 'Magpie-Multilingual.en-US.Ava'
) {
  const r = await fetch('https://integrate.api.nvidia.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: voice, input: text })
  });
  if (!r.ok) throw new Error(`TTS ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
