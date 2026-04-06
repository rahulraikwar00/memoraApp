import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withSequence, 
  withTiming,
  useSharedValue,
  interpolate
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAudioStore } from '../stores/useAudioStore';
import { useThemeStore } from '../stores/useThemeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WAVE_BARS = 6;

const Waveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const { colors } = useThemeStore();
  
  return (
    <View style={styles.waveform}>
      {[...Array(WAVE_BARS)].map((_, i) => (
        <WaveBar key={i} index={i} isPlaying={isPlaying} color={colors.accent} />
      ))}
    </View>
  );
};

const WaveBar = ({ index, isPlaying, color }: { index: number, isPlaying: boolean, color: string }) => {
  const height = useSharedValue(4);

  useEffect(() => {
    if (isPlaying) {
      height.value = withRepeat(
        withSequence(
          withTiming(12 + Math.random() * 10, { duration: 400 + Math.random() * 200 }),
          withTiming(4, { duration: 400 + Math.random() * 200 })
        ),
        -1,
        true
      );
    } else {
      height.value = withTiming(4);
    }
  }, [isPlaying]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.waveBar, { backgroundColor: color }, animatedStyle]} />;
};

export default function DynamicIsland() {
  const { 
    isPlaying, 
    currentlyPlayingTitle, 
    isMinimized, 
    play, 
    pause, 
    resume, 
    currentlyPlayingId,
    setIsMinimized,
    setShowPlayer
  } = useAudioStore();
  
  const { colors, spacing, borderRadius } = useThemeStore();

  const isVisible = useSharedValue(0);

  useEffect(() => {
    isVisible.value = withSpring(currentlyPlayingId ? 1 : 0, { damping: 15 });
  }, [currentlyPlayingId]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(isVisible.value, [0, 1], [-100, 0]) },
      { scale: interpolate(isVisible.value, [0, 1], [0.8, 1]) }
    ],
    opacity: isVisible.value,
    width: interpolate(isVisible.value, [0, 1], [100, SCREEN_WIDTH - spacing.lg * 2]),
  }));

  if (!currentlyPlayingId) return null;

  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: colors.card, 
        borderColor: colors.border,
        borderRadius: borderRadius.pill,
        paddingHorizontal: spacing.md,
        top: 60, // Sits below the status bar/notch
      }, 
      containerStyle
    ]}>
      <Pressable 
        style={styles.content} 
        onPress={() => {
          setIsMinimized(false);
          setShowPlayer(true);
        }}
      >
        <Waveform isPlaying={isPlaying} />
        
        <View style={styles.textContainer}>
          <Text 
            numberOfLines={1} 
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {currentlyPlayingTitle || 'Voice Note'}
          </Text>
        </View>

        <Pressable 
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation();
            isPlaying ? pause() : resume();
          }}
          style={[styles.playButton, { backgroundColor: colors.accentLight + '20' }]}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={18} 
            color={colors.accent} 
          />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    height: 48,
    borderWidth: 1,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 30,
    justifyContent: 'center',
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
