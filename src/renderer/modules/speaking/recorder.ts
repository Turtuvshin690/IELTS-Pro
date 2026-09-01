/**
 * Speaking recorder helpers
 * pickMime — prefer webm, fallback to first available
 * isTooLong — guard >240s (4 minutes max clip)
 * startRecording — MediaRecorder wrapper returning mr + stop promise
 */

export function pickMime(available: string[]): string {
  if (!available || available.length === 0) return '';
  return available.includes('audio/webm') ? 'audio/webm' : available[0];
}

export function isTooLong(sec: number): boolean {
  return sec > 240;
}

export async function startRecording(
  stream: MediaStream,
  mime: string,
): Promise<{ mr: MediaRecorder; stop: () => Promise<Blob> }> {
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  mr.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  const stop = () =>
    new Promise<Blob>((resolve) => {
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mime || 'audio/webm' });
        resolve(blob);
      };
      if (mr.state !== 'inactive') mr.stop();
      else {
        const blob = new Blob(chunks, { type: mime || 'audio/webm' });
        resolve(blob);
      }
    });
  return { mr, stop };
}
