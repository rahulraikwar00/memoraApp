import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../constants/theme';

interface TagChipProps {
  tag: string;
  small?: boolean;
}

export default function TagChip({ tag, small }: TagChipProps) {
  return (
    <Text style={[styles.tag, small && styles.tagSmall]}>{tag}</Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    ...typography.caption,
    color: colors.accent,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  tagSmall: {
    fontSize: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
});
