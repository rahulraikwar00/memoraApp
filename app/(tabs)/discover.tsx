import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, ScrollView, RefreshControl, Pressable, Linking } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { feedApi, FeedItem, FeedResponse } from '../../lib/api';
import GridBookmarkCard from '../../components/GridBookmarkCard';
import EmptyState from '../../components/EmptyState';

export default function DiscoverScreen() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votedItems, setVotedItems] = useState<Set<string>>(new Set());

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const data = await feedApi.getFeed();
      setFeed(data);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage.includes('Network') || errorMessage.includes('fetch') 
        ? 'Server not running. Start with npm run server' 
        : 'Failed to load feed');
      console.error('Feed error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFeed();
    setIsRefreshing(false);
  };

  const handleVote = async (id: string) => {
    try {
      await feedApi.vote(id);
      setVotedItems(prev => new Set(prev).add(id));
    } catch (e) {
      console.error('Vote error:', e);
    }
  };

  const allItems = [...(feed?.trending || []), ...(feed?.recent || [])];

  const renderItem = ({ item }: { item: FeedItem }) => (
    <GridBookmarkCard
      bookmark={{
        id: item.id,
        url: item.url,
        title: item.title,
        description: item.description || null,
        image_url: item.image_url || null,
        domain: item.domain,
        tags: JSON.stringify(item.tags || []),
        is_public: 1,
        created_at: item.created_at,
        updated_at: item.created_at,
        synced_at: null,
        is_deleted: 0,
      }}
      onPress={() => Linking.openURL(item.url)}
      onVote={() => handleVote(item.id)}
      isVoted={votedItems.has(item.id)}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="compass-outline"
          title="Loading feed..."
          message="Discover trending bookmarks from the community"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Connection error"
          message={error}
        />
        <Pressable style={styles.retryButton} onPress={fetchFeed}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
        <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.xs, ...typography.hero }]}>Discover</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, ...typography.body }]}>Trending bookmarks from the community</Text>
      </View>
      
      <FlatList
        data={allItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
          allItems.length === 0 && styles.emptyList
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="compass-outline"
            title="No bookmarks yet"
            message="Be the first to save a public bookmark!"
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
  header: {},
  title: {},
  subtitle: {},
  list: {},
  columnWrapper: {
    gap: 8,
  },
  emptyList: {
    flex: 1,
  },
  retryButton: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});