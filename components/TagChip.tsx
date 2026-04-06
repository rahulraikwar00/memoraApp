import React from "react";
import { StyleSheet, Text } from "react-native";
import { borderRadius, colors, spacing, typography } from "../constants/theme";

interface TagChipProps {
  tag: string;
  small?: boolean;
  light?: boolean;
}

export default function TagChip({ tag, small, light }: TagChipProps) {
  return (
    <Text
      style={[styles.tag, small && styles.tagSmall, light && styles.tagLight]}
    >
      #{tag}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    ...typography.caption,
    color: colors.accent,
    // backgroundColor: "rgba(108, 99, 255, 0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    overflow: "hidden",
  },
  tagSmall: {
    fontSize: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  tagLight: {
    color: "#fff",
    // backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
