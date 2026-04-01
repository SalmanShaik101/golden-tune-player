import { usePlayer } from '@/context/PlayerContext';
import { useEffect, useRef } from 'react';
import { getCurrentLyricIndex } from '@/lib/lrcParser';
import { EQ_FREQUENCIES } from '@/lib/audioEngine';
import { formatDuration } from '@/lib/fileImport';
import { X, Trash2, Music, Mic2, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LyricsPanel() {
  const { lyrics, currentTime } = usePlayer();
  const currentIdx = getCurrentLyricIndex(lyrics, currentTime);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIdx >= 0 && containerRef.current) {
      const el = containerRef.current.children[currentIdx] as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIdx]);

  if (lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Mic2 className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No lyrics loaded</p>
        <p className="text-xs mt-1">Load a .lrc or .json lyrics file</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3 overflow-y-auto scrollbar-thin h-full px-4 py-6">
      {lyrics.map((line, i) => (
        <p
          key={i}
          className={`text-sm transition-all duration-300 leading-relaxed ${
            i === currentIdx
              ? 'text-primary font-semibold text-base gold-glow'
              : i < currentIdx
              ? 'text-muted-foreground/50'
              : 'text-muted-foreground'
          }`}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}

function EQPanel() {
  const { eqGains, bassBoost, setEQBand, setBassBoost } = usePlayer();
  const labels = ['60', '170', '310', '600', '1K', '3K', '6K', '12K'];

  return (
    <div className="p-4 space-y-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Equalizer</p>
        <div className="flex justify-between gap-1">
          {eqGains.map((gain, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={gain}
                onChange={e => setEQBand(i, Number(e.target.value))}
                className="w-20 h-1 accent-primary"
                style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '100px', width: '20px' }}
              />
              <span className="text-[9px] text-muted-foreground">{labels[i]}</span>
              <span className="text-[9px] text-primary">{gain > 0 ? '+' : ''}{gain}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Bass Boost</p>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={bassBoost}
          onChange={e => setBassBoost(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>Off</span>
          <span className="text-primary">{bassBoost > 0 ? `+${bassBoost}dB` : 'Off'}</span>
          <span>Max</span>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Presets</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Flat', gains: [0,0,0,0,0,0,0,0], bass: 0 },
            { name: 'Bass Heavy', gains: [6,5,3,1,0,0,0,0], bass: 10 },
            { name: 'Vocal', gains: [-2,-1,0,3,4,3,1,0], bass: 0 },
            { name: 'Treble', gains: [0,0,0,0,1,3,5,6], bass: 0 },
          ].map(preset => (
            <button
              key={preset.name}
              onClick={() => {
                preset.gains.forEach((g, i) => setEQBand(i, g));
                setBassBoost(preset.bass);
              }}
              className="px-3 py-2 text-xs rounded-lg bg-secondary hover:bg-accent transition-colors text-secondary-foreground"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QueuePanel() {
  const { queue, songs, removeFromQueue, playSong } = usePlayer();

  return (
    <div className="p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Up Next ({queue.length})</p>
      {queue.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center mt-8">Queue is empty</p>
      ) : (
        <div className="space-y-1">
          {queue.map((songId, i) => {
            const song = songs.find(s => s.id === songId);
            if (!song) return null;
            return (
              <div key={`${songId}-${i}`} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary group">
                <button onClick={() => playSong(song)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                </button>
                <button onClick={() => removeFromQueue(i)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RightPanelView() {
  const { rightPanel, setRightPanel } = usePlayer();

  const titles = { lyrics: 'Lyrics', eq: 'Equalizer', queue: 'Queue', recent: 'Recent' };

  return (
    <AnimatePresence>
      {rightPanel && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full border-l border-border bg-card/40 backdrop-blur-xl overflow-hidden flex flex-col shrink-0"
        >
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <h3 className="font-display font-semibold text-sm">{titles[rightPanel]}</h3>
            <button onClick={() => setRightPanel(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {rightPanel === 'lyrics' && <LyricsPanel />}
            {rightPanel === 'eq' && <EQPanel />}
            {rightPanel === 'queue' && <QueuePanel />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
