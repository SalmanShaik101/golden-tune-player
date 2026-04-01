import { usePlayer } from '@/context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Heart, Volume2, VolumeX, Moon, ListMusic, Mic2, SlidersHorizontal } from 'lucide-react';
import { formatDuration } from '@/lib/fileImport';
import { motion } from 'framer-motion';
import type { RightPanel } from '@/lib/types';

export default function BottomPlayer() {
  const {
    currentSong, isPlaying, currentTime, duration, volume,
    repeatMode, shuffleMode, togglePlay, seekTo, setVolume,
    playNext, playPrev, toggleRepeat, toggleShuffle, toggleLike,
    rightPanel, setRightPanel, sleepTimer, setSleepTimer, songs,
  } = usePlayer();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekTo(pct * duration);
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setVolume(Math.max(0, Math.min(1, pct)));
  };

  const togglePanel = (panel: RightPanel) => {
    setRightPanel(rightPanel === panel ? null : panel);
  };

  const cycleSleepTimer = () => {
    const options: (number | null)[] = [null, 15, 30, 60];
    const current = options.indexOf(sleepTimer);
    setSleepTimer(options[(current + 1) % options.length]);
  };

  if (!currentSong && songs.length === 0) return null;

  return (
    <div className="h-24 bg-card/80 backdrop-blur-xl border-t border-border flex items-center px-4 gap-4 shrink-0">
      {/* Song Info */}
      <div className="flex items-center gap-3 w-64 shrink-0">
        {currentSong ? (
          <>
            <div className={`w-14 h-14 rounded-lg bg-secondary flex items-center justify-center overflow-hidden album-art-spin ${isPlaying ? 'playing' : ''}`}>
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent flex items-center justify-center">
                <Mic2 className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
            </div>
            <button onClick={() => toggleLike(currentSong.id)} className="shrink-0">
              <Heart className={`w-4 h-4 transition-colors ${currentSong.liked ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary'}`} />
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No song playing</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-1.5 max-w-2xl">
        <div className="flex items-center gap-4">
          <button onClick={toggleShuffle} className={`transition-colors ${shuffleMode === 'smart' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={playPrev} className="text-foreground hover:text-primary transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:shadow-[var(--shadow-gold)] transition-shadow"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </motion.button>
          <button onClick={playNext} className="text-foreground hover:text-primary transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
          <button onClick={toggleRepeat} className={`transition-colors ${repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-10 text-right">{formatDuration(currentTime)}</span>
          <div className="flex-1 h-1.5 bg-secondary rounded-full cursor-pointer group relative" onClick={handleSeek}>
            <div className="h-full bg-primary rounded-full transition-all relative" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[var(--shadow-gold)]" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground w-10">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 w-64 justify-end shrink-0">
        <button onClick={cycleSleepTimer} className={`text-xs transition-colors ${sleepTimer ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} title={sleepTimer ? `Sleep: ${sleepTimer}m` : 'Sleep timer'}>
          <Moon className="w-4 h-4" />
          {sleepTimer && <span className="text-[9px] ml-0.5">{sleepTimer}</span>}
        </button>
        <button onClick={() => togglePanel('lyrics')} className={`transition-colors ${rightPanel === 'lyrics' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <Mic2 className="w-4 h-4" />
        </button>
        <button onClick={() => togglePanel('eq')} className={`transition-colors ${rightPanel === 'eq' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <button onClick={() => togglePanel('queue')} className={`transition-colors ${rightPanel === 'queue' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <ListMusic className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="text-muted-foreground hover:text-foreground transition-colors">
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="w-20 h-1 bg-secondary rounded-full cursor-pointer" onClick={handleVolumeChange}>
            <div className="h-full bg-primary rounded-full" style={{ width: `${volume * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
