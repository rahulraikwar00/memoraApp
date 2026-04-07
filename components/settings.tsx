import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useThemeStore } from "../stores/useThemeStore";
import { clearAllData, getBookmarksCount } from "../lib/db";
import { getUsername, getUserAvatar } from "../lib/user";
import LogoutModal from "./LogoutModal";
import { exportData, importData } from "../lib/export";

type ImportStep = "idle" | "selecting" | "extracting" | "importing" | "done" | "error";
type ExportStep = "idle" | "preparing" | "packing" | "sharing" | "done" | "error";

const STORAGE_KEYS = {
  username: "user_username",
  avatarUrl: "user_avatar_url",
  onboardingComplete: "onboarding_complete",
};

export default function SettingsScreen() {
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [exportStep, setExportStep] = useState<ExportStep>("idle");
  const [importStep, setImportStep] = useState<ImportStep>("idle");
  const [importResult, setImportResult] = useState<{ total: number; added: number; skipped: number } | null>(null);
  const { isDark, toggleTheme, colors, spacing, typography, borderRadius } =
    useThemeStore();

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
    setCurrentUsername(username);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your bookmarks and sync data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            await loadStats();
            Alert.alert("Done", "All data has been cleared");
          },
        },
      ],
    );
  };

  const handleExportData = async () => {
    if (exportStep !== "idle") return;
    setExportStep("preparing");
    try {
      setExportStep("packing");
      const result = await exportData();
      if (result.success) {
        setExportStep("sharing");
        setTimeout(() => {
          setExportStep("done");
          setTimeout(() => setExportStep("idle"), 2000);
        }, 1000);
      } else {
        setExportStep("error");
        setTimeout(() => setExportStep("idle"), 2000);
      }
    } catch {
      setExportStep("error");
      setTimeout(() => setExportStep("idle"), 2000);
    }
  };

  const handleImportData = async () => {
    if (importStep !== "idle") return;
    Alert.alert(
      "Import Data",
      "This will add bookmarks from a backup file. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          onPress: async () => {
            setImportStep("selecting");
            try {
              setImportStep("extracting");
              const result = await importData();
              setImportStep("importing");
              await loadStats();
              setImportResult({ total: result.total, added: result.added, skipped: result.skipped });
              setImportStep("done");
              setTimeout(() => setImportStep("idle"), 3000);
            } catch {
              setImportStep("error");
              setTimeout(() => setImportStep("idle"), 2000);
            }
          },
        },
      ],
    );
  };

  const getExportLabel = () => {
    switch (exportStep) {
      case "preparing": return "Preparing...";
      case "packing": return "Packing files...";
      case "sharing": return "Opening share...";
      case "done": return "Export complete!";
      case "error": return "Export failed";
      default: return "Export Data";
    }
  };

  const getImportLabel = () => {
    switch (importStep) {
      case "selecting": return "Selecting file...";
      case "extracting": return "Extracting archive...";
      case "importing": return "Importing data...";
      case "done": return "Import complete!";
      case "error": return "Import failed";
      default: return "Import Data";
    }
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
    rightElement?: React.ReactNode,
  ) => (
    <Pressable
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View
        style={[
          styles.settingIcon,
          { backgroundColor: "rgba(108, 99, 255, 0.15)" },
        ]}
      >
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.settingSubtitle, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement ||
        (onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textTertiary}
          />
        ))}
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textTertiary,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.sm,
              ...typography.caption,
            },
          ]}
        >
          Storage
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              marginHorizontal: spacing.lg,
              borderColor: colors.border,
            },
          ]}
        >
          {renderSettingItem(
            "bookmark",
            "Saved Bookmarks",
            `${bookmarkCount} items`,
            undefined,
            <Text style={[styles.countText, { color: colors.accent }]}>
              {bookmarkCount}
            </Text>,
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textTertiary,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.sm,
              ...typography.caption,
            },
          ]}
        >
          Appearance
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              marginHorizontal: spacing.lg,
              borderColor: colors.border,
            },
          ]}
        >
          {renderSettingItem(
            "moon",
            "Dark Mode",
            isDark
              ? "Currently using dark theme"
              : "Currently using light theme",
            undefined,
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.textTertiary, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />,
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textTertiary,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.sm,
              ...typography.caption,
            },
          ]}
        >
          Data
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              marginHorizontal: spacing.lg,
              borderColor: colors.border,
            },
          ]}
        >
          {renderSettingItem(
            "download-outline",
            getExportLabel(),
            exportStep === "idle" ? "Export your bookmarks as ZIP" : 
              exportStep === "done" ? "Export successful!" :
              exportStep === "error" ? "Something went wrong" :
              "Please wait...",
            exportStep === "idle" ? handleExportData : undefined,
            (exportStep === "preparing" || exportStep === "packing" || exportStep === "sharing") ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : exportStep === "done" ? (
              <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
            ) : exportStep === "error" ? (
              <Ionicons name="close-circle" size={22} color="#ef4444" />
            ) : undefined,
          )}
          {renderSettingItem(
            "cloud-upload-outline",
            getImportLabel(),
            importStep === "idle" ? "Import from backup file" : 
              importStep === "done" ? `Added ${importResult?.added || 0} bookmarks` :
              importStep === "error" ? "Something went wrong" :
              "Please wait...",
            importStep === "idle" ? handleImportData : undefined,
            (importStep === "selecting" || importStep === "extracting" || importStep === "importing") ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : importStep === "done" ? (
              <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
            ) : importStep === "error" ? (
              <Ionicons name="close-circle" size={22} color="#ef4444" />
            ) : undefined,
          )}
          {renderSettingItem(
            "trash-outline",
            "Clear All Data",
            "Delete all bookmarks and sync data",
            handleClearData,
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textTertiary,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.sm,
              ...typography.caption,
            },
          ]}
        >
          Account
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              marginHorizontal: spacing.lg,
              borderColor: colors.border,
            },
          ]}
        >
          {renderSettingItem(
            "person-circle-outline",
            "Username",
            currentUsername || "Not set",
            undefined,
            <Text style={[styles.usernameText, { color: colors.accent }]}>
              {currentUsername}
            </Text>,
          )}
          {renderSettingItem(
            "log-out-outline",
            "Logout",
            "Sign out and switch account",
            handleLogout,
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: spacing.xxl }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textTertiary,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.sm,
              ...typography.caption,
            },
          ]}
        >
          About
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              marginHorizontal: spacing.lg,
              borderColor: colors.border,
            },
          ]}
        >
          {renderSettingItem(
            "information-circle-outline",
            "Version",
            undefined,
            undefined,
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              1.0.0
            </Text>,
          )}
          {renderSettingItem(
            "document-text-outline",
            "Terms of Service",
            undefined,
            () => handleOpenLink("https://example.com/terms"),
          )}
          {renderSettingItem(
            "shield-checkmark-outline",
            "Privacy Policy",
            undefined,
            () => handleOpenLink("https://example.com/privacy"),
          )}
        </View>
      </View>

      <View style={[styles.footer, { paddingVertical: spacing.huge }]}>
        <Text
          style={[
            styles.footerText,
            { color: colors.textTertiary, ...typography.title },
          ]}
        >
          Memora
        </Text>
        <Text
          style={[
            styles.footerSubtext,
            {
              color: colors.textTertiary,
              marginTop: spacing.xs,
              ...typography.caption,
            },
          ]}
        >
          Your offline-first bookmark manager
        </Text>
      </View>

      <LogoutModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {},
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "400",
  },
  settingSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
  countText: {
    fontSize: 15,
    fontWeight: "600",
  },
  usernameText: {
    fontSize: 15,
    fontWeight: "500",
  },
  versionText: {
    fontSize: 15,
    fontWeight: "400",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {},
  footerSubtext: {},
});
