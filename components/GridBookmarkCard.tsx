import React, { useState, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import { useAudioStore } from "../stores/useAudioStore";
import { Bookmark } from "../lib/db";
import { getContentType, getContentIcon } from "../lib/types";
import TagChip from "./TagChip";
import CardActionMenu from "./CardActionMenu";

interface GridBookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onOpenLink?: () => void;
  onToggleFavorite?: () => void;
  onTogglePublic?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onCopyUrl?: () => void;
  onDelete?: () => void;
  onOpenNote?: () => void;
  onOpenImage?: () => void;
  variant?: "grid" | "feed";
  onSave?: () => void;
  isSaved?: boolean;
  onUpvote?: () => void;
  isUpvoted?: boolean;
  saveCount?: number;
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

function GridBookmarkCard({
  bookmark,
  onPress,
  onOpenLink,
  onToggleFavorite,
  onTogglePublic,
  onEdit,
  onShare,
  onCopyUrl,
  onDelete,
  onOpenNote,
  onOpenImage,
  variant = "grid",
  onSave,
  isSaved,
  onUpvote,
  isUpvoted,
  saveCount,
}: GridBookmarkCardProps) {
  const { colors, spacing } = useThemeStore();
  const isThisPlaying = useAudioStore(
    (state) => state.currentlyPlayingId === bookmark.id && state.isPlaying
  );
  const play = useAudioStore((state) => state.play);
  const stop = useAudioStore((state) => state.stop);
  const contentType = getContentType(bookmark);

  const CARD_WIDTH =
    (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;
  const scale = useSharedValue(1);

  const CARD_HEIGHT = CARD_HEIGHTS[contentType] || CARD_HEIGHTS.link;

  const [menuVisible, setMenuVisible] = useState(false);

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

    if (isThisPlaying) {
      await stop();
    } else {
      await play(bookmark.id, bookmark.local_path);
    }
  };

  const handleCardPress = () => {
    if (variant === "feed") {
      onPress?.();
      return;
    }
    switch (contentType) {
      case "voice":
        handleVoicePlay();
        break;
      case "note":
        onOpenNote?.();
        break;
      case "image":
        onOpenImage?.();
        break;
      case "link":
      default:
        onOpenLink?.();
        break;
    }
  };

  const handleOptionsPress = (e: any) => {
    e.stopPropagation();
    setMenuVisible(true);
  };

  const { tags, domain, faviconUrl } = useMemo(() => {
    const tags = JSON.parse(bookmark.tags || "[]") as string[];
    let domain = '';
    let faviconUrl = null;
    if (contentType === "link") {
      domain = bookmark.domain || (bookmark.url ? new URL(bookmark.url).hostname : "");
      faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
    }
    return { tags, domain, faviconUrl };
  }, [bookmark.tags, bookmark.url, bookmark.domain, contentType]);

  const handleVotePress = (e: any) => {
    e.stopPropagation();
  };

  const renderPreview = () => {
    if (contentType === "image") {
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

    if (contentType === "voice") {
      return (
        <View
          style={[styles.voicePreview, { backgroundColor: colors.elevated }]}
        >
          <Pressable
            style={[styles.playButton, { backgroundColor: colors.accent }]}
            onPress={handleVoicePlay}
          >
            <Ionicons
              name={isThisPlaying ? "pause" : "play"}
              size={20}
              color="#fff"
            />
          </Pressable>
          <View style={styles.voiceInfo}>
            <Text
              style={[styles.voiceTitle, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {bookmark.title?.replace(/\s*\(\d+:\d+\)/, "") || "Voice Note"}
            </Text>
            <Text style={[styles.voiceStatus, { color: colors.textTertiary }]}>
              {isThisPlaying ? "Playing..." : "Tap to play"}
            </Text>
          </View>
        </View>
      );
    }

    if (contentType === "note") {
      const noteText = bookmark.description || bookmark.title || "";
      const preview =
        noteText.length > 80 ? noteText.substring(0, 80) + "..." : noteText;
      return (
        <View
          style={[styles.notePreview, { backgroundColor: colors.elevated }]}
        >
          <Ionicons name="document-text" size={24} color={colors.accent} />
          <Text
            style={[styles.noteText, { color: colors.textSecondary }]}
            numberOfLines={3}
          >
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
            width: variant === "feed" ? "100%" : CARD_WIDTH,
            minHeight: variant === "feed" ? undefined : CARD_HEIGHT,
          },
        ]}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Bookmark: ${bookmark.title || bookmark.url}`}
      >
        {variant === "feed" ? (
          <View style={[styles.feedContent, { padding: spacing.md }]}>
            <View style={styles.feedHeader}>
              {faviconUrl ? (
                <Image source={{ uri: faviconUrl }} style={styles.feedFavicon} contentFit="contain" />
              ) : (
                <View style={[styles.feedTypeIcon, { backgroundColor: colors.accent + "20" }]}>
                  <Ionicons name={getContentIcon(contentType)} size={12} color={colors.accent} />
                </View>
              )}
              <Text style={[styles.feedDomain, { color: colors.textTertiary }]} numberOfLines={1}>
                {domain || getContentIcon(contentType)}
              </Text>
            </View>
            <Text style={[styles.feedTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {bookmark.title || bookmark.url || "Untitled"}
            </Text>
            {bookmark.description && (
              <Text style={[styles.feedDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {bookmark.description}
              </Text>
            )}
            <View style={[styles.feedActions, { borderTopColor: colors.border }]}>
              <View style={styles.feedStats}>
                <Text style={[styles.feedSaveCount, { color: colors.textTertiary }]}>
                  {saveCount || 0} saves
                </Text>
              </View>
              <View style={styles.feedButtons}>
                <Pressable onPress={(e) => { e.stopPropagation(); onUpvote?.(); }} style={styles.feedButton}>
                  <Ionicons name={isUpvoted ? "arrow-up" : "arrow-up-outline"} size={20} color={isUpvoted ? colors.accent : colors.textSecondary} />
                </Pressable>
                <Pressable onPress={(e) => { e.stopPropagation(); onSave?.(); }} style={styles.feedButton}>
                  <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? colors.accent : colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <>
            {renderPreview()}
            <View style={[styles.content, { padding: spacing.sm }]}>
              <View style={styles.header}>
                {contentType === "link" && faviconUrl ? (
                  <Image
                    source={{ uri: faviconUrl }}
                    style={styles.favicon}
                    contentFit="contain"
                  />
                ) : (
                  <View
                    style={[
                      styles.typeIcon,
                      { backgroundColor: colors.accent + "20" },
                    ]}
                  >
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
                  {contentType === "link" ? domain : getContentIcon(contentType)}
                </Text>
                <Ionicons
                  name={bookmark.is_public ? "globe-outline" : "lock-closed-outline"}
                  size={12}
                  color={colors.textTertiary}
                  style={styles.publicIcon}
                />
                <Pressable
                  onPress={handleOptionsPress}
                  style={styles.optionsButton}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={16}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </View>

              <Text
                style={[styles.title, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {bookmark.title || bookmark.url || "Untitled"}
              </Text>

              {tags.length > 0 && contentType !== "voice" && (
                <View style={[styles.tags, { gap: spacing.xs }]}>
                  {tags.slice(0, 2).map((tag, index) => (
                    <TagChip key={index} tag={tag} small />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </AnimatedPressable>

      {variant === "grid" && (
        <CardActionMenu
          visible={menuVisible}
          bookmark={bookmark}
          onClose={() => setMenuVisible(false)}
          onCopyUrl={onCopyUrl}
          onShare={onShare}
          onTogglePublic={onTogglePublic}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      )}
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
  publicIcon: {
    marginLeft: 2,
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
  feedContent: {
    gap: 8,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feedFavicon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  feedTypeIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  feedDomain: {
    fontSize: 12,
    flex: 1,
  },
  feedTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  feedDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  feedStats: {},
  feedSaveCount: {
    fontSize: 12,
  },
  feedButtons: {
    flexDirection: "row",
    gap: 16,
  },
  feedButton: {
    padding: 4,
  },
});

export default memo(GridBookmarkCard);