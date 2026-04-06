import { create } from 'zustand';
import { Audio } from 'expo-av';

interface AudioState {
  currentlyPlayingId: string | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  soundRef: Audio.Sound | null;
  play: (bookmarkId: string, audioUri: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentlyPlayingId: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  soundRef: null,

  play: async (bookmarkId: string, audioUri: string) => {
    const { currentlyPlayingId, soundRef, stop } = get();

    if (currentlyPlayingId === bookmarkId && soundRef) {
      await soundRef.playAsync();
      set({ isPlaying: true });
      return;
    }

    if (soundRef) {
      await stop();
    }

    try {
      set({ position: 0, duration: 0 });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              set({ isPlaying: false, currentlyPlayingId: null, position: 0 });
              sound.setPositionAsync(0);
            } else {
              set({
                position: status.positionMillis || 0,
                duration: status.durationMillis || 0,
              });
            }
          }
        }
      );

      set({ soundRef: sound, currentlyPlayingId: bookmarkId, isPlaying: true });
    } catch (err) {
      console.error('Audio playback error:', err);
      set({ isPlaying: false, currentlyPlayingId: null });
    }
  },

  pause: async () => {
    const { soundRef } = get();
    if (soundRef) {
      const status = await soundRef.getStatusAsync();
      await soundRef.pauseAsync();
      set({ 
        isPlaying: false,
        position: status.isLoaded ? status.positionMillis || 0 : 0,
      });
    }
  },

  resume: async () => {
    const { soundRef } = get();
    if (soundRef) {
      await soundRef.playAsync();
      set({ isPlaying: true });
    }
  },

  stop: async () => {
    const { soundRef } = get();
    if (soundRef) {
      await soundRef.stopAsync();
      await soundRef.unloadAsync();
      set({ soundRef: null, currentlyPlayingId: null, isPlaying: false, position: 0, duration: 0 });
    }
  },

  toggle: async () => {
    const { isPlaying, pause, resume } = get();
    if (isPlaying) {
      await pause();
    } else {
      await resume();
    }
  },
}));