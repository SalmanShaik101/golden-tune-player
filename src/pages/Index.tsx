import Sidebar from '@/components/Sidebar';
import MainContent from '@/components/MainContent';
import BottomPlayer from '@/components/BottomPlayer';
import RightPanel from '@/components/RightPanel';
import { PlayerProvider } from '@/context/PlayerContext';

const Index = () => {
  return (
    <PlayerProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <MainContent />
          <RightPanel />
        </div>
        <BottomPlayer />
      </div>
    </PlayerProvider>
  );
};

export default Index;
