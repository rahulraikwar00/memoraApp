import { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Linking, Clipboard } from 'react-native';
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
    await removeBookmark(id);
  }, [removeBookmark]);

  const handleTogglePublic = useCallback(async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await togglePublic(id);
  }, [togglePublic]);

  const handleOpenLink = useCallback(async (url: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  }, []);

  const handleShare = useCallback(async (bookmark: Bookmark) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(bookmark.url);
    Alert.alert('Copied', 'Link copied to clipboard');
  }, []);

  const handleCopyUrl = useCallback((url: string) => {
    Clipboard.setString(url);
    Alert.alert('Copied', 'URL copied to clipboard');
  }, []);

  const renderItem = useCallback(({ item }: { item: Bookmark }) => {
    return (
      <GridBookmarkCard
        bookmark={item}
        onOpenLink={() => handleOpenLink(item.url)}
        onTogglePublic={() => handleTogglePublic(item.id)}
        onShare={() => handleShare(item)}
        onCopyUrl={() => handleCopyUrl(item.url)}
        onDelete={() => handleDelete(item.id)}
      />
    );
  }, [handleOpenLink, handleTogglePublic, handleShare, handleCopyUrl, handleDelete]);

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