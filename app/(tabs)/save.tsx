import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarkStore } from '../../stores/useBookmarkStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { generateTags } from '../../lib/tagger';
import { metadataApi } from '../../lib/api';
import TagChip from '../../components/TagChip';

interface Metadata {
  title?: string;
  description?: string;
  image_url?: string;
  domain?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SaveScreen() {
  const router = useRouter();
  const { addBookmark } = useBookmarkStore();
  const { colors, spacing, typography, borderRadius } = useThemeStore();
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  const scale = useSharedValue(1);

  useEffect(() => {
    checkClipboard();
  }, []);

  const checkClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (isValidUrl(clipboardContent)) {
        setUrl(clipboardContent);
        await fetchMetadata(clipboardContent);
      }
    } catch (e) {
      console.log('Clipboard check failed:', e);
    }
  };

  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const fetchMetadata = async (urlString: string) => {
    try {
      const domain = new URL(urlString).hostname;
      
      try {
        const metadata = await metadataApi.getPreview(urlString);
        setMetadata({
          domain: metadata.domain,
          title: metadata.title || '',
          description: metadata.description || '',
          image_url: metadata.image_url || undefined,
        });
        if (metadata.title) {
          const suggestedTags = generateTags(urlString, metadata.title);
          setTags(suggestedTags);
        }
      } catch (apiError) {
        console.log('Metadata API failed, using fallback:', apiError);
        setMetadata({
          domain,
          title: '',
          description: '',
          image_url: undefined,
        });
        const suggestedTags = generateTags(urlString, '');
        setTags(suggestedTags);
      }
    } catch (e) {
      console.log('Metadata fetch failed:', e);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    if (!isValidUrl(url)) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }
    setIsLoading(true);
    await fetchMetadata(url);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    setIsLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      scale.value = withSpring(0.95, { damping: 15 });
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 15 });
      }, 100);

      const domain = metadata?.domain || new URL(url).hostname;
      await addBookmark({
        url: url.trim(),
        title: metadata?.title || url,
        description: metadata?.description || null,
        image_url: metadata?.image_url || null,
        domain,
        tags: JSON.stringify(tags),
        is_public: isPublic ? 1 : 0,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setUrl('');
      setTags([]);
      setMetadata(null);
      setIsPublic(false);

      Alert.alert('Saved!', 'Bookmark saved successfully', [
        { text: 'OK', onPress: () => router.push('/(tabs)') }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !tags.includes(normalizedTag) && tags.length < 6) {
      setTags([...tags, normalizedTag]);
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { marginBottom: spacing.xxl }]}>
          <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.xs, ...typography.hero }]}>Save a link</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, ...typography.body }]}>Paste a URL to save it to your library</Text>
        </View>

        <View style={[styles.inputContainer, { marginBottom: spacing.xxl }]}>
          <View style={[styles.urlInputWrapper, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md }]}>
            <TextInput
              style={[styles.urlInput, { color: colors.textPrimary }]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onSubmitEditing={handleUrlSubmit}
              returnKeyType="go"
            />
            <Pressable 
              style={styles.pasteButton}
              onPress={checkClipboard}
            >
              <Ionicons name="clipboard-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Pressable 
            style={[styles.fetchButton, { backgroundColor: colors.accent }]}
            onPress={handleUrlSubmit}
            disabled={isLoading || !url.trim()}
          >
            <Text style={styles.fetchButtonText}>
              {isLoading ? 'Fetching...' : 'Fetch Info'}
            </Text>
          </Pressable>
        </View>

        {metadata && (
          <View style={[styles.previewSection, { marginBottom: spacing.xxl }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: spacing.md, ...typography.title }]}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md }]}>
              {metadata.image_url && (
                <View style={[styles.previewImagePlaceholder, { backgroundColor: colors.elevated }]}>
                  <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
                </View>
              )}
              <View style={[styles.previewContent, { padding: spacing.md }]}>
                <Text style={[styles.previewDomain, { color: colors.textTertiary }]}>{metadata.domain}</Text>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {metadata.title || url}
                </Text>
                {metadata.description && (
                  <Text style={[styles.previewDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {metadata.description}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={[styles.tagsSection, { marginBottom: spacing.xxl }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: spacing.md, ...typography.title }]}>Tags</Text>
          <View style={[styles.tagsContainer, { gap: spacing.sm }]}>
            {tags.map((tag, index) => (
              <Pressable key={index} onPress={() => removeTag(tag)}>
                <TagChip tag={tag} />
              </Pressable>
            ))}
          </View>
          {tags.length < 6 && (
            <View style={styles.addTagContainer}>
              <TextInput
                style={[styles.tagInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Add tag..."
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={(e) => {
                  addTag(e.nativeEvent.text);
                }}
              />
            </View>
          )}
        </View>

        <View style={[styles.toggleSection, { marginBottom: spacing.xxl }]}>
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Make public</Text>
          <Pressable 
            style={[styles.toggle, { backgroundColor: isPublic ? colors.accent : colors.elevated }]}
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={[styles.toggleThumb, isPublic ? { alignSelf: 'flex-end' } : {}]} />
          </Pressable>
        </View>

        <AnimatedPressable 
          style={[
            styles.saveButton, 
            animatedButtonStyle, 
            { backgroundColor: colors.accent },
            isLoading && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={isLoading || !url.trim()}
        >
          <Ionicons name="bookmark" size={20} color={colors.textPrimary} />
          <Text style={styles.saveButtonText}>Save Bookmark</Text>
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {},
  header: {},
  title: {},
  subtitle: {},
  inputContainer: {},
  urlInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  urlInput: {
    flex: 1,
    fontSize: 15,
    padding: 12,
  },
  pasteButton: {
    padding: 12,
  },
  fetchButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  fetchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  previewSection: {},
  sectionTitle: {},
  previewCard: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewImagePlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {},
  previewDomain: {
    fontSize: 13,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 15,
  },
  tagsSection: {},
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  addTagContainer: {
    flexDirection: 'row',
  },
  tagInput: {
    fontSize: 15,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    maxWidth: 150,
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 15,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
