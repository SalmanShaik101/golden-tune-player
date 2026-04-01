import { usePlayer } from '@/context/PlayerContext';
import { importAudioFiles, formatDuration } from '@/lib/fileImport';
import { parseLRC, parseJSONLyrics } from '@/lib/lrcParser';
import { Play, Pause, Heart, Plus, Trash2, Upload, MoreVertical, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useState, useMemo } from 'react';
import type { Song } from '@/lib/types';

export default function MainContent() {
  const {
    songs, currentSong, isPlaying, sidebarView, playSong, togglePlay,
    toggleLike, addSongs, removeSong, history, playlists, activePlaylistId,
    addToPlaylist, removeFromPlaylist, addToQueue, setLyrics,
  } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ songId: string; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setImporting(true);
    const imported = await importAudioFiles(e.target.files);
    await addSongs(imported);
    setImporting(false);
    e.target.value = '';
  };

  const handleLyricsImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lyrics = file.name.endsWith('.lrc') ? parseLRC(text) : parseJSONLyrics(text);
      setLyrics(lyrics);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Determine which songs to display
  const displaySongs = useMemo((): Song[] => {
    let list: Song[] = [];
    if (activePlaylistId) {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (pl) list = pl.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as Song[];
    } else if (sidebarView === 'favourites') {
      list = songs.filter(s => s.liked);
    } else if (sidebarView === 'recent') {
      const seen = new Set<string>();
      for (const h of history) {
        if (!seen.has(h.songId)) {
          seen.add(h.songId);
          const s = songs.find(s => s.id === h.songId);
          if (s) list.push(s);
        }
      }
    } else {
      list = songs;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    }
    return list;
  }, [songs, sidebarView, activePlaylistId, playlists, history, searchQuery]);

  const title = activePlaylistId
    ? playlists.find(p => p.id === activePlaylistId)?.name ?? 'Playlist'
    : sidebarView === 'favourites' ? 'Favourites'
    : sidebarView === 'recent' ? 'Recently Played'
    : 'Your Library';

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative" onClick={() => setContextMenu(null)}>
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{displaySongs.length} songs</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm w-48 outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
          <input ref={lyricsInputRef} type="file" accept=".lrc,.json" onChange={handleLyricsImport} className="hidden" />
          <button
            onClick={() => lyricsInputRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            Load Lyrics
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={handleImport} className="hidden" />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:shadow-[var(--shadow-gold)] transition-shadow disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Add Music'}
          </motion.button>
        </div>
      </div>

      {/* Song List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-4">
        {displaySongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Music className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No music yet</p>
            <p className="text-sm mt-1">Click "Add Music" to import audio files from your device</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_1fr_80px_40px] gap-4 px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-widest border-b border-border">
              <span>#</span>
              <span>Title</span>
              <span>Artist</span>
              <span className="text-right">Duration</span>
              <span />
            </div>

            <AnimatePresence>
              {displaySongs.map((song, i) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onDoubleClick={() => playSong(song)}
                    onContextMenu={e => { e.preventDefault(); setContextMenu({ songId: song.id, x: e.clientX, y: e.clientY }); }}
                    className={`grid grid-cols-[40px_1fr_1fr_80px_40px] gap-4 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/60'
                    }`}
                  >
                    <span className="flex items-center">
                      {isActive && isPlaying ? (
                        <div className="flex items-end gap-0.5 h-4">
                          <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground group-hover:hidden">{i + 1}</span>
                      )}
                      <button onClick={() => isActive ? togglePlay() : playSong(song)} className="hidden group-hover:block">
                        {isActive && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </span>
                    <span className="text-sm truncate font-medium">{song.title}</span>
                    <span className="text-sm text-muted-foreground truncate">{song.artist}</span>
                    <span className="text-sm text-muted-foreground text-right">{formatDuration(song.duration)}</span>
                    <button onClick={() => toggleLike(song.id)} className="flex items-center justify-center">
                      <Heart className={`w-4 h-4 transition-colors ${song.liked ? 'fill-primary text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px] animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => { addToQueue(contextMenu.songId); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2"
          >
            <Plus className="w-3 h-3" /> Add to Queue
          </button>
          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => { addToPlaylist(pl.id, contextMenu.songId); setContextMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> Add to {pl.name}
            </button>
          ))}
          {activePlaylistId && (
            <button
              onClick={() => { removeFromPlaylist(activePlaylistId, contextMenu.songId); setContextMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-secondary text-destructive transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" /> Remove from Playlist
            </button>
          )}
          <button
            onClick={() => { removeSong(contextMenu.songId); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-secondary text-destructive transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3 h-3" /> Delete Song
          </button>
        </div>
      )}
    </div>
  );
}
