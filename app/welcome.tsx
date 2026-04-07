import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../constants/theme';
import { generateRandomUsername, getAvatarUrl, saveUser } from '../lib/user';
import { authApi } from '../lib/api';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const AVAILABLE_TAGS = [
  'tech', 'design', 'music', 'art', 'science', 'gaming', 
  'news', 'food', 'travel', 'fitness', 'business', 'photography',
  'video', 'writing', 'coding', 'fashion', 'sports', 'movies'
];

const FEATURES = [
  { icon: 'bookmark-outline', title: 'Save Links', desc: 'Save any webpage instantly' },
  { icon: 'compass-outline', title: 'Discover', desc: 'Explore trending content' },
  { icon: 'cloud-sync-outline', title: 'Sync', desc: 'Your bookmarks everywhere' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [previewUsername, setPreviewUsername] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username || username.length < 3) {
      setAvailability(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const result = await authApi.checkUsername(username);
        setAvailability(result.available);
      } catch (e) {
        setAvailability(true);
      } finally {
        setIsChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (screen === 3 && !username) {
      setUsername(generateRandomUsername());
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 1 && !previewUsername) {
      setPreviewUsername(generateRandomUsername());
    }
  }, [screen]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : prev.length < 5 
          ? [...prev, tag]
          : prev
    );
  };

  const previewAvatarUrl = previewUsername ? getAvatarUrl(previewUsername) : null;
  const avatarUrl = username ? getAvatarUrl(username) : null;

  const handleContinue = async () => {
    if (screen === 1) {
      setScreen(2);
      return;
    }

    if (screen === 2) {
      if (selectedTags.length === 0) return;
      setScreen(3);
      return;
    }

    if (!username || !username.trim() || !availability) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const deviceId = await SecureStore.getItemAsync('device_id') || 
        Crypto.randomUUID();
      await SecureStore.setItemAsync('device_id', deviceId);
      
      try {
        await authApi.register(deviceId, username, avatarUrl || undefined, selectedTags);
      } catch (e) {
        console.log('Server register failed:', e);
      }
      
      await saveUser(username.trim().toLowerCase().replace(/\s+/g, '-'), selectedTags);
      router.replace('/');
    } catch (e) {
      console.error('Error saving user:', e);
      setError('Failed to set up account');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBorderColor = availability === false ? colors.danger: 
    availability === true ? colors.success : colors.border;

  const canContinue = screen === 1 || (screen === 2 && selectedTags.length > 0) || (screen === 3 && availability && !isLoading && !isChecking);

  const renderScreen = () => {
    switch (screen) {
      case 1:
        return (
          <View style={styles.welcomeContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="bookmark" size={64} color={colors.accent} />
            </View>
            
            <Text style={[styles.appName, { color: colors.textPrimary }]}>MEMORA</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Your personal bookmark space
            </Text>

            <View style={[styles.avatarContainer, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: spacing.xl }]}>
              {previewAvatarUrl ? (
                <Image
                  source={{ uri: previewAvatarUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={colors.textTertiary} />
                </View>
              )}
            </View>

            <View style={styles.features}>
              {FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.card }]}>
                    <Ionicons name={feature.icon as any} size={20} color={colors.accent} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                      {feature.title}
                    </Text>
                    <Text style={[styles.featureDesc, { color: colors.textTertiary }]}>
                      {feature.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={() => setScreen(2)}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </View>
        );

      case 2:
        return (
          <ScrollView style={styles.interestsContent} contentContainerStyle={styles.interestsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              What are you into?
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Pick up to 5 topics to personalize your feed
            </Text>

            <View style={styles.tagsGrid}>
              {AVAILABLE_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedTags.includes(tag) && { backgroundColor: colors.accent, borderColor: colors.accent }
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[
                    styles.tagText,
                    { color: colors.textPrimary },
                    selectedTags.includes(tag) && { color: '#fff' }
                  ]}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.selectedCount, { color: colors.textTertiary }]}>
              {selectedTags.length}/5 selected
            </Text>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.accent },
                selectedTags.length === 0 && styles.buttonDisabled
              ]}
              onPress={() => setScreen(3)}
              disabled={selectedTags.length === 0}
            >
              <Text style={styles.buttonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </ScrollView>
        );

      case 3:
        return (
          <View style={styles.usernameContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Pick a username
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              This is how you&apos;ll appear to others
            </Text>

            <View style={[styles.avatarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={colors.textTertiary} />
                </View>
              )}
            </View>

            {isChecking && (
              <View style={styles.statusRow}>
                <Ionicons name="hourglass-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.statusText, { color: colors.textTertiary }]}>Checking...</Text>
              </View>
            )}
            {!isChecking && availability === false && (
              <View style={styles.statusRow}>
                <Ionicons name="close-circle" size={14} color={colors.danger} />
                <Text style={[styles.statusText, { color: colors.danger }]}>Username taken</Text>
              </View>
            )}
            {!isChecking && availability === true && username && username.length >= 3 && (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={[styles.statusText, { color: '#4CAF50' }]}>Available!</Text>
              </View>
            )}

            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: inputBorderColor, color: colors.textPrimary }
              ]}
              value={username ?? ''}
              onChangeText={(text) => {
                setUsername(text.toLowerCase().replace(/\s+/g, '-'));
                setAvailability(null);
              }}
              placeholder="username"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            {error && (
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            )}

            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              You can change this anytime in Settings
            </Text>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.accent },
                (isLoading || !availability) && styles.buttonDisabled
              ]}
              onPress={handleContinue}
              disabled={isLoading || !availability}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Setting up...' : 'Continue'}
              </Text>
            </Pressable>
          </View>
        );
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: spacing.xl + insets.top }]}>
        {renderScreen()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: 16,
    marginBottom: spacing.xxl,
  },
  features: {
    width: '100%',
    marginBottom: spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  interestsContent: {
    flex: 1,
  },
  interestsContainer: {
    flexGrow: 1,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCount: {
    textAlign: 'center',
    marginBottom: spacing.md,
    fontSize: 13,
  },
  usernameContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  input: {
    width: '100%',
    maxWidth: 280,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 12,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
});