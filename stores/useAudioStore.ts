import { create } from 'zustand';
import { Audio } from 'expo-av';

interface AudioState {
  currentlyPlayingId: string | null;
  isPlaying: boolean;
  soundRef: Audio.Sound | null;
  play: (bookmarkId: string, audioUri: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentlyPlayingId: null,
  isPlaying: false,
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
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            set({ isPlaying: false, currentlyPlayingId: null });
            sound.setPositionAsync(0);
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
      await soundRef.pauseAsync();
      set({ isPlaying: false });
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
      set({ soundRef: null, currentlyPlayingId: null, isPlaying: false });
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