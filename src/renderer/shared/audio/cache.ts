/**
 * Audio cache helper for Listening module.
 * Returns the relative cache path under userData for a given test.
 * Consumer (main process) joins with app.getPath('userData').
 */
export function audioCachePath(testId: string): string {
  return `audio/${testId}.mp3`;
}
