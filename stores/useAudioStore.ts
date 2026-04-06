import { create } from 'zustand';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

interface AudioState {
  currentlyPlayingId: string | null;
  currentlyPlayingTitle: string | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  player: AudioPlayer | null;
  showPlayer: boolean;
  isMinimized: boolean;
  
  // Actions
  play: (bookmarkId: string, title: string, audioUri: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekTo: (position: number) => void;
  setShowPlayer: (show: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  toggle: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentlyPlayingId: null,
  currentlyPlayingTitle: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  player: null,
  showPlayer: false,
  isMinimized: false,

  play: async (bookmarkId: string, title: string, audioUri: string) => {
    const { player, stop } = get();

    // If same track, just resume
    if (get().currentlyPlayingId === bookmarkId && player) {
      player.play();
      set({ isPlaying: true, isMinimized: false, showPlayer: true });
      return;
    }

    // Stop existing if any
    if (player) {
      stop();
    }

    try {
      console.log('useAudioStore: Creating new player for:', title);
      
      const newPlayer = createAudioPlayer(audioUri, {
        updateInterval: 250, // Faster updates for smooth UI
      });
      
      // Initial state
      set({ 
        player: newPlayer, 
        currentlyPlayingId: bookmarkId, 
        currentlyPlayingTitle: title,
        isPlaying: true,
        showPlayer: true,
        isMinimized: false,
        position: 0,
        duration: 0
      });

      // Setup listeners
      newPlayer.addListener('playbackStatusUpdate', (status) => {
        set({ 
          isPlaying: status.playing,
          position: status.currentTime,
          duration: status.duration,
        });

        if (status.didJustFinish) {
          get().stop();
        }
      });

      // Start playback
      newPlayer.play();

    } catch (err) {
      console.error('useAudioStore: Playback error:', err);
      set({ isPlaying: false, currentlyPlayingId: null, player: null });
    }
  },

  pause: () => {
    const { player } = get();
    if (player) {
      player.pause();
      set({ isPlaying: false });
    }
  },

  resume: () => {
    const { player } = get();
    if (player) {
      player.play();
      set({ isPlaying: true });
    }
  },

  stop: () => {
    const { player } = get();
    
    if (player) {
      player.pause();
      player.remove();
    }
    
    set({ 
      player: null, 
      currentlyPlayingId: null, 
      currentlyPlayingTitle: null,
      isPlaying: false, 
      position: 0, 
      duration: 0,
      showPlayer: false,
      isMinimized: false
    });
  },

  seekTo: (position: number) => {
    const { player } = get();
    if (player) {
      player.seekTo(position);
      set({ position });
    }
  },

  setShowPlayer: (show: boolean) => set({ showPlayer: show }),
  
  setIsMinimized: (minimized: boolean) => set({ isMinimized: minimized }),

  toggle: () => {
    const { isPlaying, pause, resume } = get();
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  },
}));