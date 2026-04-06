import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../constants/theme';
import { generateRandomUsername, getAvatarUrl, saveUser } from '../lib/user';
import { authApi } from '../lib/api';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const FEATURES = [
  { icon: 'bookmark-outline', title: 'Save Links', desc: 'Save any webpage instantly' },
  { icon: 'compass-outline', title: 'Discover', desc: 'Explore trending content' },
  { icon: 'cloud-sync-outline', title: 'Sync', desc: 'Your bookmarks everywhere' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState(1);
  const [previewUsername, setPreviewUsername] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced username check
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
        console.log('Username check error:', e);
        // If server is down, allow anyway
        setAvailability(true);
      } finally {
        setIsChecking(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [username]);

  // Generate initial username
  useEffect(() => {
    if (screen === 2 && !username) {
      setUsername(generateRandomUsername());
    }
  }, [screen]);

  // Generate preview avatar for screen 1
  useEffect(() => {
    if (screen === 1 && !previewUsername) {
      const random = generateRandomUsername();
      setPreviewUsername(random);
    }
  }, [screen]);

  const previewAvatarUrl = previewUsername ? getAvatarUrl(previewUsername) : null;
  const avatarUrl = username ? getAvatarUrl(username) : null;

  const handleContinue = async () => {
    if (!username || !username.trim() || !availability) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate a unique device ID
      const deviceId = await SecureStore.getItemAsync('device_id') || 
        Crypto.randomUUID();
      await SecureStore.setItemAsync('device_id', deviceId);
      
      // Try to register on server
      try {
        await authApi.register(deviceId, username, avatarUrl || undefined);
      } catch (e) {
        console.log('Server register failed (may already exist):', e);
      }
      
      // Save locally regardless of server response
      await saveUser(username.trim().toLowerCase().replace(/\s+/g, '-'));
      router.replace('/');
    } catch (e) {
      console.error('Error saving user:', e);
      setError('Failed to set up account');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBorderColor = availability === false ? colors.danger : 
    availability === true ? colors.success : colors.border;

  const canContinue = availability && !isLoading && !isChecking;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: spacing.xl + insets.top }]}>
        {screen === 1 ? (
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
        ) : (
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

            {/* Availability indicator */}
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
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
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
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  usernameContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: spacing.lg,
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