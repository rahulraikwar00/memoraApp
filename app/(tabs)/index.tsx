import { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useBookmarkStore } from '../../stores/useBookmarkStore';
import { useThemeStore } from '../../stores/useThemeStore';
import GridBookmarkCard from '../../components/GridBookmarkCard';
import EmptyState from '../../components/EmptyState';
import SkeletonCard from '../../components/SkeletonCard';
import { Bookmark } from '../../lib/db';

export default function LibraryScreen() {
  const { bookmarks, isLoading, loadBookmarks, removeBookmark, togglePublic } = useBookmarkStore();
  const { colors, spacing } = useThemeStore();

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleDelete = useCallback(async (id: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Bookmark',
      'Are you sure you want to delete this bookmark?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeBookmark(id) },
      ]
    );
  }, [removeBookmark]);

  const handleTogglePublic = useCallback(async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await togglePublic(id);
  }, [togglePublic]);

  const renderItem = useCallback(({ item }: { item: Bookmark }) => {
    return (
      <GridBookmarkCard
        bookmark={item}
        onPress={() => {
          Alert.alert(
            item.title || item.url,
            'What would you like to do?',
            [
              { text: 'Open Link', onPress: () => Linking.openURL(item.url) },
              { text: 'Toggle Public', onPress: () => handleTogglePublic(item.id) },
              { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
      />
    );
  }, [handleDelete, handleTogglePublic]);

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonCard hasImage />
      <SkeletonCard hasImage />
    </View>
  );

  if (isLoading && bookmarks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.list, { padding: spacing.lg }]}>
          {renderSkeleton()}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={bookmarks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
          bookmarks.length === 0 && styles.emptyList
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadBookmarks}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bookmark-outline"
            title="No bookmarks yet"
            message="Save your first link from the Save tab to get started"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {},
  columnWrapper: {
    gap: 8,
  },
  emptyList: {
    flex: 1,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});