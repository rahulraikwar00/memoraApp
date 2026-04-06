import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioStore } from '../stores/useAudioStore';
import { useThemeStore } from '../stores/useThemeStore';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function AudioPlayerModal() {
  const { 
    showPlayer, 
    setShowPlayer, 
    setIsMinimized,
    currentlyPlayingTitle,
    isPlaying,
    pause,
    resume,
    position,
    duration,
    seekTo
  } = useAudioStore();

  const { colors, spacing, typography, borderRadius } = useThemeStore();

  const progress = duration > 0 ? position / duration : 0;

  const handleProgressBarPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const newPosition = (locationX / (SCREEN_WIDTH - spacing.xl * 2)) * duration;
    seekTo(newPosition);
  };

  if (!showPlayer) return null;

  return (
    <Modal
      visible={showPlayer}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setIsMinimized(true);
        setShowPlayer(false);
      }}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header/Close */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }]}>
          <Pressable 
            onPress={() => {
              setIsMinimized(true);
              setShowPlayer(false);
            }}
            style={styles.closeButton}
          >
            <Ionicons name="chevron-down" size={30} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textTertiary }]}>Now Playing</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Artwork Placeholder / Visualizer */}
        <View style={styles.artworkContainer}>
          <View style={[styles.placeholder, { backgroundColor: colors.card, borderRadius: borderRadius.lg }]}>
            <Ionicons name="mic" size={80} color={colors.accent} />
          </View>
        </View>

        {/* Metadata */}
        <View style={[styles.metaContainer, { paddingHorizontal: spacing.xl }]}>
          <Text style={[styles.title, { color: colors.textPrimary, ...typography.hero }]}>
            {currentlyPlayingTitle}
          </Text>
          <Text style={[styles.artist, { color: colors.textSecondary, ...typography.body }]}>
            Voice Recording
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { paddingHorizontal: spacing.xl }]}>
          <Pressable style={styles.progressBarBg} onPress={handleProgressBarPress}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
            <View style={[styles.progressKnob, { left: `${progress * 100}%`, backgroundColor: colors.accent }]} />
          </Pressable>
          <View style={styles.timeContainer}>
            <Text style={[styles.timeText, { color: colors.textTertiary }]}>{formatTime(position)}</Text>
            <Text style={[styles.timeText, { color: colors.textTertiary }]}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <Pressable onPress={() => seekTo(Math.max(0, position - 15))}>
            <Ionicons name="play-back" size={36} color={colors.textPrimary} />
          </Pressable>

          <Pressable 
            onPress={() => isPlaying ? pause() : resume()}
            style={[styles.mainPlayButton, { backgroundColor: colors.accent }]}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={42} color="#FFF" />
          </Pressable>

          <Pressable onPress={() => seekTo(Math.min(duration, position + 15))}>
            <Ionicons name="play-forward" size={36} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Footer Actions */}
        <View style={[styles.footer, { paddingBottom: spacing.xxl }]}>
          <Pressable>
            <Ionicons name="share-outline" size={24} color={colors.textSecondary} />
          </Pressable>
          <Pressable>
            <Ionicons name="list" size={24} color={colors.textSecondary} />
          </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  artworkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholder: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  metaContainer: {
    marginBottom: 40,
  },
  title: {
    marginBottom: 4,
  },
  artist: {
    opacity: 0.8,
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressKnob: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    marginLeft: -6,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 50,
    marginBottom: 60,
  },
  mainPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  }
});
