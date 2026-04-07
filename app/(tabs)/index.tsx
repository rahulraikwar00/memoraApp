import { useFocusEffect } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import EmptyState from "../../components/EmptyState";
import GridBookmarkCard from "../../components/GridBookmarkCard";
import SearchBar from "../../components/SearchBar";
import { Bookmark } from "../../lib/db";
import { ContentType, filterBookmarks } from "../../lib/filter";
import { useAudioStore } from "../../stores/useAudioStore";
import { useBookmarkStore } from "../../stores/useBookmarkStore";
import { useThemeStore } from "../../stores/useThemeStore";

const TYPE_FILTERS = [
  { key: "all", label: "All", icon: "apps" },
  { key: "link", label: "Links", icon: "link" },
  { key: "image", label: "Images", icon: "image" },
  { key: "note", label: "Notes", icon: "document-text" },
  { key: "voice", label: "Voice", icon: "mic" },
];

const TAG_FILTERS = ["Dev", "Design", "Video", "Article", "Research"];

export default function SearchScreen() {
  const {
    bookmarks,
    performSearch,
    removeBookmark,
    togglePublic,
    updateBookmark,
  } = useBookmarkStore();
  const { colors, spacing, typography, borderRadius } = useThemeStore();
  const { stop, play, setShowPlayer } = useAudioStore();
  const [query, setQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

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

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      if (!url) return;
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Alert.alert("Error", "Could not open link");
    }
  }, []);

  const handleEdit = useCallback(
    (bookmark: Bookmark) => {
      Alert.prompt(
        "Edit Title",
        "Enter a new title for this bookmark",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (newTitle?: string) => {
              if (newTitle) {
                updateBookmark(bookmark.id, { title: newTitle });
              }
            },
          },
        ],
        "plain-text",
        bookmark.title || "",
      );
    },
    [updateBookmark],
  );

  const renderItem = useCallback(
    ({ item }: { item: Bookmark }) => (
      <GridBookmarkCard
        bookmark={item}
        onPress={() => {
          if (item.domain === "local-voice" || item.url?.includes("m4a")) {
            setShowPlayer(true);
          }
        }}
        onOpenLink={() => handleOpenLink(item.url)}
        onVoicePlay={(bookmark) => {
          if (bookmark.local_path) {
            const cleanTitle =
              bookmark.title?.replace(/\s*\(\d+:\d+\)/, "") || "Voice Note";
            play(bookmark.id, cleanTitle, bookmark.local_path);
          }
        }}
        onDelete={() => removeBookmark(item.id)}
        onTogglePublic={() => togglePublic(item.id)}
        onEdit={() => handleEdit(item)}
      />
    ),
    [
      play,
      removeBookmark,
      togglePublic,
      handleEdit,
      setShowPlayer,
      handleOpenLink,
    ],
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {},
  header: {},
  filterContainer: {},
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterChip: {
    borderWidth: 1,
  },
  filterText: {},
  filterTextActive: {},
  tagFilterContainer: {},
  tagFilterRow: {
    flexDirection: "row",
    // flexWrap: 'wrap',
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
});
