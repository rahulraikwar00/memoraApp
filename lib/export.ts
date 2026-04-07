import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import JSZip from "jszip";
import { getBookmarks, Bookmark } from "./db";
import { getInterests } from "./user";

const STORAGE_KEYS = {
  interests: "user_interests",
};

interface ExportManifest {
  version: string;
  exportedAt: number;
  interests: string[];
  bookmarks: ExportBookmark[];
}

interface ExportBookmark {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  domain: string | null;
  tags: string;
  is_public: number;
  is_favorite: number;
  local_path: string | null;
  created_at: number;
  updated_at: number;
}

export interface ImportResult {
  success: boolean;
  total: number;
  added: number;
  skipped: number;
  replaced: number;
  error?: string;
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

function getLocalMediaPath(url: string): string | null {
  if (!url) return null;
  if (url.startsWith(FileSystem.documentDirectory + "images/") ||
      url.startsWith(FileSystem.documentDirectory + "voice/")) {
    return url;
  }
  return null;
}

export async function exportData(): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const bookmarks = await getBookmarks();
    const interests = await getInterests();

    const manifest: ExportManifest = {
      version: "1.0",
      exportedAt: Date.now(),
      interests,
      bookmarks: bookmarks.map(b => ({
        url: b.url,
        title: b.title,
        description: b.description,
        image_url: b.image_url,
        domain: b.domain,
        tags: b.tags,
        is_public: b.is_public,
        is_favorite: b.is_favorite,
        local_path: b.local_path,
        created_at: b.created_at,
        updated_at: b.updated_at,
      })),
    };

    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    const imagesDir = FileSystem.documentDirectory + "images";
    const voiceDir = FileSystem.documentDirectory + "voice";

    const imagesFolder = zip.folder("images");
    const voiceFolder = zip.folder("voice");

    const imageFiles = bookmarks.filter(b => 
      b.domain === "local-image" && b.local_path
    );
    for (const bookmark of imageFiles) {
      if (bookmark.local_path) {
        const filename = bookmark.local_path.split("/").pop();
        if (filename) {
          const fileInfo = await FileSystem.getInfoAsync(bookmark.local_path);
          if (fileInfo.exists) {
            const content = await FileSystem.readAsStringAsync(bookmark.local_path, {
              encoding: FileSystem.EncodingType.Base64,
            });
            imagesFolder?.file(filename, content, { base64: true });
          }
        }
      }
    }

    const voiceFiles = bookmarks.filter(b => 
      b.domain === "local-voice" && b.local_path
    );
    for (const bookmark of voiceFiles) {
      if (bookmark.local_path) {
        const filename = bookmark.local_path.split("/").pop();
        if (filename) {
          const fileInfo = await FileSystem.getInfoAsync(bookmark.local_path);
          if (fileInfo.exists) {
            const content = await FileSystem.readAsStringAsync(bookmark.local_path, {
              encoding: FileSystem.EncodingType.Base64,
            });
            voiceFolder?.file(filename, content, { base64: true });
          }
        }
      }
    }

    const zipBlob = await zip.generateAsync({ type: "base64" });
    const zipUri = FileSystem.cacheDirectory + "memora-backup.zip";
    await FileSystem.writeAsStringAsync(zipUri, zipBlob, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(zipUri, {
        mimeType: "application/zip",
        dialogTitle: "Export Memora Data",
        UTI: "public.zip-archive",
      });
      return { success: true, uri: zipUri };
    } else {
      return { success: true, uri: zipUri };
    }
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: String(error) };
  }
}

export async function importData(): Promise<ImportResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/zip",
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, total: 0, added: 0, skipped: 0, replaced: 0, error: "No file selected" };
    }

    const fileUri = result.assets[0].uri;
    const response = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = await JSZip.loadAsync(response, { base64: true });

    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      return { success: false, total: 0, added: 0, skipped: 0, replaced: 0, error: "Invalid backup: no manifest.json" };
    }

    const manifestContent = await manifestFile.async("string");
    const manifest: ExportManifest = JSON.parse(manifestContent);

    if (!manifest.bookmarks || !Array.isArray(manifest.bookmarks)) {
      return { success: false, total: 0, added: 0, skipped: 0, replaced: 0, error: "Invalid manifest: no bookmarks" };
    }

    const imagesDir = FileSystem.documentDirectory + "images";
    const voiceDir = FileSystem.documentDirectory + "voice";

    const imagesDirInfo = await FileSystem.getInfoAsync(imagesDir);
    if (!imagesDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
    }
    const voiceDirInfo = await FileSystem.getInfoAsync(voiceDir);
    if (!voiceDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(voiceDir, { intermediates: true });
    }

    const { addToSyncQueue } = await import("./db");
    const { updateUserTags } = await import("./db");

    let added = 0;
    let skipped = 0;
    let replaced = 0;

    for (const bookmark of manifest.bookmarks) {
      try {
        let localPath: string | null = null;

        if (bookmark.local_path) {
          const filename = bookmark.local_path.split("/").pop();
          if (!filename) {
            skipped++;
            continue;
          }

          const isImage = bookmark.domain === "local-image";
          const destDir = isImage ? imagesDir : voiceDir;
          const destPath = `${destDir}/${filename}`;

          if (isImage) {
            const imgFile = zip.file(`images/${filename}`);
            if (imgFile) {
              const imgContent = await imgFile.async("base64");
              await FileSystem.writeAsStringAsync(destPath, imgContent, {
                encoding: FileSystem.EncodingType.Base64,
              });
              localPath = destPath;
            }
          } else {
            const voiceFile = zip.file(`voice/${filename}`);
            if (voiceFile) {
              const voiceContent = await voiceFile.async("base64");
              await FileSystem.writeAsStringAsync(destPath, voiceContent, {
                encoding: FileSystem.EncodingType.Base64,
              });
              localPath = destPath;
            }
          }
        }

        const newId = generateId();
        const now = Date.now();

        await addToSyncQueue("create", {
          url: bookmark.url,
          title: bookmark.title,
          description: bookmark.description,
          image_url: bookmark.image_url,
          domain: bookmark.domain,
          tags: bookmark.tags,
          is_public: bookmark.is_public,
          local_path: localPath,
          id: newId,
          created_at: now,
        });

        if (bookmark.tags) {
          try {
            await updateUserTags(bookmark.tags);
          } catch (e) {
            console.log("Tag update error:", e);
          }
        }

        added++;
      } catch (err) {
        console.error("Import bookmark error:", err);
        skipped++;
      }
    }

    return {
      success: true,
      total: manifest.bookmarks.length,
      added,
      skipped,
      replaced,
    };
  } catch (error) {
    console.error("Import error:", error);
    return { success: false, total: 0, added: 0, skipped: 0, replaced: 0, error: String(error) };
  }
}