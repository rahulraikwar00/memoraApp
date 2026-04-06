import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text, Linking, Alert, Share } from 'react-native';
import { useThemeStore } from '../../stores/useThemeStore';
import { getUserTopTags } from '../../lib/db';
import { feedApi, FeedItem, FeedResponse } from '../../lib/api';
import { useBookmarkStore } from '../../stores/useBookmarkStore';
import GridBookmarkCard from '../../components/GridBookmarkCard';
import EmptyState from '../../components/EmptyState';

export default function DiscoverScreen() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const { colors, spacing, typography } = useThemeStore();
  const { addBookmark, removeBookmark } = useBookmarkStore();

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const topTags = await getUserTopTags(10);
      setUserTags(topTags.map(t => t.tag));

      const data: FeedResponse = await feedApi.getFeed([], 50);
      const allItems = [...(data.trending || []), ...(data.recent || [])];
      const unique = Array.from(new Map(allItems.map(i => [i.id, i])).values());
      const filtered = unique.filter(item => item.url); // Relax filter to URLs only, allow recommendations based on tags
      setFeed(filtered);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg.includes('Network') || msg.includes('fetch') ? 'Server not running' : 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSavedIds(new Set());
    await fetchFeed();
    setIsRefreshing(false);
  };

  const handleSave = async (item: FeedItem) => {
    const isCurrentlySaved = savedIds.has(item.id);
    
    if (isCurrentlySaved) {
      setSavedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      try {
        await removeBookmark(item.id);
      } catch {
        setSavedIds(prev => new Set([...prev, item.id]));
      }
    } else {
      setSavedIds(prev => new Set([...prev, item.id]));
      try {
        await addBookmark({
          id: item.id, // Use same ID to allow reverse lookup
          url: item.url || '',
          title: item.title || null,
          description: item.description || null,
          image_url: item.image_url || null,
          domain: item.domain || null,
          tags: typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags || []),
          is_public: 0,
          local_path: null,
        } as any);
      } catch {
        setSavedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      }
    }
  };

  const handleShare = async (item: FeedItem) => {
    try {
      await Share.share({
        message: `${item.title || 'Check out this bookmark'}\n${item.url}`,
        url: item.url,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const renderItem = ({ item }: { item: FeedItem }) => (
    <GridBookmarkCard
      variant="feed"
      bookmark={{
        id: item.id,
        url: item.url,
        title: item.title || null,
        description: item.description || null,
        image_url: item.image_url || null,
        domain: item.domain || null,
        tags: typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags || []),
        is_public: 1,
        is_favorite: 0,
        local_path: null,
        created_at: item.created_at,
        updated_at: item.created_at,
        synced_at: null,
        is_deleted: 0,
      }}
      onPress={() => item.url ? Linking.openURL(item.url) : undefined}
      onSave={() => handleSave(item)}
      isSaved={savedIds.has(item.id)}
      onShare={() => handleShare(item)}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="compass-outline" title="Loading feed..." message="Discover trending bookmarks" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="cloud-offline-outline" title="Connection error" message={error} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.sm }}>
        <Text style={[{ color: colors.textPrimary, ...typography.hero }]}>Discover</Text>
        <Text style={[{ color: colors.textSecondary, ...typography.body, marginTop: 2 }]}>
          {userTags.length > 0 ? `For you · ${userTags.slice(0, 3).join(', ')}` : 'Explore trending content'}
        </Text>
      </View>

      <FlatList
        data={feed}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
        ListEmptyComponent={
          <EmptyState icon="compass-outline" title="No recommendations yet" message="Save bookmarks with tags to get personalized content" />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});