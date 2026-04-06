import { createAudioPlayer, AudioPlayer } from "expo-audio";
import { create } from "zustand";

interface AudioState {
  currentlyPlayingId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  player: AudioPlayer | null;

  play: (bookmarkId: string, audioUri: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  toggle: () => Promise<void>;
  seekTo: (positionMillis: number) => Promise<void>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentlyPlayingId: null,
  isPlaying: false,
  isLoading: false,
  position: 0,
  duration: 0,
  player: null,

  play: async (bookmarkId: string, audioUri: string) => {
    const { currentlyPlayingId, player, isLoading } = get();

    if (isLoading) {
      console.log("Already loading audio, ignoring play request");
      return;
    }

    if (currentlyPlayingId === bookmarkId && player) {
      if (player.playing) {
        player.pause();
        set({ isPlaying: false });
      } else {
        player.play();
        set({ isPlaying: true });
      }
      return;
    }

    set({ isLoading: true });

    try {
      if (player) {
        player.pause();
        player.remove();
      }

      const newPlayer = createAudioPlayer({ uri: audioUri });
      
      newPlayer.addListener("playbackStatusUpdate", (status) => {
        set({
          position: status.currentTime * 1000,
          duration: (status.duration || 0) * 1000,
          isPlaying: status.playing,
        });

        if (status.didJustFinish) {
          set({
            isPlaying: false,
            currentlyPlayingId: null,
            position: 0,
            isLoading: false,
          });
        }
      });
      newPlayer.play();
      set({
        player: newPlayer,
        currentlyPlayingId: bookmarkId,
        isPlaying: true,
        isLoading: false,
      });
    } catch (err) {
      console.error("Audio playback error:", err);
      set({
        isPlaying: false,
        currentlyPlayingId: null,
        isLoading: false,
        player: null,
      });
    }
  },

  pause: async () => {
    const { player, isLoading } = get();
    if (player && !isLoading) {
      player.pause();
      set({ isPlaying: false });
    }
  },

  resume: async () => {
    const { player, isLoading } = get();
    if (player && !isLoading) {
      player.play();
      set({ isPlaying: true });
    }
  },

  stop: async () => {
    const { player, isLoading } = get();
    if (player && !isLoading) {
      player.pause();
      // Remove listener first to prevent race condition with status updates
      player.remove();
      set({
        player: null,
        currentlyPlayingId: null,
        isPlaying: false,
        position: 0,
        duration: 0,
        isLoading: false,
      });
    }
  },

  toggle: async () => {
    const { isPlaying, isLoading, pause, resume } = get();
    if (isLoading) return;

    if (isPlaying) {
      await pause();
    } else {
      await resume();
    }
  },

  seekTo: async (positionMillis: number) => {
    const { player, isLoading } = get();
    if (player && !isLoading) {
      player.seekTo(positionMillis / 1000);
      set({ position: positionMillis });
    }
  },
}));