// import React, { useState, useEffect, useRef } from 'react';
// import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
// import { Image } from 'expo-image';
// import { createAudioPlayer } from 'expo-audio';
// import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
// import { Ionicons } from '@expo/vector-icons';
// import { useThemeStore } from '../stores/useThemeStore';
// import { Bookmark } from '../lib/db';
// import TagChip from './TagChip';

// type ContentType = 'link' | 'image' | 'note' | 'voice';

// const getContentType = (bookmark: Bookmark): ContentType => {
//   if (bookmark.domain === 'local-image') return 'image';
//   if (bookmark.domain === 'local-note') return 'note';
//   if (bookmark.domain === 'local-voice') return 'voice';
//   return 'link';
// };

// const getContentIcon = (type: ContentType): keyof typeof Ionicons.glyphMap => {
//   switch (type) {
//     case 'image': return 'image';
//     case 'note': return 'document-text';
//     case 'voice': return 'mic';
//     default: return 'globe-outline';
//   }
// };

// const getContentLabel = (type: ContentType): string => {
//   switch (type) {
//     case 'image': return 'Image';
//     case 'note': return 'Note';
//     case 'voice': return 'Voice';
//     default: return 'Link';
//   }
// };

// interface BookmarkCardProps {
//   bookmark: Bookmark;
//   onPress?: () => void;
//   onDelete?: () => void;
//   onTogglePublic?: () => void;
// }

// const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// export default function BookmarkCard({ bookmark, onPress, onDelete, onTogglePublic }: BookmarkCardProps) {
//   const { colors, spacing, borderRadius } = useThemeStore();
//   const scale = useSharedValue(1);

//   const [isPlaying, setIsPlaying] = useState(false);
//   const [showNoteModal, setShowNoteModal] = useState(false);
//   const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

//   useEffect(() => {
//     const player = playerRef.current;
//     if (!player) return;

//     const subscription = player.addListener('playbackStatusUpdate', (status) => {
//       if (status.isLoaded) {
//         if (status.playing) {
//           setIsPlaying(true);
//         } else if (status.currentTime > 0) {
//           setIsPlaying(false);
//         }
//         if (status.didJustFinish) {
//           setIsPlaying(false);
//           player.seekTo(0);
//         }
//       }
//     });

//     return () => {
//       subscription.remove();
//     };
//   }, []);

//   const animatedStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: scale.value }],
//   }));

//   const handlePressIn = () => {
//     scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
//   };

//   const handlePressOut = () => {
//     scale.value = withSpring(1, { damping: 15, stiffness: 300 });
//   };

//   const contentType = getContentType(bookmark);
//   const tags = JSON.parse(bookmark.tags || '[]') as string[];
//   const domain = bookmark.domain || (bookmark.url ? new URL(bookmark.url).hostname : '');
//   const timeAgo = getRelativeTime(bookmark.created_at);

//   const handlePlayVoice = async (e: any) => {
//     e.stopPropagation();
//     e.preventDefault();

//     if (isPlaying && playerRef.current) {
//       playerRef.current.pause();
//       setIsPlaying(false);
//       return;
//     }

//     if (!bookmark.local_path) {
//       console.log('No local_path found for voice:', bookmark.id);
//       return;
//     }

//     try {
//       console.log('Playing voice from:', bookmark.local_path);

//       if (!playerRef.current) {
//         playerRef.current = createAudioPlayer(bookmark.local_path);
//       } else {
//         playerRef.current.replace(bookmark.local_path);
//       }

//       playerRef.current.play();
//       setIsPlaying(true);
//     } catch (err) {
//       console.log('Playback error:', err);
//       Alert.alert('Error', 'Failed to play audio');
//     }
//   };

//   const handleNotePress = (e: any) => {
//     if (contentType !== 'note') return;
//     e.stopPropagation();
//     setShowNoteModal(true);
//   };

//   const handleCardPress = () => {
//     if (contentType === 'voice') {
//       return;
//     }
//     if (contentType === 'note') {
//       setShowNoteModal(true);
//       return;
//     }
//     onPress?.();
//   };

//   const renderContentPreview = () => {
//     switch (contentType) {
//       case 'voice':
//         const durationMatch = bookmark.title?.match(/\((\d+:\d+)\)/);
//         return (
//           <View style={[styles.voicePreview, { backgroundColor: colors.elevated }]}>
//             <Pressable
//               style={[styles.playButton, { backgroundColor: colors.accent }]}
//               onPress={handlePlayVoice}
//             >
//               <Ionicons
//                 name={isPlaying ? 'pause' : 'play'}
//                 size={24}
//                 color="#fff"
//               />
//             </Pressable>
//             <View style={styles.voiceInfo}>
//               <Text style={[styles.voiceLabel, { color: colors.textSecondary }]}>
//                 Voice Note
//               </Text>
//               {durationMatch && (
//                 <Text style={[styles.voiceDuration, { color: colors.textTertiary }]}>
//                   {durationMatch[1]}
//                 </Text>
//               )}
//             </View>
//           </View>
//         );

//       case 'note':
//         return (
//           <Pressable onPress={handleNotePress}>
//             <View style={[styles.notePreview, { backgroundColor: colors.elevated }]}>
//               <Ionicons name="document-text" size={20} color={colors.textSecondary} />
//               <Text style={[styles.notePreviewText, { color: colors.textSecondary }]} numberOfLines={2}>
//                 {bookmark.description || bookmark.title}
//               </Text>
//               <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
//             </View>
//           </Pressable>
//         );

//       case 'image':
//         const imageUri = bookmark.local_path || bookmark.image_url;
//         if (!imageUri) return null;
//         return (
//           <Image
//             source={{ uri: imageUri }}
//             style={styles.image}
//             contentFit="cover"
//             transition={200}
//           />
//         );

//       default:
//         return bookmark.image_url ? (
//           <Image
//             source={{ uri: bookmark.image_url }}
//             style={styles.image}
//             contentFit="cover"
//             transition={200}
//           />
//         ) : null;
//     }
//   };

//   const renderDomainIcon = () => {
//     if (contentType !== 'link') {
//       return (
//         <View style={[styles.typeBadge, { backgroundColor: colors.accent + '20' }]}>
//           <Ionicons name={getContentIcon(contentType)} size={12} color={colors.accent} />
//           <Text style={[styles.typeBadgeText, { color: colors.accent }]}>
//             {getContentLabel(contentType)}
//           </Text>
//         </View>
//       );
//     }

//     const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;
//     return faviconUrl ? (
//       <Image
//         source={{ uri: faviconUrl }}
//         style={styles.favicon}
//         contentFit="contain"
//       />
//     ) : (
//       <Ionicons name="globe-outline" size={12} color={colors.textTertiary} />
//     );
//   };

//   return (
//     <>
//       <AnimatedPressable
//         style={[styles.container, animatedStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
//         onPress={handleCardPress}
//         onPressIn={handlePressIn}
//         onPressOut={handlePressOut}
//         accessibilityLabel={`Bookmark: ${bookmark.title || bookmark.url}`}
//       >
//         {renderContentPreview()}

//         <View style={[styles.content, { padding: spacing.md }]}>
//           <View style={styles.header}>
//             <View style={styles.domainContainer}>
//               {renderDomainIcon()}
//               <Text style={[styles.domain, { color: colors.textTertiary }]} numberOfLines={1}>
//                 {contentType === 'link' ? domain : getContentLabel(contentType)}
//               </Text>
//             </View>
//             <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo}</Text>
//           </View>

//           <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.xs }]} numberOfLines={2}>
//             {bookmark.title || bookmark.url || 'Untitled'}
//           </Text>

//           {bookmark.description && contentType !== 'note' && (
//             <Text style={[styles.description, { color: colors.textSecondary, marginBottom: spacing.sm }]} numberOfLines={2}>
//               {bookmark.description}
//             </Text>
//           )}

//           {tags.length > 0 && (
//             <View style={[styles.tags, { gap: spacing.xs, marginBottom: spacing.sm }]}>
//               {tags.slice(0, 4).map((tag, index) => (
//                 <TagChip key={index} tag={tag} small />
//               ))}
//             </View>
//           )}

//           <View style={styles.footer}>
//             {bookmark.is_public ? (
//               <View style={[styles.publicBadge, { backgroundColor: 'rgba(108, 99, 255, 0.15)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.pill }]}>
//                 <Ionicons name="earth" size={12} color={colors.accent} />
//                 <Text style={[styles.publicText, { color: colors.accent }]}>Public</Text>
//               </View>
//             ) : (
//               <View style={[styles.privateBadge, { backgroundColor: 'rgba(85, 85, 85, 0.3)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.pill }]}>
//                 <Ionicons name="lock-closed" size={12} color={colors.textTertiary} />
//                 <Text style={[styles.privateText, { color: colors.textTertiary }]}>Private</Text>
//               </View>
//             )}

//             <View style={[styles.actions, { gap: spacing.sm }]}>
//               {onTogglePublic && (
//                 <Pressable onPress={onTogglePublic} style={styles.actionButton}>
//                   <Ionicons
//                     name={bookmark.is_public ? 'globe-outline' : 'lock-closed-outline'}
//                     size={18}
//                     color={colors.textSecondary}
//                   />
//                 </Pressable>
//               )}
//               {onDelete && (
//                 <Pressable onPress={onDelete} style={styles.actionButton}>
//                   <Ionicons name="trash-outline" size={18} color={colors.danger} />
//                 </Pressable>
//               )}
//             </View>
//           </View>
//         </View>
//       </AnimatedPressable>

//       <Modal
//         visible={showNoteModal}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowNoteModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
//             <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
//               <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Note</Text>
//               <Pressable onPress={() => setShowNoteModal(false)}>
//                 <Ionicons name="close" size={24} color={colors.textSecondary} />
//               </Pressable>
//             </View>
//             <ScrollView style={styles.modalBody}>
//               <Text style={[styles.noteText, { color: colors.textPrimary }]}>
//                 {bookmark.description || bookmark.title}
//               </Text>
//               {bookmark.description && (
//                 <Text style={[styles.charCount, { color: colors.textTertiary }]}>
//                   {bookmark.description.length} characters
//                 </Text>
//               )}
//             </ScrollView>
//           </View>
//         </View>
//       </Modal>
//     </>
//   );
// }

// function getRelativeTime(timestamp: number): string {
//   const now = Date.now();
//   const diff = now - timestamp;
//   const seconds = Math.floor(diff / 1000);
//   const minutes = Math.floor(seconds / 60);
//   const hours = Math.floor(minutes / 60);
//   const days = Math.floor(hours / 24);
//   const weeks = Math.floor(days / 7);
//   const months = Math.floor(days / 30);

//   if (months > 0) return `${months}mo`;
//   if (weeks > 0) return `${weeks}w`;
//   if (days > 0) return `${days}d`;
//   if (hours > 0) return `${hours}h`;
//   if (minutes > 0) return `${minutes}m`;
//   return 'now';
// }

// const styles = StyleSheet.create({
//   container: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginBottom: 12,
//     borderWidth: 1,
//   },
//   image: {
//     width: '100%',
//     height: 140,
//   },
//   voicePreview: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     gap: 12,
//   },
//   playButton: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   voiceInfo: {
//     flex: 1,
//   },
//   voiceLabel: {
//     fontSize: 15,
//     fontWeight: '500',
//   },
//   voiceDuration: {
//     fontSize: 13,
//     marginTop: 2,
//   },
//   notePreview: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     gap: 8,
//   },
//   notePreviewText: {
//     flex: 1,
//     fontSize: 14,
//   },
//   content: {},
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   domainContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     flex: 1,
//   },
//   favicon: {
//     width: 14,
//     height: 14,
//     borderRadius: 2,
//   },
//   domain: {
//     fontSize: 13,
//     fontWeight: '400',
//   },
//   typeBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 8,
//   },
//   typeBadgeText: {
//     fontSize: 11,
//     fontWeight: '500',
//   },
//   time: {
//     fontSize: 13,
//     fontWeight: '400',
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: '500',
//   },
//   description: {
//     fontSize: 15,
//     fontWeight: '400',
//   },
//   tags: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//   },
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 4,
//   },
//   publicBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   publicText: {
//     fontSize: 11,
//     fontWeight: '500',
//   },
//   privateBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   privateText: {
//     fontSize: 11,
//     fontWeight: '500',
//   },
//   actions: {
//     flexDirection: 'row',
//   },
//   actionButton: {
//     padding: 4,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'flex-end',
//   },
//   modalContent: {
//     maxHeight: '80%',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//   },
//   modalBody: {
//     padding: 16,
//   },
//   noteText: {
//     fontSize: 16,
//     lineHeight: 24,
//   },
//   charCount: {
//     fontSize: 13,
//     marginTop: 16,
//     textAlign: 'right',
//   },
// });

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getContentType, getContentIcon, getContentLabel } from "../lib/types";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Bookmark } from "../lib/db";
import { useThemeStore } from "../stores/useThemeStore";
import TagChip from "./TagChip";
import NoteReaderModal from "./NoteReaderModal";
import ImageViewerModal from "./ImageViewerModal";
import AudioPlayerModal from "./AudioPlayerModal";
import BookmarkOptionsModal from "./BookmarkOptionsModal";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onPress?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
  onOpenLink?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onCopyUrl?: () => void;
  variant?: "default" | "compact" | "grid";
  showFullContent?: boolean;
  hideActions?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Audio Waveform Component
const AudioWaveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const { colors } = useThemeStore();
  const bars = [0.3, 0.6, 0.9, 0.7, 0.4, 0.8, 0.5, 0.6];

  return (
    <View style={styles.waveformContainer}>
      {bars.map((height, index) => (
        <WaveformBar
          key={index}
          height={height}
          isPlaying={isPlaying}
          index={index}
          color={colors.accent}
        />
      ))}
    </View>
  );
};

const WaveformBar = ({
  height,
  isPlaying,
  index,
  color,
}: {
  height: number;
  isPlaying: boolean;
  index: number;
  color: string;
}) => {
  const animatedHeight = useSharedValue(0.2);

  useEffect(() => {
    if (isPlaying) {
      animatedHeight.value = withRepeat(
        withTiming(height, {
          duration: 300 + index * 50,
        }),
        -1,
        true,
      );
    } else {
      animatedHeight.value = withTiming(0.2, { duration: 200 });
    }
  }, [isPlaying, height, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${animatedHeight.value * 100}%`,
  }));

  return (
    <Animated.View
      style={[styles.waveformBar, { backgroundColor: color }, animatedStyle]}
    />
  );
};

export default function BookmarkCard({
  bookmark,
  onPress,
  onDelete,
  onTogglePublic,
  onOpenLink,
  onEdit,
  onShare,
  onCopyUrl,
}: BookmarkCardProps) {
  const { colors, spacing, borderRadius } = useThemeStore();
  const scale = useSharedValue(1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
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

  const contentType = getContentType(bookmark);
  const tags = JSON.parse(bookmark.tags || "[]") as string[];
  const domain =
    bookmark.domain || (bookmark.url ? new URL(bookmark.url).hostname : "");
  const timeAgo = getRelativeTime(bookmark.created_at);

  const handlePlayVoice = async (e: any) => {
    e.stopPropagation();
    e.preventDefault();

    if (!bookmark.local_path) {
      Alert.alert("Error", "Audio file not found");
      return;
    }

    try {
      // If already playing, pause
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // If sound exists but paused, resume
      if (soundRef.current && !isPlaying) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      // Load and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: bookmark.local_path },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.durationMillis) {
              setDuration(status.durationMillis);
            }
            if (status.positionMillis !== undefined) {
              setPosition(status.positionMillis);
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        },
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.error("Playback error:", err);
      Alert.alert("Error", "Failed to play audio");
    }
  };

  const handleNotePress = (e: any) => {
    if (contentType !== "note") return;
    e.stopPropagation();
    setShowNoteModal(true);
  };

  const handleImagePress = (e: any) => {
    if (contentType !== "image") return;
    e.stopPropagation();
    setShowImageModal(true);
  };

  const handleVoicePress = (e: any) => {
    if (contentType !== "voice") return;
    e.stopPropagation();
    setShowAudioModal(true);
  };

  const handleCardPress = () => {
    switch (contentType) {
      case "voice":
        setShowAudioModal(true);
        break;
      case "note":
        setShowNoteModal(true);
        break;
      case "image":
        setShowImageModal(true);
        break;
      case "link":
      default:
        setShowOptionsModal(true);
        break;
    }
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderContentPreview = () => {
    switch (contentType) {
      case "voice":
        return (
          <View
            style={[
              styles.voiceContainer,
              { backgroundColor: colors.elevated },
            ]}
          >
            <Pressable
              style={[styles.playButton, { backgroundColor: colors.accent }]}
              onPress={handlePlayVoice}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={22}
                color="#fff"
              />
            </Pressable>

            <View style={styles.voiceContent}>
              <View style={styles.voiceHeader}>
                <Text
                  style={[styles.voiceTitle, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {bookmark.title?.replace(/\s*\(\d+:\d+\)/, "") ||
                    "Voice Note"}
                </Text>
                <Text
                  style={[styles.voiceTime, { color: colors.textTertiary }]}
                >
                  {formatTime(position)} / {formatTime(duration)}
                </Text>
              </View>

              <AudioWaveform isPlaying={isPlaying} />
            </View>
          </View>
        );

      case "note":
        const noteText = bookmark.description || bookmark.title || "";
        const previewLength = 120;
        const preview =
          noteText.length > previewLength
            ? noteText.substring(0, previewLength) + "..."
            : noteText;

        return (
          <Pressable onPress={handleNotePress}>
            <View
              style={[
                styles.noteContainer,
                { backgroundColor: colors.elevated },
              ]}
            >
              <View style={styles.noteHeader}>
                <View
                  style={[
                    styles.noteIconBadge,
                    { backgroundColor: colors.accent + "20" },
                  ]}
                >
                  <Ionicons
                    name="document-text"
                    size={16}
                    color={colors.accent}
                  />
                </View>
                <Text
                  style={[styles.noteLabel, { color: colors.textSecondary }]}
                >
                  Note
                </Text>
              </View>
              <Text
                style={[styles.notePreviewText, { color: colors.textPrimary }]}
                numberOfLines={3}
              >
                {preview}
              </Text>
              <View style={styles.noteFooter}>
                <Text
                  style={[styles.charCount, { color: colors.textTertiary }]}
                >
                  {noteText.length} characters
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            </View>
          </Pressable>
        );

      case "image":
        const imageUri = bookmark.local_path || bookmark.image_url;
        if (!imageUri) return null;
        return (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          </View>
        );

      default:
        // Link with optional image
        if (bookmark.image_url) {
          return (
            <View style={styles.linkImageContainer}>
              <Image
                source={{ uri: bookmark.image_url }}
                style={styles.linkImage}
                contentFit="cover"
                transition={200}
              />
            </View>
          );
        }
        return null;
    }
  };

  const renderDomainIcon = () => {
    if (contentType !== "link") {
      return (
        <View
          style={[styles.typeBadge, { backgroundColor: colors.accent + "20" }]}
        >
          <Ionicons
            name={getContentIcon(contentType)}
            size={12}
            color={colors.accent}
          />
          <Text style={[styles.typeBadgeText, { color: colors.accent }]}>
            {getContentLabel(contentType)}
          </Text>
        </View>
      );
    }

    const faviconUrl = domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      : null;
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

  // Determine if we should show the text content section
  const showTextContent =
    contentType === "link" ||
    (contentType === "image" &&
      (bookmark.title || bookmark.description || tags.length > 0));

  return (
    <>
      <AnimatedPressable
        style={[
          styles.container,
          animatedStyle,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Bookmark: ${bookmark.title || bookmark.url}`}
      >
        {renderContentPreview()}

        {showTextContent && (
          <View style={[styles.content, { padding: spacing.md }]}>
            <View style={styles.header}>
              <View style={styles.domainContainer}>
                {renderDomainIcon()}
                <Text
                  style={[styles.domain, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {contentType === "link"
                    ? domain
                    : getContentLabel(contentType)}
                </Text>
              </View>
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {timeAgo}
              </Text>
            </View>

            {bookmark.title && (
              <Text
                style={[
                  styles.title,
                  { color: colors.textPrimary, marginBottom: spacing.xs },
                ]}
                numberOfLines={2}
              >
                {bookmark.title}
              </Text>
            )}

            {bookmark.description && contentType !== "note" && (
              <Text
                style={[
                  styles.description,
                  { color: colors.textSecondary, marginBottom: spacing.sm },
                ]}
                numberOfLines={2}
              >
                {bookmark.description}
              </Text>
            )}

            {tags.length > 0 && (
              <View
                style={[
                  styles.tags,
                  { gap: spacing.xs, marginBottom: spacing.sm },
                ]}
              >
                {tags.slice(0, 4).map((tag, index) => (
                  <TagChip key={index} tag={tag} small />
                ))}
              </View>
            )}

            <View style={styles.footer}>
              {bookmark.is_public ? (
                <View
                  style={[
                    styles.publicBadge,
                    {
                      backgroundColor: colors.accent + "26",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Ionicons name="earth" size={12} color={colors.accent} />
                  <Text style={[styles.publicText, { color: colors.accent }]}>
                    Public
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.privateBadge,
                    {
                      backgroundColor: colors.textTertiary + "26",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={12}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[styles.privateText, { color: colors.textTertiary }]}
                  >
                    Private
                  </Text>
                </View>
              )}

              <View style={[styles.actions, { gap: spacing.sm }]}>
                {onTogglePublic && (
                  <Pressable
                    onPress={onTogglePublic}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name={
                        bookmark.is_public
                          ? "globe-outline"
                          : "lock-closed-outline"
                      }
                      size={18}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                )}
                {onDelete && (
                  <Pressable onPress={onDelete} style={styles.actionButton}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.danger}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Footer for voice and note cards */}
        {(contentType === "voice" || contentType === "note") && (
          <View
            style={[
              styles.compactFooter,
              {
                padding: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={styles.compactMeta}>
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {timeAgo}
              </Text>
              {tags.length > 0 && (
                <View style={[styles.tags, { gap: spacing.xs }]}>
                  {tags.slice(0, 2).map((tag, index) => (
                    <TagChip key={index} tag={tag} small />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.compactActions}>
              {bookmark.is_public ? (
                <View
                  style={[
                    styles.publicBadge,
                    {
                      backgroundColor: colors.accent + "26",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Ionicons name="earth" size={12} color={colors.accent} />
                  <Text style={[styles.publicText, { color: colors.accent }]}>
                    Public
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.privateBadge,
                    {
                      backgroundColor: colors.textTertiary + "26",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={12}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[styles.privateText, { color: colors.textTertiary }]}
                  >
                    Private
                  </Text>
                </View>
              )}

              <View style={[styles.actions, { gap: spacing.sm }]}>
                {onTogglePublic && (
                  <Pressable
                    onPress={onTogglePublic}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name={
                        bookmark.is_public
                          ? "globe-outline"
                          : "lock-closed-outline"
                      }
                      size={18}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                )}
                {onDelete && (
                  <Pressable onPress={onDelete} style={styles.actionButton}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.danger}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}
      </AnimatedPressable>

      {/* Note Modal */}
      <NoteReaderModal
        visible={showNoteModal}
        bookmark={bookmark}
        onClose={() => setShowNoteModal(false)}
        onEdit={onEdit}
        onShare={onShare}
        onShowOptions={() => setShowOptionsModal(true)}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={showImageModal}
        bookmark={bookmark}
        onClose={() => setShowImageModal(false)}
        onDelete={onDelete}
        onShowOptions={() => setShowOptionsModal(true)}
      />

      {/* Audio Player Modal */}
      <AudioPlayerModal
        visible={showAudioModal}
        bookmark={bookmark}
        onClose={() => setShowAudioModal(false)}
        onDelete={onDelete}
        onShowOptions={() => setShowOptionsModal(true)}
      />

      {/* Options Modal */}
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
  return "now";
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
  },

  // Voice styles
  voiceContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceContent: {
    flex: 1,
    gap: 8,
  },
  voiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  voiceTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  voiceTime: {
    fontSize: 12,
    fontWeight: "500",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    gap: 3,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },

  // Note styles
  noteContainer: {
    padding: 16,
    gap: 10,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  notePreviewText: {
    fontSize: 15,
    lineHeight: 22,
  },
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  // Image styles
  imageContainer: {
    width: "100%",
  },
  image: {
    width: "100%",
    height: 200,
  },

  // Link styles
  linkImageContainer: {
    width: "100%",
  },
  linkImage: {
    width: "100%",
    height: 160,
  },

  // Common content styles
  content: {},
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  domainContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  favicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  domain: {
    fontSize: 13,
    fontWeight: "400",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    fontWeight: "400",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 23,
  },
  description: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  compactFooter: {
    gap: 10,
  },
  compactMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  publicBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  publicText: {
    fontSize: 11,
    fontWeight: "600",
  },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  privateText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: 16,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 24,
  },
  modalTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  charCount: {
    fontSize: 12,
  },
});
