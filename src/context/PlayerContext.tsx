import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Song, Playlist, PlayHistory, LyricLine, RepeatMode, ShuffleMode, RightPanel, SidebarView } from '@/lib/types';
import { audioEngine } from '@/lib/audioEngine';
import * as db from '@/lib/db';
import { getNextSmartShuffle } from '@/lib/smartShuffle';

interface PlayerState {
  songs: Song[];
  playlists: Playlist[];
  history: PlayHistory[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  shuffleMode: ShuffleMode;
  queue: string[];
  rightPanel: RightPanel;
  sidebarView: SidebarView;
  lyrics: LyricLine[];
  sleepTimer: number | null; // minutes remaining, null = off
  eqGains: number[];
  bassBoost: number;
  activePlaylistId: string | null;
}

interface PlayerActions {
  loadSongs: () => Promise<void>;
  addSongs: (songs: Song[]) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  playSong: (song: Song) => Promise<void>;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  setVolume: (v: number) => void;
  playNext: () => void;
  playPrev: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleLike: (id: string) => Promise<void>;
  setRightPanel: (p: RightPanel) => void;
  setSidebarView: (v: SidebarView) => void;
  setLyrics: (l: LyricLine[]) => void;
  setSleepTimer: (minutes: number | null) => void;
  setEQBand: (index: number, gain: number) => void;
  setBassBoost: (gain: number) => void;
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  setActivePlaylist: (id: string | null) => void;
  addToQueue: (songId: string) => void;
  removeFromQueue: (index: number) => void;
}

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<PlayHistory[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('off');
  const [queue, setQueue] = useState<string[]>([]);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>('library');
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [eqGains, setEqGains] = useState<number[]>(new Array(8).fill(0));
  const [bassBoost, setBassBoostState] = useState(0);
  const [activePlaylistId, setActivePlaylist] = useState<string | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init: load data from IndexedDB
  const loadSongs = useCallback(async () => {
    const [s, p, h] = await Promise.all([
      db.getAllSongs(),
      db.getAllPlaylists(),
      db.getRecentHistory(50),
    ]);
    setSongs(s);
    setPlaylists(p);
    setHistory(h);
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  // Audio engine callbacks
  useEffect(() => {
    audioEngine.onTimeUpdate = (t) => setCurrentTime(t);
    audioEngine.onDurationChange = (d) => setDuration(d);
    audioEngine.onPlay = () => setIsPlaying(true);
    audioEngine.onPause = () => setIsPlaying(false);
    audioEngine.onEnded = () => playNext();
    audioEngine.setVolume(volume);
    return () => { audioEngine.onEnded = null; };
  }, []);

  // Sleep timer
  useEffect(() => {
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    if (sleepTimer !== null && sleepTimer > 0) {
      const startTime = Date.now();
      const totalMs = sleepTimer * 60 * 1000;
      sleepTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= totalMs) {
          audioEngine.pause();
          setSleepTimerState(null);
          if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
        }
      }, 1000);
    }
    return () => { if (sleepTimerRef.current) clearInterval(sleepTimerRef.current); };
  }, [sleepTimer]);

  const addSongs = useCallback(async (newSongs: Song[]) => {
    for (const s of newSongs) await db.saveSong(s);
    setSongs(prev => [...prev, ...newSongs]);
  }, []);

  const removeSong = useCallback(async (id: string) => {
    await db.deleteSong(id);
    setSongs(prev => prev.filter(s => s.id !== id));
    if (currentSong?.id === id) {
      audioEngine.pause();
      setCurrentSong(null);
    }
  }, [currentSong]);

  const playSong = useCallback(async (song: Song) => {
    if (!song.fileBlob) {
      const fullSong = await db.getSong(song.id);
      if (!fullSong?.fileBlob) return;
      song = fullSong;
    }
    await audioEngine.loadBlob(song.fileBlob!);
    await audioEngine.play();
    setCurrentSong(song);
    setLyrics([]);

    // Update play count and history
    const updated = { ...song, playCount: song.playCount + 1, lastPlayedAt: Date.now() };
    await db.updateSong(song.id, { playCount: updated.playCount, lastPlayedAt: updated.lastPlayedAt });
    setSongs(prev => prev.map(s => s.id === song.id ? updated : s));

    const entry: PlayHistory = { songId: song.id, playedAt: Date.now() };
    await db.addToHistory(entry);
    setHistory(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const togglePlay = useCallback(() => {
    if (audioEngine.isPlaying) audioEngine.pause();
    else audioEngine.play();
  }, []);

  const seekTo = useCallback((time: number) => audioEngine.seek(time), []);

  const setVolume = useCallback((v: number) => {
    audioEngine.setVolume(v);
    setVolumeState(v);
  }, []);

  const getActiveSongList = useCallback((): Song[] => {
    if (activePlaylistId) {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (pl) return pl.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[];
    }
    return songs;
  }, [activePlaylistId, playlists, songs]);

  const playNext = useCallback(() => {
    // Check queue first
    if (queue.length > 0) {
      const nextId = queue[0];
      setQueue(prev => prev.slice(1));
      const nextSong = songs.find(s => s.id === nextId);
      if (nextSong) { playSong(nextSong); return; }
    }

    const list = getActiveSongList();
    if (list.length === 0) return;

    if (repeatMode === 'one' && currentSong) {
      playSong(currentSong);
      return;
    }

    if (shuffleMode === 'smart') {
      const nextId = getNextSmartShuffle(list, currentSong, history, queue);
      if (nextId) {
        const s = songs.find(s => s.id === nextId);
        if (s) playSong(s);
      }
      return;
    }

    // Sequential
    if (!currentSong) { playSong(list[0]); return; }
    const idx = list.findIndex(s => s.id === currentSong.id);
    const nextIdx = idx + 1;
    if (nextIdx < list.length) {
      playSong(list[nextIdx]);
    } else if (repeatMode === 'all') {
      playSong(list[0]);
    }
  }, [queue, songs, currentSong, repeatMode, shuffleMode, history, playSong, getActiveSongList]);

  // Re-attach onEnded when playNext changes
  useEffect(() => {
    audioEngine.onEnded = () => playNext();
  }, [playNext]);

  const playPrev = useCallback(() => {
    if (currentTime > 3) { seekTo(0); return; }
    const list = getActiveSongList();
    if (!currentSong || list.length === 0) return;
    const idx = list.findIndex(s => s.id === currentSong.id);
    const prevIdx = idx > 0 ? idx - 1 : list.length - 1;
    playSong(list[prevIdx]);
  }, [currentSong, currentTime, seekTo, playSong, getActiveSongList]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffleMode(prev => prev === 'off' ? 'smart' : 'off');
  }, []);

  const toggleLike = useCallback(async (id: string) => {
    const song = songs.find(s => s.id === id);
    if (!song) return;
    const liked = !song.liked;
    await db.updateSong(id, { liked });
    setSongs(prev => prev.map(s => s.id === id ? { ...s, liked } : s));
  }, [songs]);

  const setEQBand = useCallback((index: number, gain: number) => {
    audioEngine.setEQBand(index, gain);
    setEqGains(prev => { const n = [...prev]; n[index] = gain; return n; });
  }, []);

  const setBassBoost = useCallback((gain: number) => {
    audioEngine.setBassBoost(gain);
    setBassBoostState(gain);
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerState(minutes);
  }, []);

  const createPlaylist = useCallback(async (name: string) => {
    const pl: Playlist = { id: crypto.randomUUID(), name, songIds: [], createdAt: Date.now(), updatedAt: Date.now() };
    await db.savePlaylist(pl);
    setPlaylists(prev => [...prev, pl]);
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
    await db.deletePlaylist(id);
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) setActivePlaylist(null);
  }, [activePlaylistId]);

  const addToPlaylist = useCallback(async (playlistId: string, songId: string) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId && !p.songIds.includes(songId)) {
          const np = { ...p, songIds: [...p.songIds, songId], updatedAt: Date.now() };
          db.savePlaylist(np);
          return np;
        }
        return p;
      });
      return updated;
    });
  }, []);

  const removeFromPlaylist = useCallback(async (playlistId: string, songId: string) => {
    setPlaylists(prev => {
      return prev.map(p => {
        if (p.id === playlistId) {
          const np = { ...p, songIds: p.songIds.filter(id => id !== songId), updatedAt: Date.now() };
          db.savePlaylist(np);
          return np;
        }
        return p;
      });
    });
  }, []);

  const addToQueue = useCallback((songId: string) => {
    setQueue(prev => [...prev, songId]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  }, []);

  const value: PlayerState & PlayerActions = {
    songs, playlists, history, currentSong, isPlaying, currentTime, duration,
    volume, repeatMode, shuffleMode, queue, rightPanel, sidebarView, lyrics,
    sleepTimer, eqGains, bassBoost, activePlaylistId,
    loadSongs, addSongs, removeSong, playSong, togglePlay, seekTo, setVolume,
    playNext, playPrev, toggleRepeat, toggleShuffle, toggleLike,
    setRightPanel, setSidebarView, setLyrics, setSleepTimer,
    setEQBand, setBassBoost, createPlaylist, deletePlaylist,
    addToPlaylist, removeFromPlaylist, setActivePlaylist, addToQueue, removeFromQueue,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
