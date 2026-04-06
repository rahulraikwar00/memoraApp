import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme'; // Still useful for Icon fills where strict Tailwind HEX isn't loaded

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

export default function EmptyState({ icon = 'bookmark-outline', title, message }: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center p-8">
      <Ionicons name={icon} size={64} color={colors.textTertiary} />
      <Text className="text-xl font-bold dark:text-white mt-6 mb-2">
        {title}
      </Text>
      <Text className="text-base text-gray-500 text-center">
        {message}
      </Text>
    </View>
  );
}
