import { useCallback, useState, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Linking,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useBookmarkStore } from "../stores/useBookmarkStore";
import { useThemeStore } from "../stores/useThemeStore";
import { useAudioStore } from "../stores/useAudioStore";
import GridBookmarkCard from "./GridBookmarkCard";
import EmptyState from "./EmptyState";
import SkeletonCard from "./SkeletonCard";
import { Bookmark } from "../lib/db";
import { filterBookmarks, CATEGORY_TYPE_MAP } from "../lib/filter";

const CATEGORIES = ["All", "Link", "Image", "Note", "Voice", "AI", "Art"];

export default function LibraryScreen() {
  const {
    bookmarks,
    isLoading,
    loadBookmarks,
    removeBookmark,
    togglePublic,
    performSearch,
  } = useBookmarkStore();
  const { colors, spacing } = useThemeStore();
  const { stop } = useAudioStore();

  const [selectedCategory, setSelectedCategory] = useState("All");

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
      return () => {
        stop();
      };
    }, [loadBookmarks, stop]),
  );

  const filteredBookmarks = useMemo(() => {
    const typeFilter = CATEGORY_TYPE_MAP[selectedCategory];
    return filterBookmarks(bookmarks, { typeFilter });
  }, [bookmarks, selectedCategory]);

  const handleCategoryPress = (category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
    if (category === "All") {
      performSearch("");
    } else {
      performSearch(category.toLowerCase());
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await removeBookmark(id);
    },
    [removeBookmark],
  );

  const handleTogglePublic = useCallback(
    async (id: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await togglePublic(id);
    },
    [togglePublic],
  );

  const handleOpenLink = useCallback(async (bookmark: Bookmark) => {
    if (!bookmark.url) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(bookmark.url);
  }, []);

  const handleShare = useCallback(async (bookmark: Bookmark) => {
    if (!bookmark.url) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(bookmark.url);
    Alert.alert("Copied", "Link copied to clipboard");
  }, []);

  const handleCopyUrl = useCallback(async (bookmark: Bookmark) => {
    if (!bookmark.url) return;
    await Clipboard.setStringAsync(bookmark.url);
    Alert.alert("Copied", "URL copied to clipboard");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Bookmark }) => {
      return (
        <GridBookmarkCard
          bookmark={item}
          onOpenLink={() => handleOpenLink(item)}
          onTogglePublic={() => handleTogglePublic(item.id)}
          onShare={() => handleShare(item)}
          onCopyUrl={() => handleCopyUrl(item)}
          onDelete={() => handleDelete(item.id)}
        />
      );
    },
    [
      handleOpenLink,
      handleTogglePublic,
      handleShare,
      handleCopyUrl,
      handleDelete,
    ],
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonCard hasImage />
      <SkeletonCard hasImage />
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.headerContainer, { paddingHorizontal: spacing.lg }]}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconContainer}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          Captures
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.categoryChips,
          { paddingVertical: spacing.md },
        ]}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => handleCategoryPress(cat)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  selectedCategory === cat ? colors.accent : colors.elevated,
                marginRight: spacing.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    selectedCategory === cat ? "#fff" : colors.textSecondary,
                },
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  if (isLoading && bookmarks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
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
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
          bookmarks.length === 0 && styles.emptyList,
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
    paddingTop: 60,
  },
  headerContainer: {
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  iconContainer: {
    padding: 4,
  },
  categoryChips: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  list: {},
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  emptyList: {
    flex: 1,
  },
  skeletonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});