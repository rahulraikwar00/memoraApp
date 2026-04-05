import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Alert } from "react-native";
import { Image } from "expo-image";
import { Audio } from "expo-av";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import { Bookmark } from "../lib/db";
import { getContentType, getContentIcon } from "../lib/types";
import TagChip from "./TagChip";
import NoteReaderModal from "./NoteReaderModal";
import ImageViewerModal from "./ImageViewerModal";
import BookmarkOptionsModal from "./BookmarkOptionsModal";

interface GridBookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onOpenLink?: () => void;
  onTogglePublic?: () => void;
  onToggleFavorite?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onCopyUrl?: () => void;
  onDelete?: () => void;
  onVote?: () => void;
  isVoted?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 8;
const NUM_COLUMNS = 2;

const CARD_HEIGHTS = {
  voice: 80,
  note: 120,
  image: 200,
  link: 140,
};

export default function GridBookmarkCard({
  bookmark,
  onPress,
  onOpenLink,
  onTogglePublic,
  onToggleFavorite,
  onEdit,
  onShare,
  onCopyUrl,
  onDelete,
  onVote,
  isVoted,
}: GridBookmarkCardProps) {
  const { colors, spacing } = useThemeStore();
  const CARD_WIDTH =
    (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;
  const scale = useSharedValue(1);

  const contentType = getContentType(bookmark);
  const CARD_HEIGHT = CARD_HEIGHTS[contentType] || CARD_HEIGHTS.link;

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleVoicePlay = async () => {
    if (!bookmark.local_path) {
      Alert.alert("Error", "Audio file not found");
      return;
    }

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (soundRef.current && !isPlaying) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: bookmark.local_path },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            soundRef.current?.setPositionAsync(0);
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.error("Playback error:", err);
      Alert.alert("Error", "Failed to play audio");
    }
  };

  const handleCardPress = () => {
    switch (contentType) {
      case "voice":
        handleVoicePlay();
        break;
      case "note":
        setShowNoteModal(true);
        break;
      case "image":
        setShowImageModal(true);
        break;
      case "link":
      default:
        if (onPress) {
          onPress();
        } else {
          setShowOptionsModal(true);
        }
        break;
    }
  };

  const handleOptionsPress = (e: any) => {
    e.stopPropagation();
    setShowOptionsModal(true);
  };

  const tags = JSON.parse(bookmark.tags || "[]") as string[];
  const domain = contentType === 'link' 
    ? (bookmark.domain || (bookmark.url ? new URL(bookmark.url).hostname : ''))
    : '';

  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    : null;

  const handleVotePress = (e: any) => {
    e.stopPropagation();
    onVote?.();
  };

  const handleCopyPress = (e: any) => {
    e.stopPropagation();
    onCopyUrl?.();
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const renderPreview = () => {
    if (contentType === 'image') {
      const imageUri = bookmark.local_path || bookmark.image_url;
      if (!imageUri) return null;
      return (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      );
    }

    if (contentType === 'voice') {
      return (
        <View style={[styles.voicePreview, { backgroundColor: colors.elevated }]}>
          <Pressable
            style={[styles.playButton, { backgroundColor: colors.accent }]}
            onPress={handleVoicePlay}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="#fff"
            />
          </Pressable>
          <View style={styles.voiceInfo}>
            <Text style={[styles.voiceTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {bookmark.title?.replace(/\s*\(\d+:\d+\)/, "") || "Voice Note"}
            </Text>
            <Text style={[styles.voiceStatus, { color: colors.textTertiary }]}>
              {isPlaying ? "Playing..." : "Tap to play"}
            </Text>
          </View>
        </View>
      );
    }

    if (contentType === 'note') {
      const noteText = bookmark.description || bookmark.title || "";
      const preview = noteText.length > 80 ? noteText.substring(0, 80) + "..." : noteText;
      return (
        <View style={[styles.notePreview, { backgroundColor: colors.elevated }]}>
          <Ionicons name="document-text" size={24} color={colors.accent} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={3}>
            {preview}
          </Text>
        </View>
      );
    }

    if (bookmark.image_url) {
      return (
        <Image
          source={{ uri: bookmark.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      );
    }

    return null;
  };

  return (
    <>
      <AnimatedPressable
        style={[
          styles.container,
          animatedStyle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            width: CARD_WIDTH,
            minHeight: CARD_HEIGHT,
          },
        ]}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Bookmark: ${bookmark.title || bookmark.url}`}
      >
        {renderPreview()}
        <View style={[styles.content, { padding: spacing.sm }]}>
          <View style={styles.header}>
            {contentType === 'link' && faviconUrl ? (
              <Image
                source={{ uri: faviconUrl }}
                style={styles.favicon}
                contentFit="contain"
              />
            ) : (
              <View style={[styles.typeIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons 
                  name={getContentIcon(contentType)} 
                  size={10} 
                  color={colors.accent} 
                />
              </View>
            )}
            <Text
              style={[styles.domain, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {contentType === 'link' ? domain : getContentIcon(contentType)}
            </Text>
            <View style={styles.quickActions}>
              <Pressable onPress={handleCopyPress} style={styles.quickActionBtn}>
                <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
              </Pressable>
              <Pressable onPress={handleFavoritePress} style={styles.quickActionBtn}>
                <Ionicons 
                  name={bookmark.is_favorite ? "heart" : "heart-outline"} 
                  size={14} 
                  color={bookmark.is_favorite ? colors.accent : colors.textTertiary} 
                />
              </Pressable>
              <Pressable onPress={handleOptionsPress} style={styles.quickActionBtn}>
                <Ionicons name="ellipsis-horizontal" size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {bookmark.title || bookmark.url || 'Untitled'}
          </Text>

          {tags.length > 0 && contentType !== 'voice' && (
            <View style={[styles.tags, { gap: spacing.xs }]}>
              {tags.slice(0, 2).map((tag, index) => (
                <TagChip key={index} tag={tag} small />
              ))}
            </View>
          )}
        </View>
      </AnimatedPressable>

      <NoteReaderModal
        visible={showNoteModal}
        bookmark={bookmark}
        onClose={() => setShowNoteModal(false)}
        onEdit={onEdit}
        onShare={onShare}
        onTogglePublic={onTogglePublic}
        onDelete={onDelete}
      />

      <ImageViewerModal
        visible={showImageModal}
        bookmark={bookmark}
        onClose={() => setShowImageModal(false)}
        onTogglePublic={onTogglePublic}
        onDelete={onDelete}
      />

      <BookmarkOptionsModal
        visible={showOptionsModal}
        bookmark={bookmark}
        onClose={() => setShowOptionsModal(false)}
        onOpenLink={onOpenLink}
        onTogglePublic={onTogglePublic}
        onEdit={onEdit}
        onShare={onShare}
        onDelete={onDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: CARD_GAP,
    borderWidth: 1,
  },
  image: {
    width: "100%",
    height: 140,
  },
  voicePreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceInfo: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  voiceStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  notePreview: {
    padding: 12,
    gap: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
  },
  content: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  favicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  typeIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  domain: {
    fontSize: 11,
    fontWeight: "400",
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickActionBtn: {
    padding: 2,
  },
  optionsButton: {
    padding: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 6,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  voteButton: {
    padding: 2,
  },
});
