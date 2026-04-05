import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarkStore } from '../../stores/useBookmarkStore';
import { useThemeStore } from '../../stores/useThemeStore';
import SearchBar from '../../components/SearchBar';
import GridBookmarkCard from '../../components/GridBookmarkCard';
import EmptyState from '../../components/EmptyState';
import { Bookmark } from '../../lib/db';

type ContentType = 'link' | 'image' | 'note' | 'voice';

const getContentType = (bookmark: Bookmark): ContentType => {
  if (bookmark.domain === 'local-image') return 'image';
  if (bookmark.domain === 'local-note') return 'note';
  if (bookmark.domain === 'local-voice') return 'voice';
  return 'link';
};

const TYPE_FILTERS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'link', label: 'Links', icon: 'link' },
  { key: 'image', label: 'Images', icon: 'image' },
  { key: 'note', label: 'Notes', icon: 'document-text' },
  { key: 'voice', label: 'Voice', icon: 'mic' },
];

const TAG_FILTERS = ['Dev', 'Design', 'Video', 'Article', 'Research'];

export default function SearchScreen() {
  const { bookmarks, performSearch } = useBookmarkStore();
  const { colors, spacing, typography, borderRadius } = useThemeStore();
  const [query, setQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

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
    setActiveTagFilter(prev => prev === filter ? null : filter);
  }, []);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(bookmark => {
      if (activeTypeFilter !== 'all') {
        const type = getContentType(bookmark);
        if (type !== activeTypeFilter) return false;
      }
      
      if (activeTagFilter) {
        const tags = JSON.parse(bookmark.tags || '[]') as string[];
        if (!tags.some(tag => tag.toLowerCase().includes(activeTagFilter.toLowerCase()))) {
          return false;
        }
      }
      
      return true;
    });
  }, [bookmarks, activeTypeFilter, activeTagFilter]);

  const renderFilterChips = () => (
    <View 
      style={[styles.filterContainer, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}
    >
      <View style={[styles.filterRow, { gap: spacing.sm }]}>
        {TYPE_FILTERS.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterChip,
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border, 
                borderRadius: borderRadius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
              activeTypeFilter === filter.key && {
                backgroundColor: colors.accent,
                borderColor: colors.accent,
              }
            ]}
            onPress={() => handleTypeFilterChange(filter.key)}
          >
            <Ionicons 
              name={filter.icon as any} 
              size={14} 
              color={activeTypeFilter === filter.key ? colors.textPrimary : colors.textSecondary} 
            />
            <Text style={[
              styles.filterText,
              { color: colors.textSecondary, marginLeft: 4 },
              activeTypeFilter === filter.key && { color: colors.textPrimary, fontWeight: '600' }
            ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.filterRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
        {TAG_FILTERS.map((filter) => (
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
              activeTagFilter === filter && {
                backgroundColor: colors.accentLight + '30',
                borderColor: colors.accent,
              }
            ]}
            onPress={() => handleTagFilterChange(filter)}
          >
            <Text style={[
              styles.filterText,
              { color: colors.textSecondary },
              activeTagFilter === filter && { color: colors.accent, fontWeight: '600' }
            ]}>
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: Bookmark }) => (
    <GridBookmarkCard bookmark={item} />
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
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
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
  columnWrapper: {
    gap: 8,
  },
  emptyList: {
    flexGrow: 1,
  },
  title: {},
  subtitle: {},
});
