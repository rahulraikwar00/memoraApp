import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useThemeStore } from '../../stores/useThemeStore';
import { clearAllData, getBookmarksCount } from '../../lib/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { getUsername, updateUsername, getUserAvatar, isOnboardingComplete } from '../../lib/user';
import * as SecureStore from 'expo-secure-store';
import LogoutModal from '../../components/LogoutModal';

const STORAGE_KEYS = {
  username: 'user_username',
  avatarUrl: 'user_avatar_url',
  onboardingComplete: 'onboarding_complete',
};

export default function SettingsScreen() {
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const { isDark, toggleTheme, colors, spacing, typography, borderRadius } = useThemeStore();
  const { isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    loadStats();
    loadUser();
  }, []);

  const loadStats = async () => {
    const count = await getBookmarksCount();
    setBookmarkCount(count);
  };

  const loadUser = async () => {
    const username = await getUsername();
    const avatar = await getUserAvatar();
    setCurrentUsername(username);
    setCurrentAvatar(avatar);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your bookmarks and sync data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadStats();
            Alert.alert('Done', 'All data has been cleared');
          }
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('Export', 'Export functionality coming soon');
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleOpenLink = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const renderSettingItem = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <Pressable 
      style={[styles.settingItem, { borderBottomColor: colors.border }]} 
      onPress={onPress} 
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: 'rgba(108, 99, 255, 0.15)' }]}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />)}
    </Pressable>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, ...typography.caption }]}>Storage</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius.md, marginHorizontal: spacing.lg, borderColor: colors.border }]}>
          {renderSettingItem(
            'bookmark', 
            'Saved Bookmarks', 
            `${bookmarkCount} items`,
            undefined,
            <Text style={[styles.countText, { color: colors.accent }]}>{bookmarkCount}</Text>
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, ...typography.caption }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius.md, marginHorizontal: spacing.lg, borderColor: colors.border }]}>
          {renderSettingItem(
            'moon',
            'Dark Mode',
            isDark ? 'Currently using dark theme' : 'Currently using light theme',
            undefined,
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.textTertiary, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, ...typography.caption }]}>Data</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius.md, marginHorizontal: spacing.lg, borderColor: colors.border }]}>
          {renderSettingItem(
            'download-outline',
            'Export Data',
            'Export your bookmarks as JSON',
            handleExportData
          )}
          {renderSettingItem(
            'trash-outline',
            'Clear All Data',
            'Delete all bookmarks and sync data',
            handleClearData
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, ...typography.caption }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius.md, marginHorizontal: spacing.lg, borderColor: colors.border }]}>
          {renderSettingItem(
            'person-circle-outline',
            'Username',
            currentUsername || 'Not set',
            undefined,
            <Text style={[styles.usernameText, { color: colors.accent }]}>{currentUsername}</Text>
          )}
          {renderSettingItem(
            'log-out-outline',
            'Logout',
            'Sign out and switch account',
            handleLogout
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, ...typography.caption }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius.md, marginHorizontal: spacing.lg, borderColor: colors.border }]}>
          {renderSettingItem(
            'information-circle-outline',
            'Version',
            undefined,
            undefined,
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>1.0.0</Text>
          )}
          {renderSettingItem(
            'document-text-outline',
            'Terms of Service',
            undefined,
            () => handleOpenLink('https://example.com/terms')
          )}
          {renderSettingItem(
            'shield-checkmark-outline',
            'Privacy Policy',
            undefined,
            () => handleOpenLink('https://example.com/privacy')
          )}
        </View>
      </View>

      <View style={[styles.footer, { paddingVertical: spacing.huge }]}>
        <Text style={[styles.footerText, { color: colors.textTertiary, ...typography.title }]}>Memora</Text>
        <Text style={[styles.footerSubtext, { color: colors.textTertiary, marginTop: spacing.xs, ...typography.caption }]}>Your offline-first bookmark manager</Text>
      </View>

      <LogoutModal visible={logoutModalVisible} onClose={() => setLogoutModalVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {},
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  settingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  countText: {
    fontSize: 15,
    fontWeight: '600',
  },
  usernameText: {
    fontSize: 15,
    fontWeight: '500',
  },
  versionText: {
    fontSize: 15,
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {},
  footerSubtext: {},
});
