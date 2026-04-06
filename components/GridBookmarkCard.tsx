import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Alert } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeStore } from "../stores/useThemeStore";
import { useAudioStore } from "../stores/useAudioStore";
import { Bookmark } from "../lib/db";
import { getContentType, getContentIcon, getContentLabel } from "../lib/types";
import TagChip from "./TagChip";
import NoteReaderModal from "./NoteReaderModal";
import ImageViewerModal from "./ImageViewerModal";
import BookmarkOptionsModal from "./BookmarkOptionsModal";

interface GridBookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onOpenLink?: () => void;
  onTogglePublic?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onCopyUrl?: () => void;
  onDelete?: () => void;
  onVote?: () => void;
  onVoicePlay?: (bookmark: Bookmark) => void;
  onLongPress?: (event?: any) => void;
  onLayout?: (event: any) => void;
  isVoted?: boolean;
  variant?: "feed" | "default";
  onUpvote?: () => void;
  onReport?: () => void;
  onSave?: () => void;
  isUpvoted?: boolean;
  isSaved?: boolean;
  saveCount?: number;
  showShareInHeader?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 8;
const NUM_COLUMNS = 2;

const CARD_HEIGHTS = {
  voice: 80,
  note: 100,
  image: 200,
  link: 120,
};

export default function GridBookmarkCard({
  bookmark,
  onPress,
  onOpenLink,
  onTogglePublic,
  onEdit,
  onShare,
  onCopyUrl,
  onDelete,
  onVote,
  onVoicePlay,
  onLongPress,
  onLayout,
  isVoted,
  variant = "default",
  onUpvote,
  onReport,
  onSave,
  isUpvoted,
  isSaved,
  saveCount,
  showShareInHeader,
}: GridBookmarkCardProps) {
  const { colors, spacing } = useThemeStore();
  const CARD_WIDTH =
    (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;
  const scale = useSharedValue(1);

  const contentType = getContentType(bookmark);
  const CARD_HEIGHT = CARD_HEIGHTS[contentType] || CARD_HEIGHTS.link;

  const { currentlyPlayingId, isPlaying: globalIsPlaying } = useAudioStore();
  const isCurrentlyPlaying = currentlyPlayingId === bookmark.id;
  const isPlaying = isCurrentlyPlaying && globalIsPlaying;

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleVoicePlay = () => {
    if (!bookmark.local_path) {
      Alert.alert("Error", "Audio file not found");
      return;
    }
    onVoicePlay?.(bookmark);
  };

  const handleCardPress = () => {
    switch (contentType) {
      case "image":
        setShowImageModal(true);
        break;
      case "note":
        setShowNoteModal(true);
        break;
      case "link":
        onOpenLink?.();
        break;
      case "voice":
        if (onPress) {
          onPress();
        } else {
          setShowOptionsModal(true);
        }
        break;
      default:
        setShowOptionsModal(true);
        break;
    }
  };

  const handleLongPress = (event?: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onLongPress) {
      onLongPress(event);
    } else {
      setShowOptionsModal(true);
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
      return null; // Removed redundant voice preview, controls are now in main body
    }

    if (contentType === 'note') {
      return null; // Removed redundant note preview, title/icon in header is enough
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
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLayout={onLayout}
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
              {contentType === 'link' ? domain : getContentLabel(contentType)}
            </Text>
            {variant === 'feed' && showShareInHeader && onShare && (
              <Pressable
                style={styles.headerShareButton}
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onShare();
                }}
              >
                <Ionicons
                  name="share-outline"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}
          </View>
          
          <View style={styles.titleContainer}>
            {contentType === 'voice' && (
              <Pressable
                style={[styles.miniPlayButton, { backgroundColor: colors.accent }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleVoicePlay();
                }}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={14}
                  color="#fff"
                />
              </Pressable>
            )}
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {bookmark.title || bookmark.url || 'Untitled'}
            </Text>
          </View>

          {tags.length > 0 && contentType !== 'voice' && (
            <View style={[styles.tags, { gap: spacing.xs }]}>
              {tags.slice(0, 2).map((tag, index) => (
                <TagChip key={index} tag={tag} small />
              ))}
            </View>
          )}

          {variant === 'feed' && (
            <View style={styles.feedFooter}>
              <View style={styles.saveCountContainer}>
                <Ionicons
                  name="bookmark-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.saveCountText, { color: colors.textSecondary }]}>
                  {saveCount || 0}
                </Text>
              </View>

              {onSave && (
                <Pressable
                  style={[styles.saveButton, {
                    backgroundColor: isSaved ? colors.accent : colors.card,
                    borderColor: isSaved ? colors.accent : colors.border,
                  }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.notificationAsync(isSaved ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
                    onSave();
                  }}
                >
                  <Ionicons
                    name={isSaved ? "bookmark" : "bookmark-outline"}
                    size={16}
                    color={isSaved ? '#fff' : colors.textPrimary}
                  />
                </Pressable>
              )}
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
    height: 160,
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
  headerShareButton: {
    padding: 4,
    borderRadius: 6,
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
  optionsButton: {
    padding: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniPlayButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    flex: 1,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  feedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  saveCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  saveCountText: {
    fontSize: 12,
    fontWeight: "500",
  },
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  voteButton: {
    padding: 2,
  },
});
