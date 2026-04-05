import React from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import { Bookmark } from "../lib/db";
import TagChip from "./TagChip";

type ContentType = 'link' | 'image' | 'note' | 'voice';

const getContentType = (bookmark: Bookmark): ContentType => {
  if (bookmark.domain === 'local-image') return 'image';
  if (bookmark.domain === 'local-note') return 'note';
  if (bookmark.domain === 'local-voice') return 'voice';
  return 'link';
};

const getContentIcon = (type: ContentType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'image': return 'image';
    case 'note': return 'document-text';
    case 'voice': return 'mic';
    default: return 'globe-outline';
  }
};

interface GridBookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onVote?: () => void;
  isVoted?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 8;
const NUM_COLUMNS = 2;

export default function GridBookmarkCard({
  bookmark,
  onPress,
  onVote,
  isVoted,
}: GridBookmarkCardProps) {
  const { colors, spacing } = useThemeStore();
  const CARD_WIDTH =
    (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const contentType = getContentType(bookmark);
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

    if (contentType === 'voice' || contentType === 'note') {
      return (
        <View style={[styles.typePreview, { backgroundColor: colors.elevated }]}>
          <Ionicons 
            name={getContentIcon(contentType)} 
            size={32} 
            color={colors.textTertiary} 
          />
          {contentType === 'voice' && bookmark.title && (
            <Text style={[styles.typePreviewText, { color: colors.textSecondary }]} numberOfLines={1}>
              {bookmark.title}
            </Text>
          )}
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
    <AnimatedPressable
      style={[
        styles.container,
        animatedStyle,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          width: CARD_WIDTH,
        },
      ]}
      onPress={onPress}
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
          {onVote && (
            <Pressable onPress={handleVotePress} style={styles.voteButton}>
              <Ionicons
                name={isVoted ? "heart" : "heart-outline"}
                size={16}
                color={isVoted ? colors.danger : colors.textTertiary}
              />
            </Pressable>
          )}
        </View>

        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {bookmark.title || bookmark.url || 'Untitled'}
        </Text>

        {tags.length > 0 && (
          <View style={[styles.tags, { gap: spacing.xs }]}>
            {tags.slice(0, 2).map((tag, index) => (
              <TagChip key={index} tag={tag} small />
            ))}
          </View>
        )}
      </View>
    </AnimatedPressable>
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
    height: 120,
  },
  typePreview: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  typePreviewText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 8,
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
