import { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useBookmarkStore } from '../../stores/useBookmarkStore';
import { useThemeStore } from '../../stores/useThemeStore';
import BookmarkCard from '../../components/BookmarkCard';
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

  const renderRightActions = useCallback(() => {
    return (
      <View style={styles.swipeActions}>
        <View style={[styles.swipeAction, { backgroundColor: colors.accent }]} />
      </View>
    );
  }, [colors.accent]);

  const renderLeftActions = useCallback(() => {
    return (
      <View style={styles.swipeActions}>
        <View style={[styles.swipeAction, { backgroundColor: colors.danger }]} />
      </View>
    );
  }, [colors.danger]);

  const renderItem = useCallback(({ item }: { item: Bookmark }) => {
    return (
      <Swipeable
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={(direction) => {
          if (direction === 'left') {
            handleDelete(item.id);
          } else if (direction === 'right') {
            handleTogglePublic(item.id);
          }
        }}
      >
        <BookmarkCard
          bookmark={item}
          onPress={() => Linking.openURL(item.url)}
          onDelete={() => handleDelete(item.id)}
          onTogglePublic={() => handleTogglePublic(item.id)}
        />
      </Swipeable>
    );
  }, [handleDelete, handleTogglePublic, renderRightActions, renderLeftActions]);

  const renderSkeleton = () => (
    <View>
      <SkeletonCard hasImage />
      <SkeletonCard hasImage={false} />
    </View>
  );

  if (isLoading && bookmarks.length === 0) {
    return (
      <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.list, { padding: spacing.lg }]}>
          {renderSkeleton()}
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={bookmarks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { padding: spacing.lg },
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {},
  emptyList: {
    flex: 1,
  },
  swipeActions: {
    width: 80,
    marginBottom: 12,
  },
  swipeAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});
