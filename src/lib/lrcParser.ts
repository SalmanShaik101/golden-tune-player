import type { LyricLine } from './types';

/**
 * Parse LRC format lyrics into timed lines.
 * Format: [mm:ss.xx] text
 */
export function parseLRC(lrcContent: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lrcContent.split('\n')) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text) {
        lines.push({ time, text });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * Parse JSON lyrics: [{ time: number, text: string }]
 */
export function parseJSONLyrics(json: string): LyricLine[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((l: any) => typeof l.time === 'number' && typeof l.text === 'string')
        .sort((a: LyricLine, b: LyricLine) => a.time - b.time);
    }
  } catch {}
  return [];
}

export function getCurrentLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (lyrics.length === 0) return -1;
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time) return i;
  }
  return -1;
}
