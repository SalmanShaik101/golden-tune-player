import type { Song } from './types';

/**
 * Extract metadata from audio files using the File API.
 */
export async function importAudioFiles(files: FileList): Promise<Song[]> {
  const songs: Song[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('audio/')) continue;

    const song = await processAudioFile(file);
    if (song) songs.push(song);
  }

  return songs;
}

async function processAudioFile(file: File): Promise<Song | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;

    audio.addEventListener('loadedmetadata', () => {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
      // Try to parse "Artist - Title" format
      const parts = nameWithoutExt.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : nameWithoutExt;

      const song: Song = {
        id: crypto.randomUUID(),
        title,
        artist,
        album: 'Unknown Album',
        duration: audio.duration,
        fileBlob: file,
        addedAt: Date.now(),
        playCount: 0,
        liked: false,
      };

      URL.revokeObjectURL(url);
      resolve(song);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });
  });
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
