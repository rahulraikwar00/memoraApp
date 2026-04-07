# Implementation Deep Dive: MemoraApp Architecture

This document provides a technical "How-To" for the core systems within MemoraApp. It focuses on the architectural decisions and implementation details required to build a robust, offline-first mobile experience.

---

## 1. The Offline-First Sync Engine
**Question: "How did you implement the background synchronization?"**

The sync engine (found in `lib/sync.ts`) uses an **Outbox Pattern**. Instead of calling the API directly from the UI, every action (create, update, delete) is first recorded in a local `sync_queue` table in SQLite.

### Key Mechanics:
1.  **Atomic Persistence**: When a user saves a bookmark, two operations occur in a single transaction:
    -   The bookmark is saved to the `bookmarks` table (for instant UI updates).
    -   An entry is added to `sync_queue` with the operation type and payload.
2.  **Worker Lifecycle**: The `startSyncWorker` function listens for:
    -   `NetInfo`: Triggers sync as soon as the device regains connectivity.
    -   `AppState`: Triggers sync when the app returns to the foreground.
    -   `Interval`: A safety fallback sync every 30 seconds.
3.  **Exponential Backoff**: If a sync fails, we don't immediately retry and drain the battery. We use a `calculateBackoff` function:
    ```typescript
    const delay = BASE_DELAY * Math.pow(2, retryCount);
    ```
    This ensures that persistent network failures result in less frequent attempts, preserving system resources.

---

## 2. Scalable Search with SQLite FTS5
**Question: "How did you make search so fast for thousands of bookmarks?"**

Standard `LIKE %query%` searches in SQLite perform a full table scan ($O(N)$), which lags as the database grows. In `lib/db.ts`, we implement **Full-Text Search (FTS5)**.

### Implementation:
1.  **Virtual Table**: We maintain a separate `bookmarks_fts` virtual table that uses the FTS5 engine. This table doesn't store the full object—only the `id` and the text fields (`title`, `description`, `tags`, `domain`).
2.  **Inverted Index**: FTS5 builds an inverted index, allowing for $O(1)$ lookups based on partial strings or prefixes.
3.  **The Fallback**: Since not all SQLite environments (especially in varied Android versions) support FTS5 by default, we use a `try...catch` block:
    ```typescript
    // Try FTS5 first
    const ftsQuery = searchTerms.map(term => `"${term}"*`).join(' OR ');
    return await expoDb.getAllAsync<Bookmark>(FTS_SQL_QUERY, [ftsQuery]);
    // Fallback to LIKE if FTS5 is not available
    ```

---

## 3. Hybrid Asset Storage (Images & Audio)
**Question: "How do you handle saving large media files if the database only stores text?"**

MemoraApp uses a **Hybrid Storage Strategy**. We don't store binary data (BLOBs) in the SQLite database, as this would bloat the DB and slow down migrations.

### The Flow (Example: Voice Notes):
1.  **Capture**: In `save.tsx`, the `AudioModule` records the audio and saves a temporary `.m4a` file.
2.  **Move to Permanent Gear**: We use `expo-file-system` to move the file from the temporary directory to the app's persistent `documents/voice/` folder.
3.  **Reference Persistence**: We store the **local file URI** in the `bookmarks.local_path` column in SQLite.
4.  **UI Playback**: When the card is rendered, we check if `local_path` exists. If it does, we pass that URI directly to the `AudioModule` for instant local playback, bypassing the network entirely.

---

## 4. Responsive Grid & Dynamic UI
**Question: "How did you implement the Masonry-style grid with variable card heights?"**

The main feed (in `app/(tabs)/index.tsx`) uses a 2-column `FlatList`. To achieve the "Pinterest-style" look where cards have different heights based on their content (Images vs. Notes), we rely on a combination of **Reanimated** and **Flexbox**.

### Tactics:
1.  **Column Wrapper**: We use the `columnWrapperStyle` prop in `FlatList` to add spacing Between the two columns.
2.  **Aspect Ratio Handling**: For images, we calculate the aspect ratio from the metadata or the local file, ensuring the card scales correctly without warping.
3.  **Conditional Rendering**: The `GridBookmarkCard` component uses a polymorphic rendering strategy—changing its layout dynamically based onWhether the content type is a `link`, `note`, `voice`, or `image`.

---

## 5. Global State Orchestration (Zustand)
**Question: "How do you keep the UI, the DB, and the Sync worker in sync?"**

We use **Zustand** as our central orchestrator. 

### The Loop:
-   **Actions**: When a user triggers `addBookmark`, the Zustand store (`useBookmarkStore`) calls the `db.ts` function.
-   **Reactivity**: Once the DB update is confirmed, the store updates its internal `bookmarks` array.
-   **Persistence**: Because the UI is subscribed to the Zustand store, the view updates immediately (**Optimistic UI**), while the internal `syncNow()` function is triggered in the background to handle the network side.

---

*Prepared by: Antigravity (Senior Technical Lead)*
