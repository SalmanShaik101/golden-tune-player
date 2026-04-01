import { openDB, type IDBPDatabase } from 'idb';
import type { Song, Playlist, PlayHistory } from './types';

const DB_NAME = 'aura-music';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('songs')) {
        const songStore = db.createObjectStore('songs', { keyPath: 'id' });
        songStore.createIndex('artist', 'artist');
        songStore.createIndex('lastPlayedAt', 'lastPlayedAt');
        songStore.createIndex('liked', 'liked');
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('history')) {
        const historyStore = db.createObjectStore('history', { autoIncrement: true });
        historyStore.createIndex('playedAt', 'playedAt');
        historyStore.createIndex('songId', 'songId');
      }
    },
  });
  return dbInstance;
}

// Songs
export async function saveSong(song: Song): Promise<void> {
  const db = await getDB();
  await db.put('songs', song);
}

export async function getSong(id: string): Promise<Song | undefined> {
  const db = await getDB();
  return db.get('songs', id);
}

export async function getAllSongs(): Promise<Song[]> {
  const db = await getDB();
  return db.getAll('songs');
}

export async function deleteSong(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('songs', id);
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<void> {
  const db = await getDB();
  const song = await db.get('songs', id);
  if (song) {
    await db.put('songs', { ...song, ...updates });
  }
}

// Playlists
export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  await db.put('playlists', playlist);
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('playlists', id);
}

// History
export async function addToHistory(entry: PlayHistory): Promise<void> {
  const db = await getDB();
  await db.add('history', entry);
}

export async function getRecentHistory(limit = 50): Promise<PlayHistory[]> {
  const db = await getDB();
  const all = await db.getAll('history');
  return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, limit);
}

export async function getLikedSongs(): Promise<Song[]> {
  const db = await getDB();
  const songs = await db.getAll('songs');
  return songs.filter(s => s.liked);
}
