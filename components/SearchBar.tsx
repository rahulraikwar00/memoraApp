import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

const TYPE_FILTERS = [
  { key: 'all', icon: 'apps' },
  { key: 'link', icon: 'link' },
  { key: 'image', icon: 'image' },
  { key: 'note', icon: 'document-text' },
  { key: 'voice', icon: 'mic' },
];

export default function SearchBar({ value, onChangeText, placeholder = 'Search...', autoFocus, activeFilter = 'all', onFilterChange }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.filtersRow}>
        {TYPE_FILTERS.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterBtn,
              activeFilter === filter.key && styles.filterBtnActive
            ]}
            onPress={() => onFilterChange?.(filter.key)}
          >
            <Ionicons 
              name={filter.icon as any} 
              size={16} 
              color={activeFilter === filter.key ? colors.textPrimary : colors.textTertiary} 
            />
          </Pressable>
        ))}
      </View>
      <View style={styles.divider} />
      <Ionicons name="search" size={18} color={colors.textTertiary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 2,
  },
  filterBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  filterBtnActive: {
    backgroundColor: colors.accent,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
});
