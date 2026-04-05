import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemeStore } from '../stores/useThemeStore';
import { Bookmark } from '../lib/db';
import TagChip from './TagChip';

interface GridBookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 8;
const NUM_COLUMNS = 2;

export default function GridBookmarkCard({ bookmark, onPress }: GridBookmarkCardProps) {
  const { colors, spacing } = useThemeStore();
  const CARD_WIDTH = (SCREEN_WIDTH - (spacing.lg * 2) - (CARD_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
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

  const tags = JSON.parse(bookmark.tags || '[]') as string[];
  const domain = bookmark.domain || (() => { try { return new URL(bookmark.url).hostname; } catch { return ''; } })();

  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  return (
    <AnimatedPressable
      style={[
        styles.container, 
        animatedStyle, 
        { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH }
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`Bookmark: ${bookmark.title || bookmark.url}`}
    >
      {bookmark.image_url && (
        <Image
          source={{ uri: bookmark.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      )}
      <View style={[styles.content, { padding: spacing.sm }]}>
        <View style={styles.header}>
          {faviconUrl ? (
            <Image
              source={{ uri: faviconUrl }}
              style={styles.favicon}
              contentFit="contain"
            />
          ) : null}
          <Text style={[styles.domain, { color: colors.textTertiary }]} numberOfLines={1}>
            {domain}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {bookmark.title || bookmark.url}
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
    overflow: 'hidden',
    marginBottom: CARD_GAP,
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: 120,
  },
  content: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  favicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  domain: {
    fontSize: 11,
    fontWeight: '400',
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 6,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});