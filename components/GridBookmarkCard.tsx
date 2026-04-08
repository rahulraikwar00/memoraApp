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
  isHero?: boolean;
  isHighlighted?: boolean;
  showActiveRecall?: boolean;
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

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
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
  isHero,
  isHighlighted,
  showActiveRecall,
}: GridBookmarkCardProps) {
  const { colors, spacing, typography } = useThemeStore();
  const CARD_WIDTH = isHero
    ? SCREEN_WIDTH - spacing.lg * 2
    : (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const scale = useSharedValue(1);

  const contentType = getContentType(bookmark);
  const CARD_HEIGHT = isHero 
    ? 220 
    : CARD_HEIGHTS[contentType] || CARD_HEIGHTS.link;

  const { currentlyPlayingId, isPlaying: globalIsPlaying, position, duration, seekTo } = useAudioStore();
  const isCurrentlyPlaying = currentlyPlayingId === bookmark.id;
  const isPlaying = isCurrentlyPlaying && globalIsPlaying;
  const isThisPlaying = currentlyPlayingId === bookmark.id;

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: isHighlighted ? withSpring(0.3) : withSpring(0.1),
    shadowRadius: isHighlighted ? withSpring(10) : withSpring(4),
    shadowColor: isHighlighted ? colors.accent : colors.textPrimary,
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
    if (showActiveRecall) return (
      <View style={[styles.activeRecallPlaceholder, { backgroundColor: colors.accent + '10', height: isHero ? 140 : 80 }]}>
        <Ionicons name="help-circle-outline" size={32} color={colors.accent} />
        <Text style={[styles.activeRecallText, { color: colors.accent }]}>Tap to Reveal</Text>
      </View>
    );

    if (contentType === 'image') {
      const imageUri = bookmark.local_path || bookmark.image_url;
      if (!imageUri) return null;
      return (
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { height: isHero ? 200 : 160 }]}
          contentFit="cover"
          transition={200}
        />
      );
    }

    if (contentType === 'voice') {
      return null;
    }

    if (contentType === 'note') {
      return null;
    }

    if (bookmark.image_url) {
      return (
        <Image
          source={{ uri: bookmark.image_url }}
          style={[styles.image, { height: isHero ? 200 : 160 }]}
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
            borderColor: isHighlighted ? colors.accent : colors.border,
            width: CARD_WIDTH,
            minHeight: CARD_HEIGHT,
            borderWidth: isHighlighted ? 2 : 1,
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
            {!showActiveRecall && (contentType === 'link' && faviconUrl ? (
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
            ))}
            <Text
              style={[styles.domain, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {contentType === 'link' ? domain : getContentLabel(contentType)}
            </Text>
            
            {saveCount !== undefined && saveCount >= 5 && (
              <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>
                  {saveCount >= 20 ? '🔥 HOT' : '📈 TRENDING'}
                </Text>
              </View>
            )}

            <View style={styles.timestampContainer}>
              <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                {formatTimestamp(bookmark.created_at)}
              </Text>
            </View>
          </View>
          
          <View style={styles.titleContainer}>
            {contentType === 'voice' && !showActiveRecall && (
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
              style={[
                styles.title, 
                { color: colors.textPrimary },
                isHero && { fontSize: 18, lineHeight: 24, fontWeight: '700' },
                showActiveRecall && { color: colors.textTertiary, fontStyle: 'italic' }
              ]}
              numberOfLines={isHero ? 3 : 2}
            >
              {showActiveRecall ? 'Active Recall Hidden' : (bookmark.title || bookmark.url || 'Untitled')}
            </Text>
          </View>

          {contentType === 'voice' && isThisPlaying && duration > 0 && (
            <View 
              style={[styles.progressBarContainer, { marginTop: spacing.xs }]}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const { locationX } = e.nativeEvent;
                const barWidth = CARD_WIDTH - spacing.sm * 2;
                const newPosition = (locationX / barWidth) * duration;
                seekTo(Math.max(0, Math.min(duration, newPosition)));
              }}
            >
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${(position / duration) * 100}%`, 
                      backgroundColor: colors.accent 
                    }
                  ]} 
                />
              </View>
            </View>
          )}

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
  progressBarContainer: {
    height: 20,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timestampContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '400',
  },
  activeRecallPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeRecallText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
