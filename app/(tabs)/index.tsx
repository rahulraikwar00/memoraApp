import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View, Image as RNImage, Dimensions, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "../../components/EmptyState";
import GridBookmarkCard from "../../components/GridBookmarkCard";
import SearchBar from "../../components/SearchBar";
import { Bookmark } from "../../lib/db";
import { ContentType, filterBookmarks } from "../../lib/filter";
import { useAudioStore } from "../../stores/useAudioStore";
import { useBookmarkStore } from "../../stores/useBookmarkStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { router } from "expo-router";

const TYPE_FILTERS = [
  { key: "all", label: "All", icon: "apps" },
  { key: "link", label: "Links", icon: "link" },
  { key: "image", label: "Images", icon: "image" },
  { key: "note", label: "Notes", icon: "document-text" },
  { key: "voice", label: "Voice", icon: "mic" },
];

const TAG_FILTERS = ["Dev", "Design", "Video", "Article", "Research"];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SearchScreen() {
  const bookmarks = useBookmarkStore(state => state.bookmarks);
  const performSearch = useBookmarkStore(state => state.performSearch);
  const removeBookmark = useBookmarkStore(state => state.removeBookmark);
  const toggleFavorite = useBookmarkStore(state => state.toggleFavorite);
  const togglePublic = useBookmarkStore(state => state.togglePublic);

  const colors = useThemeStore(state => state.colors);
  const spacing = useThemeStore(state => state.spacing);
  const typography = useThemeStore(state => state.typography);
  const borderRadius = useThemeStore(state => state.borderRadius);

  const stop = useAudioStore(state => state.stop);
  const [query, setQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        console.log("Search screen unfocused, stopping audio");
        stop();
      };
    }, [stop]),
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  const handleTypeFilterChange = useCallback((filter: string) => {
    setActiveTypeFilter(filter);
  }, []);

  const handleTagFilterChange = useCallback((filter: string | null) => {
    setActiveTagFilter((prev) => (prev === filter ? null : filter));
  }, []);

  const handleOpenLink = useCallback(async (url: string) => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: colors.background,
        controlsColor: colors.accent,
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  }, [colors.background, colors.accent]);

  const handleOpenImage = useCallback((uri: string) => {
    setPreviewImage(uri);
  }, []);

  const handleOpenNote = useCallback((id: string) => {
    router.push(`/note/${id}`);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await removeBookmark(id);
  }, [removeBookmark]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    await toggleFavorite(id);
  }, [toggleFavorite]);

  const handleTogglePublic = useCallback(async (id: string) => {
    await togglePublic(id);
  }, [togglePublic]);

  const filteredBookmarks = useMemo(() => {
    return filterBookmarks(bookmarks, {
      typeFilter: activeTypeFilter as ContentType | "all",
      tagFilter: activeTagFilter,
    });
  }, [bookmarks, activeTypeFilter, activeTagFilter]);

  const renderTagFilters = () => (
    <View
      style={[
        styles.tagFilterContainer,
        { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.tagFilterRow, { gap: spacing.sm }]}
      >
        {TAG_FILTERS.map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.tagChip,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.pill,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
              activeTagFilter === filter && {
                backgroundColor: colors.accentLight + "30",
                borderColor: colors.accent,
              },
            ]}
            onPress={() => handleTagFilterChange(filter)}
          >
            <Text
              style={[
                styles.tagText,
                { color: colors.textSecondary },
                activeTagFilter === filter && {
                  color: colors.accent,
                  fontWeight: "600",
                },
              ]}
            >
              {filter}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: Bookmark }) => (
      <GridBookmarkCard 
        bookmark={item} 
        onOpenLink={() => handleOpenLink(item.url)}
        onOpenImage={() => handleOpenImage(item.local_path || item.image_url || "")}
        onOpenNote={() => handleOpenNote(item.id)}
        onDelete={() => handleDelete(item.id)}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
        onTogglePublic={() => handleTogglePublic(item.id)}
      />
    ),
    [handleOpenLink, handleOpenImage, handleOpenNote, handleDelete, handleToggleFavorite, handleTogglePublic],
  );

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            marginBottom: spacing.xs,
            ...typography.hero,
          },
        ]}
      >
        Search
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.textSecondary, ...typography.body },
        ]}
      >
        Find your saved bookmarks
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.searchWrapper,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title, tags, domain..."
          autoFocus={false}
          activeFilter={activeTypeFilter}
          onFilterChange={handleTypeFilterChange}
        />
      </View>

      {renderTagFilters()}

      <FlatList
        data={filteredBookmarks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
          filteredBookmarks.length === 0 && styles.emptyList,
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={query ? "No results found" : "Search your bookmarks"}
            message={
              query
                ? `No bookmarks match "${query}"`
                : "Type to search your saved bookmarks"
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          style={styles.modalOverlay} 
          onPress={() => setPreviewImage(null)}
        >
          <View style={styles.modalContent}>
            {previewImage && (
              <RNImage 
                source={{ uri: previewImage }} 
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: colors.background + "CC" }]}
              onPress={() => setPreviewImage(null)}
            >
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {},
  header: {},
  tagFilterContainer: {},
  tagFilterRow: {
    flexDirection: "row",
  },
  tagChip: {
    borderWidth: 1,
  },
  tagText: {},
  list: {},
  columnWrapper: {
    gap: 8,
  },
  emptyList: {
    flexGrow: 1,
  },
  title: {},
  subtitle: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.8,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 8,
    borderRadius: 25,
  },
});
