import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/useThemeStore';
import { Bookmark } from '../lib/db';
import TagChip from './TagChip';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function BookmarkCard({ bookmark, onPress, onDelete, onTogglePublic }: BookmarkCardProps) {
  const { colors, spacing, typography, borderRadius } = useThemeStore();
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
  const domain = bookmark.domain || new URL(bookmark.url).hostname;
  const timeAgo = getRelativeTime(bookmark.created_at);

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
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
      <View style={[styles.content, { padding: spacing.md }]}>
        <View style={styles.header}>
          <View style={styles.domainContainer}>
            <Ionicons name="globe-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.domain, { color: colors.textTertiary }]}>{domain}</Text>
          </View>
          <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo}</Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.xs }]} numberOfLines={2}>
          {bookmark.title || bookmark.url}
        </Text>

        {bookmark.description && (
          <Text style={[styles.description, { color: colors.textSecondary, marginBottom: spacing.sm }]} numberOfLines={2}>
            {bookmark.description}
          </Text>
        )}

        {tags.length > 0 && (
          <View style={[styles.tags, { gap: spacing.xs, marginBottom: spacing.sm }]}>
            {tags.slice(0, 4).map((tag, index) => (
              <TagChip key={index} tag={tag} small />
            ))}
          </View>
        )}

        <View style={styles.footer}>
          {bookmark.is_public ? (
            <View style={[styles.publicBadge, { backgroundColor: 'rgba(108, 99, 255, 0.15)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.pill }]}>
              <Ionicons name="earth" size={12} color={colors.accent} />
              <Text style={[styles.publicText, { color: colors.accent }]}>Public</Text>
            </View>
          ) : (
            <View style={[styles.privateBadge, { backgroundColor: 'rgba(85, 85, 85, 0.3)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.pill }]}>
              <Ionicons name="lock-closed" size={12} color={colors.textTertiary} />
              <Text style={[styles.privateText, { color: colors.textTertiary }]}>Private</Text>
            </View>
          )}

          <View style={[styles.actions, { gap: spacing.sm }]}>
            {onTogglePublic && (
              <Pressable onPress={onTogglePublic} style={styles.actionButton}>
                <Ionicons 
                  name={bookmark.is_public ? 'globe-outline' : 'lock-closed-outline'} 
                  size={18} 
                  color={colors.textSecondary} 
                />
              </Pressable>
            )}
            {onDelete && (
              <Pressable onPress={onDelete} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
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

  if (months > 0) return `${months}mo`;
  if (weeks > 0) return `${weeks}w`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  domainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  domain: {
    fontSize: 13,
    fontWeight: '400',
  },
  time: {
    fontSize: 13,
    fontWeight: '400',
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  publicText: {
    fontSize: 11,
    fontWeight: '500',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
  },
});
