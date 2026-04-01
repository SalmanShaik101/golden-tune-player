import { usePlayer } from '@/context/PlayerContext';
import { Library, ListMusic, Heart, Clock, Plus, Trash2, Music } from 'lucide-react';
import type { SidebarView } from '@/lib/types';
import { motion } from 'framer-motion';
import { useState } from 'react';

const navItems: { icon: typeof Library; label: string; view: SidebarView }[] = [
  { icon: Library, label: 'Library', view: 'library' },
  { icon: ListMusic, label: 'Playlists', view: 'playlists' },
  { icon: Heart, label: 'Favourites', view: 'favourites' },
  { icon: Clock, label: 'Recent', view: 'recent' },
];

export default function Sidebar() {
  const { sidebarView, setSidebarView, playlists, createPlaylist, deletePlaylist, setActivePlaylist, activePlaylistId } = usePlayer();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreate(false);
    }
  };

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Music className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-primary gold-glow">AURA</h1>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Music Player</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        <p className="px-3 pt-4 pb-2 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Menu</p>
        {navItems.map(({ icon: Icon, label, view }) => (
          <motion.button
            key={view}
            whileHover={{ x: 4 }}
            onClick={() => { setSidebarView(view); setActivePlaylist(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              sidebarView === view && !activePlaylistId
                ? 'bg-sidebar-accent text-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </motion.button>
        ))}

        {/* Playlists section */}
        <div className="pt-6">
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Playlists</p>
            <button onClick={() => setShowCreate(!showCreate)} className="text-muted-foreground hover:text-primary transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showCreate && (
            <div className="px-3 pb-2 flex gap-2">
              <input
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Playlist name"
                className="flex-1 bg-sidebar-accent border border-sidebar-border rounded-md px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                autoFocus
              />
            </div>
          )}

          {playlists.map(pl => (
            <motion.button
              key={pl.id}
              whileHover={{ x: 4 }}
              onClick={() => { setActivePlaylist(pl.id); setSidebarView('playlists'); }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors group ${
                activePlaylistId === pl.id
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <ListMusic className="w-4 h-4 shrink-0" />
                <span className="truncate">{pl.name}</span>
              </span>
              <button
                onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.button>
          ))}
        </div>
      </nav>
    </aside>
  );
}
