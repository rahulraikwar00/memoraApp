import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { createAudioPlayer } from 'expo-audio';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/useThemeStore';
import { Bookmark } from '../lib/db';
import TagChip from './TagChip';

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

const getContentLabel = (type: ContentType): string => {
  switch (type) {
    case 'image': return 'Image';
    case 'note': return 'Note';
    case 'voice': return 'Voice';
    default: return 'Link';
  }
};

interface BookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function BookmarkCard({ bookmark, onPress, onDelete, onTogglePublic }: BookmarkCardProps) {
  const { colors, spacing, borderRadius } = useThemeStore();
  const scale = useSharedValue(1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded) {
        if (status.playing) {
          setIsPlaying(true);
        } else if (status.currentTime > 0) {
          setIsPlaying(false);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          player.seekTo(0);
        }
      }
    });

    return () => {
      subscription.remove();
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

  const contentType = getContentType(bookmark);
  const tags = JSON.parse(bookmark.tags || '[]') as string[];
  const domain = bookmark.domain || (bookmark.url ? new URL(bookmark.url).hostname : '');
  const timeAgo = getRelativeTime(bookmark.created_at);

  const handlePlayVoice = async (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isPlaying && playerRef.current) {
      playerRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!bookmark.local_path) {
      console.log('No local_path found for voice:', bookmark.id);
      return;
    }

    try {
      console.log('Playing voice from:', bookmark.local_path);
      
      if (!playerRef.current) {
        playerRef.current = createAudioPlayer(bookmark.local_path);
      } else {
        playerRef.current.replace(bookmark.local_path);
      }
      
      playerRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.log('Playback error:', err);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleNotePress = (e: any) => {
    if (contentType !== 'note') return;
    e.stopPropagation();
    setShowNoteModal(true);
  };

  const handleCardPress = () => {
    if (contentType === 'voice') {
      return;
    }
    if (contentType === 'note') {
      setShowNoteModal(true);
      return;
    }
    onPress?.();
  };

  const renderContentPreview = () => {
    switch (contentType) {
      case 'voice':
        const durationMatch = bookmark.title?.match(/\((\d+:\d+)\)/);
        return (
          <View style={[styles.voicePreview, { backgroundColor: colors.elevated }]}>
            <Pressable 
              style={[styles.playButton, { backgroundColor: colors.accent }]}
              onPress={handlePlayVoice}
            >
              <Ionicons 
                name={isPlaying ? 'pause' : 'play'} 
                size={24} 
                color="#fff" 
              />
            </Pressable>
            <View style={styles.voiceInfo}>
              <Text style={[styles.voiceLabel, { color: colors.textSecondary }]}>
                Voice Note
              </Text>
              {durationMatch && (
                <Text style={[styles.voiceDuration, { color: colors.textTertiary }]}>
                  {durationMatch[1]}
                </Text>
              )}
            </View>
          </View>
        );
      
      case 'note':
        return (
          <Pressable onPress={handleNotePress}>
            <View style={[styles.notePreview, { backgroundColor: colors.elevated }]}>
              <Ionicons name="document-text" size={20} color={colors.textSecondary} />
              <Text style={[styles.notePreviewText, { color: colors.textSecondary }]} numberOfLines={2}>
                {bookmark.description || bookmark.title}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>
        );
      
      case 'image':
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
      
      default:
        return bookmark.image_url ? (
          <Image
            source={{ uri: bookmark.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : null;
    }
  };

  const renderDomainIcon = () => {
    if (contentType !== 'link') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name={getContentIcon(contentType)} size={12} color={colors.accent} />
          <Text style={[styles.typeBadgeText, { color: colors.accent }]}>
            {getContentLabel(contentType)}
          </Text>
        </View>
      );
    }

    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;
    return faviconUrl ? (
      <Image
        source={{ uri: faviconUrl }}
        style={styles.favicon}
        contentFit="contain"
      />
    ) : (
      <Ionicons name="globe-outline" size={12} color={colors.textTertiary} />
    );
  };

  return (
    <>
      <AnimatedPressable
        style={[styles.container, animatedStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Bookmark: ${bookmark.title || bookmark.url}`}
      >
        {renderContentPreview()}
        
        <View style={[styles.content, { padding: spacing.md }]}>
          <View style={styles.header}>
            <View style={styles.domainContainer}>
              {renderDomainIcon()}
              <Text style={[styles.domain, { color: colors.textTertiary }]} numberOfLines={1}>
                {contentType === 'link' ? domain : getContentLabel(contentType)}
              </Text>
            </View>
            <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo}</Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.xs }]} numberOfLines={2}>
            {bookmark.title || bookmark.url || 'Untitled'}
          </Text>

          {bookmark.description && contentType !== 'note' && (
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

      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Note</Text>
              <Pressable onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.noteText, { color: colors.textPrimary }]}>
                {bookmark.description || bookmark.title}
              </Text>
              {bookmark.description && (
                <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                  {bookmark.description.length} characters
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  voicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  voiceDuration: {
    fontSize: 13,
    marginTop: 2,
  },
  notePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  notePreviewText: {
    flex: 1,
    fontSize: 14,
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
    flex: 1,
  },
  favicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  domain: {
    fontSize: 13,
    fontWeight: '400',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 13,
    marginTop: 16,
    textAlign: 'right',
  },
});
