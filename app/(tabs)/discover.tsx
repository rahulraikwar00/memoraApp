import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, ScrollView, RefreshControl, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import { feedApi, FeedItem, FeedResponse } from '../../lib/api';
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

  const renderTrendingItem = ({ item }: { item: FeedItem }) => (
    <Pressable style={styles.trendingCard} onPress={() => Linking.openURL(item.url)}>
      {item.image_url && (
        <View style={styles.trendingImage} />
      )}
      <View style={styles.trendingContent}>
        <Text style={styles.trendingDomain}>{item.domain}</Text>
        <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.trendingFooter}>
          <View style={styles.saveCount}>
            <Ionicons name="bookmark" size={12} color={colors.accent} />
            <Text style={styles.saveCountText}>{item.save_count}</Text>
          </View>
          <Pressable 
            onPress={() => handleVote(item.id)}
            style={[styles.heartButton, votedItems.has(item.id) && styles.heartButtonVoted]}
          >
            <Ionicons 
              name={votedItems.has(item.id) ? 'heart' : 'heart-outline'} 
              size={20} 
              color={votedItems.has(item.id) ? colors.danger : colors.textSecondary} 
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  const renderRecentItem = ({ item }: { item: FeedItem }) => (
    <Pressable style={styles.recentCard} onPress={() => Linking.openURL(item.url)}>
      <View style={styles.recentContent}>
        <Text style={styles.recentDomain}>{item.domain}</Text>
        <Text style={styles.recentTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.recentTags}>
          {(item.tags || []).slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <View style={styles.recentFooter}>
          <View style={styles.saveCount}>
            <Ionicons name="bookmark" size={12} color={colors.accent} />
            <Text style={styles.saveCountText}>{item.save_count} saves</Text>
          </View>
          <Pressable 
            onPress={() => handleVote(item.id)}
            style={[styles.heartButton, votedItems.has(item.id) && styles.heartButtonVoted]}
          >
            <Ionicons 
              name={votedItems.has(item.id) ? 'heart' : 'heart-outline'} 
              size={20} 
              color={votedItems.has(item.id) ? colors.danger : colors.textSecondary} 
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending</Text>
        <FlatList
          data={feed?.trending || []}
          renderItem={renderTrendingItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingList}
          ListEmptyComponent={
            <View style={styles.emptyTrending}>
              <Text style={styles.emptyText}>No trending items</Text>
            </View>
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Most Saved</Text>
        <FlatList
          data={feed?.recent || []}
          renderItem={renderRecentItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.recentList}
          ListEmptyComponent={
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyText}>No recent items</Text>
            </View>
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  trendingList: {
    paddingHorizontal: spacing.lg,
  },
  trendingCard: {
    width: 200,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendingImage: {
    height: 100,
    backgroundColor: colors.elevated,
  },
  trendingContent: {
    padding: spacing.md,
  },
  trendingDomain: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  trendingTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  trendingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveCountText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  heartButton: {
    padding: spacing.xs,
  },
  heartButtonVoted: {
    opacity: 1,
  },
  recentList: {
    paddingHorizontal: spacing.lg,
  },
  recentCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentContent: {},
  recentDomain: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  recentTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  recentTags: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tag: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  tagText: {
    ...typography.label,
    color: colors.accent,
  },
  recentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyTrending: {
    width: 200,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRecent: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
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
