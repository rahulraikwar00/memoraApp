import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useBookmarkStore } from "../../stores/useBookmarkStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { Bookmark, updateBookmark as dbUpdateBookmark } from "../../lib/db";

export default function NoteReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useThemeStore();
  const { bookmarks, togglePublic, removeBookmark } = useBookmarkStore();

  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    const found = bookmarks.find((b) => b.id === id);
    setBookmark(found || null);
    if (found) {
      setEditTitle(found.title || "");
      setEditDescription(found.description || "");
    }
  }, [id, bookmarks]);

  const handleCopy = async () => {
    const text = bookmark?.description || bookmark?.title || "";
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Note copied to clipboard");
  };

  const handleSave = async () => {
    if (!bookmark) return;
    await dbUpdateBookmark(bookmark.id, {
      title: editTitle,
      description: editDescription,
    });
    setIsEditing(false);
    Alert.alert("Saved", "Note updated");
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (bookmark) {
              await removeBookmark(bookmark.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleTogglePublic = async () => {
    if (!bookmark) return;
    await togglePublic(bookmark.id);
  };

  if (!bookmark) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Note</Text>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Note not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Note
        </Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleCopy} style={styles.headerButton}>
            <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
          </Pressable>
          {isEditing ? (
            <Pressable onPress={handleSave} style={styles.headerButton}>
              <Ionicons name="checkmark" size={24} color={colors.accent} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setIsEditing(true)} style={styles.headerButton}>
              <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { padding: spacing.lg }]}
      >
        {isEditing ? (
          <>
            <TextInput
              style={[styles.editTitle, { color: colors.textPrimary, borderColor: colors.border }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor={colors.textTertiary}
            />
            <TextInput
              style={[styles.editDescription, { color: colors.textPrimary, borderColor: colors.border }]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Write your note..."
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </>
        ) : (
          <>
            {bookmark.title && (
              <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>
                {bookmark.title}
              </Text>
            )}
            <Text style={[styles.noteText, { color: colors.textPrimary }]}>
              {bookmark.description || "No content"}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable onPress={handleTogglePublic} style={styles.footerButton}>
          <Ionicons
            name={bookmark.is_public ? "globe" : "lock-closed"}
            size={20}
            color={colors.textPrimary}
          />
          <Text style={[styles.footerText, { color: colors.textPrimary }]}>
            {bookmark.is_public ? "Public" : "Private"}
          </Text>
        </Pressable>
        <Pressable onPress={handleDelete} style={styles.footerButton}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={[styles.footerText, { color: colors.danger }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  noteTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    lineHeight: 28,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 24,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: "600",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  editDescription: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
  },
});