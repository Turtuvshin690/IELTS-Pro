export async function transcribe(key: string, wav: Buffer) {
  const form = new FormData();
  form.append('file', new Blob([wav]), 'audio.wav');
  form.append('model', 'parakeet-1-1b-ctc-en-us');
  const r = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: form as any
  });
  if (!r.ok) throw new Error(`ASR ${r.status}`);
  const j = (await r.json()) as { text: string };
  return j.text as string;
}
