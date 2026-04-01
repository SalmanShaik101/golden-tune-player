export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  fileBlob?: Blob;
  artworkUrl?: string;
  artworkBlob?: Blob;
  addedAt: number;
  lastPlayedAt?: number;
  playCount: number;
  liked: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PlayHistory {
  songId: string;
  playedAt: number;
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface EQPreset {
  name: string;
  gains: number[]; // 8 bands
  bassBoost: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type ShuffleMode = 'off' | 'smart';
export type RightPanel = 'lyrics' | 'eq' | 'recent' | 'queue' | null;
export type SidebarView = 'library' | 'playlists' | 'favourites' | 'recent';
