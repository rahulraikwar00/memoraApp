import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { useBookmarkStore } from '../../stores/useBookmarkStore';
import { useThemeStore } from '../../stores/useThemeStore';
import SearchBar from '../../components/SearchBar';
import BookmarkCard from '../../components/BookmarkCard';
import EmptyState from '../../components/EmptyState';
import { Bookmark } from '../../lib/db';

const FILTER_TABS = ['All', 'Dev', 'Design', 'Video', 'Article', 'Research'];

export default function SearchScreen() {
  const { bookmarks, performSearch } = useBookmarkStore();
  const { colors, spacing, typography, borderRadius } = useThemeStore();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  const filteredBookmarks = useMemo(() => {
    if (activeFilter === 'All') return bookmarks;
    return bookmarks.filter(bookmark => {
      const tags = JSON.parse(bookmark.tags || '[]') as string[];
      const filterLower = activeFilter.toLowerCase();
      return tags.some(tag => tag.toLowerCase().includes(filterLower));
    });
  }, [bookmarks, activeFilter]);

  const renderFilterChips = () => (
    <View 
      style={[styles.filterContainer, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}
    >
      <View style={[styles.filterRow, { gap: spacing.sm }]}>
        {FILTER_TABS.slice(0, 3).map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterChip,
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border, 
                borderRadius: borderRadius.pill,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
              activeFilter === filter && {
                backgroundColor: colors.accent,
                borderColor: colors.accent,
              }
            ]}
            onPress={() => handleFilterChange(filter)}
          >
            <Text style={[
              styles.filterText,
              { color: colors.textSecondary },
              activeFilter === filter && { color: colors.textPrimary, fontWeight: '600' }
            ]}>
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.filterRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
        {FILTER_TABS.slice(3).map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterChip,
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border, 
                borderRadius: borderRadius.pill,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
              activeFilter === filter && {
                backgroundColor: colors.accent,
                borderColor: colors.accent,
              }
            ]}
            onPress={() => handleFilterChange(filter)}
          >
            <Text style={[
              styles.filterText,
              { color: colors.textSecondary },
              activeFilter === filter && { color: colors.textPrimary, fontWeight: '600' }
            ]}>
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: Bookmark }) => (
    <BookmarkCard bookmark={item} />
  ), []);

  const renderHeader = () => (
    <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
      <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.xs, ...typography.hero }]}>Search</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, ...typography.body }]}>Find your saved bookmarks</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchWrapper, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title, tags, domain..."
          autoFocus={false}
        />
      </View>
      
      {renderFilterChips()}

      <FlatList
        data={filteredBookmarks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
          filteredBookmarks.length === 0 && styles.emptyList
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={query ? 'No results found' : 'Search your bookmarks'}
            message={query 
              ? `No bookmarks match "${query}"` 
              : 'Type to search your saved bookmarks'}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    borderWidth: 1,
  },
  filterText: {},
  filterTextActive: {},
  list: {},
  emptyList: {
    flexGrow: 1,
  },
  title: {},
  subtitle: {},
});
