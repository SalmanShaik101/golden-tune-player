import type { Song, PlayHistory } from './types';

/**
 * Smart shuffle: avoids recently played, prefers same artist/similar duration.
 */
export function getNextSmartShuffle(
  allSongs: Song[],
  currentSong: Song | null,
  history: PlayHistory[],
  queueSongIds: string[]
): string | null {
  if (allSongs.length === 0) return null;
  if (allSongs.length === 1) return allSongs[0].id;

  // Songs not recently played (last 30% of library)
  const recentIds = new Set(
    history.slice(0, Math.max(3, Math.floor(allSongs.length * 0.3))).map(h => h.songId)
  );

  // Remove current song and queued songs
  const candidates = allSongs.filter(
    s => s.id !== currentSong?.id && !recentIds.has(s.id) && !queueSongIds.includes(s.id)
  );

  // If all filtered out, fall back to all except current
  const pool = candidates.length > 0
    ? candidates
    : allSongs.filter(s => s.id !== currentSong?.id);

  if (pool.length === 0) return allSongs[0].id;

  // Score each song: same artist = +3, similar duration = +2, play count bonus for less played
  const scored = pool.map(song => {
    let score = Math.random() * 2; // base randomness
    if (currentSong) {
      if (song.artist === currentSong.artist) score += 3;
      const durDiff = Math.abs(song.duration - currentSong.duration);
      if (durDiff < 60) score += 2;
      else if (durDiff < 120) score += 1;
    }
    // Prefer less played
    score += Math.max(0, 5 - song.playCount) * 0.5;
    return { song, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick from top 3 for variety
  const topN = scored.slice(0, Math.min(3, scored.length));
  const pick = topN[Math.floor(Math.random() * topN.length)];
  return pick.song.id;
}
