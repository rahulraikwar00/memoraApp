import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  Easing 
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../constants/theme';

interface SkeletonCardProps {
  hasImage?: boolean;
}

export default function SkeletonCard({ hasImage = true }: SkeletonCardProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + (shimmer.value * 0.7),
  }));

  return (
    <View style={styles.container}>
      {hasImage && <View style={styles.image} />}
      <View style={styles.content}>
        <Animated.View style={[styles.line, styles.lineShort, animatedStyle]} />
        <Animated.View style={[styles.line, animatedStyle]} />
        <Animated.View style={[styles.line, animatedStyle]} />
        <View style={styles.tags}>
          <Animated.View style={[styles.tag, animatedStyle]} />
          <Animated.View style={[styles.tag, animatedStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: colors.elevated,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  line: {
    height: 14,
    backgroundColor: colors.elevated,
    borderRadius: 4,
    width: '100%',
  },
  lineShort: {
    width: '40%',
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tag: {
    height: 24,
    width: 60,
    backgroundColor: colors.elevated,
    borderRadius: borderRadius.pill,
  },
});
