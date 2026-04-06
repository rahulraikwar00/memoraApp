import React, { useEffect, useCallback, memo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import { useAudioStore } from "../stores/useAudioStore";
import { Bookmark } from "../lib/db";
import TagChip from "./TagChip";

interface WaveformBarProps {
  height: number;
  isPlaying: boolean;
  index: number;
  color: string;
}

const WaveformBar = memo(function WaveformBar({
  height,
  isPlaying,
  index,
  color,
}: WaveformBarProps) {
  const animatedHeight = useSharedValue(0.2);

  useEffect(() => {
    if (isPlaying) {
      animatedHeight.value = withTiming(height, {
        duration: 300 + index * 50,
      });
    } else {
      cancelAnimation(animatedHeight);
      animatedHeight.value = withTiming(0.2, { duration: 200 });
    }
    return () => {
      cancelAnimation(animatedHeight);
    };
  }, [isPlaying, height, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${animatedHeight.value * 100}%`,
  }));

  return (
    <Animated.View
      style={[styles.waveformBar, { backgroundColor: color }, animatedStyle]}
    />
  );
});

interface AudioPlayerModalProps {
  visible: boolean;
  bookmark: Bookmark;
  onClose: () => void;
  onDelete?: () => void;
  onShowOptions?: () => void;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

export default function AudioPlayerModal({
  visible,
  bookmark,
  onClose,
  onDelete,
  onShowOptions,
}: AudioPlayerModalProps) {
  const colors = useThemeStore((state) => state.colors);
  const spacing = useThemeStore((state) => state.spacing);
  const tags = JSON.parse(bookmark.tags || "[]") as string[];

  const currentlyPlayingId = useAudioStore((state) => state.currentlyPlayingId);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const position = useAudioStore((state) => state.position);
  const duration = useAudioStore((state) => state.duration);
  const play = useAudioStore((state) => state.play);
  const pause = useAudioStore((state) => state.pause);
  const stop = useAudioStore((state) => state.stop);

  const isThisPlaying = currentlyPlayingId === bookmark.id && isPlaying;

  const formattedPosition = currentlyPlayingId === bookmark.id ? position : 0;
  const formattedDuration = currentlyPlayingId === bookmark.id ? duration : 0;

  useEffect(() => {
    return () => {
      if (currentlyPlayingId === bookmark.id) {
        stop();
      }
    };
  }, [currentlyPlayingId, bookmark.id, stop]);

  useEffect(() => {
    if (!visible) {
      stop();
    }
  }, [visible]);

  const formatTime = useCallback((ms: number) => {
    if (!ms) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!bookmark.local_path) {
      Alert.alert("Error", "Audio file not found");
      return;
    }

    if (isThisPlaying) {
      await pause();
    } else {
      await play(bookmark.id, bookmark.local_path);
    }
  }, [bookmark.id, bookmark.local_path, isThisPlaying, pause, play]);

  const handleSeek = useCallback(async (forward: boolean) => {
    Alert.alert("Seeking", "Seeking is not supported in grid view");
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this voice recording?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  }, [onDelete, onClose]);

  const progress = formattedDuration ? formattedPosition / formattedDuration : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            Voice
          </Text>
          
          <View style={styles.headerActions}>
            {onShowOptions && (
              <Pressable onPress={onShowOptions} style={styles.headerButton}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.playerContainer}>
          <View style={[styles.waveformContainer, { backgroundColor: colors.elevated }]}>
            {[0.3, 0.6, 0.9, 0.7, 0.4, 0.8, 0.5, 0.6].map((height, index) => (
              <WaveformBar
                key={index}
                height={height}
                isPlaying={isThisPlaying}
                index={index}
                color={colors.accent}
              />
            ))}
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {bookmark.title?.replace(/\s*\(\d+:\d+\)/, "") || "Voice Note"}
          </Text>

          <View style={styles.timeContainer}>
            <Text style={[styles.time, { color: colors.textTertiary }]}>
              {formatTime(formattedPosition)}
            </Text>
            <Text style={[styles.time, { color: colors.textTertiary }]}>
              {formatTime(formattedDuration)}
            </Text>
          </View>

          <View style={[styles.progressContainer, { backgroundColor: colors.textTertiary + "40" }]}>
            <View 
              style={[
                styles.progressBar, 
                { backgroundColor: colors.accent, width: `${progress * 100}%` }
              ]} 
            />
          </View>

          <View style={styles.controls}>
            <Pressable 
              onPress={() => handleSeek(false)} 
              style={[styles.skipButton, { backgroundColor: colors.elevated }]}
            >
              <Ionicons name="play-back" size={24} color={colors.textPrimary} />
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>10</Text>
            </Pressable>

            <Pressable
              style={[styles.playButton, { backgroundColor: colors.accent }]}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={isThisPlaying ? "pause" : "play"}
                size={32}
                color="#fff"
              />
            </Pressable>

            <Pressable 
              onPress={() => handleSeek(true)} 
              style={[styles.skipButton, { backgroundColor: colors.elevated }]}
            >
              <Ionicons name="play-forward" size={24} color={colors.textPrimary} />
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>10</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {tags.length > 0 && (
            <View style={[styles.tagsContainer, { gap: spacing.xs, marginBottom: spacing.md }]}>
              {tags.map((tag, index) => (
                <TagChip key={index} tag={tag} small />
              ))}
            </View>
          )}

          <View style={[styles.metadata, { gap: spacing.lg }]}>
            <View style={styles.metadataItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.metadataText, { color: colors.textTertiary }]}>
                {getRelativeTime(bookmark.created_at)}
              </Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Ionicons 
                name={bookmark.is_public ? "globe-outline" : "lock-closed-outline"} 
                size={14} 
                color={colors.textTertiary} 
              />
              <Text style={[styles.metadataText, { color: colors.textTertiary }]}>
                {bookmark.is_public ? "Public" : "Private"}
              </Text>
            </View>

            {onDelete && (
              <Pressable onPress={handleDelete} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  playerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    width: "100%",
    borderRadius: 16,
    gap: 4,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 8,
    maxHeight: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  time: {
    fontSize: 14,
  },
  progressContainer: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    marginBottom: 32,
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  skipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 10,
    fontWeight: "600",
    position: "absolute",
    bottom: 6,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
  },
  deleteButton: {
    marginLeft: "auto",
    padding: 4,
  },
});
