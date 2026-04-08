import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import GridBookmarkCard from '../../components/GridBookmarkCard';
import { feedApi, FeedItem, FeedResponse, FeedSection } from '../../lib/api';
import { useBookmarkStore } from '../../stores/useBookmarkStore';
import { useThemeStore } from '../../stores/useThemeStore';

export default function DiscoverScreen() {
  const [sections, setSections] = useState<FeedSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showActiveRecall, setShowActiveRecall] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const { colors, spacing, typography } = useThemeStore();
  const { addBookmark, removeBookmark } = useBookmarkStore();

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const data: FeedResponse = await feedApi.getFeed();
      setSections(data.sections || []);
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
    await fetchFeed();
    setIsRefreshing(false);
  };

  const handleSave = async (item: FeedItem) => {
    const isCurrentlySaved = savedIds.has(item.id);
    if (isCurrentlySaved) {
      setSavedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      try { await removeBookmark(item.id); } catch { setSavedIds(prev => new Set([...prev, item.id])); }
    } else {
      setSavedIds(prev => new Set([...prev, item.id]));
      try {
        await addBookmark({
          id: item.id,
          url: item.url || '',
          title: item.title || null,
          description: item.description || null,
          image_url: item.image_url || null,
          domain: item.domain || null,
          tags: typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags || []),
          is_public: 0,
          local_path: null,
        } as any);
      } catch { setSavedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; }); }
    }
  };

  const handleShare = async (item: FeedItem) => {
    try {
      await Share.share({ message: `${item.title || 'Check out this bookmark'}\n${item.url}`, url: item.url });
    } catch (error) { console.error('Share error:', error); }
  };

  const renderSection = (section: FeedSection) => {
    const isHero = section.type === 'hero';

    return (
      <View key={section.id} style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
          {section.title}
        </Text>
        
        {section.type === 'highlight' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {section.items.map(item => (
              <GridBookmarkCard
                key={item.id}
                variant="feed"
                isHighlighted
                showActiveRecall={showActiveRecall && !savedIds.has(item.id)}
                bookmark={{ ...item, tags: typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags || []) } as any}
                onPress={() => item.url ? Linking.openURL(item.url) : undefined}
                onSave={() => handleSave(item)}
                isSaved={savedIds.has(item.id)}
                onShare={() => handleShare(item)}
                saveCount={item.save_count}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.gridContainer, { paddingHorizontal: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
            {section.items.map(item => (
              <GridBookmarkCard
                key={item.id}
                variant="feed"
                isHero={isHero}
                showActiveRecall={showActiveRecall && !savedIds.has(item.id)}
                bookmark={{ ...item, tags: typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags || []) } as any}
                onPress={() => item.url ? Linking.openURL(item.url) : undefined}
                onSave={() => handleSave(item)}
                isSaved={savedIds.has(item.id)}
                onShare={() => handleShare(item)}
                saveCount={item.save_count}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

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
        <Pressable style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={handleRefresh}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[{ color: colors.textPrimary, ...typography.hero, flex: 1 }]}>Discover</Text>
          <Pressable 
            style={[styles.recallToggle, { 
              backgroundColor: showActiveRecall ? colors.accent : colors.card,
              borderColor: showActiveRecall ? colors.accent : colors.border
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowActiveRecall(!showActiveRecall);
            }}
          >
            <Ionicons name="school-outline" size={18} color={showActiveRecall ? '#fff' : colors.textPrimary} />
            <Text style={[styles.recallToggleText, { color: showActiveRecall ? '#fff' : colors.textPrimary }]}>
              {showActiveRecall ? 'Recall On' : 'Recall'}
            </Text>
          </Pressable>
        </View>
        <Text style={[{ color: colors.textSecondary, ...typography.body, marginTop: 4 }]}>
          Explore trending and personalized content
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {sections.map(renderSection)}
        {sections.length === 0 && (
          <EmptyState icon="compass-outline" title="No recommendations yet" message="Save bookmarks with tags to get personalized content" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 20 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionContainer: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  gridContainer: { },
  recallToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    borderWidth: 1,
  },
  recallToggleText: { fontSize: 12, fontWeight: '600' },
  retryButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});