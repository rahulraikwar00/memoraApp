# Senior Technical Lead Interview Deep-Dive: MemoraApp

This document identifies 30 high-level technical questions designed to test a candidate's architectural depth, engineering foundations, and mindset. These are based on the actual implementation patterns found in the MemoraApp codebase (Offline-first sync, SQLite/Drizzle, React Native/Expo, etc.).

---

## 1. Architecture & Design Patterns

1. **Layered Decoupling**: In `lib/db.ts` and `lib/sync.ts`, we see a clear separation between local storage and remote synchronization. Why is this decoupling critical in an offline-first application, and how would you handle a scenario where the schema on the server changes but the local SQLite schema is outdated?
2. **State Management Choice**: We use `Zustand` for state management instead of `Redux` or `Context API`. At what scale does Zustand begin to show limitations, and how would you refactor the current store structure if we reached 100+ different state slices?
3. **ORM vs. Raw SQL**: The project uses `Drizzle ORM`. Why might a Senior Lead choose Drizzle over Prisma or raw SQL for a React Native project using `expo-sqlite`? What are the specific performance trade-offs during the migration phase?
4. **Singleton vs. Instance**: Our `ApiClient` in `lib/api.ts` is exported as a singleton instance. Under what conditions would you refactor this to a Factory pattern or use Dependency Injection (DI)?
5. **Cross-Platform Abstraction**: React Native allows sharing code, but some features (like file paths in `FileSystem`) require platform-specific handling. How do you design a "Universal Storage" abstraction that hides these details from the UI components?

## 2. Offline-First & Data Integrity (The "Hard" Part)

6.  **Conflict Resolution Strategy**: Currently, the sync logic appears to follow a "Last-Write-Wins" or sequential queue approach. How would you implement **Operational Transformation (OT)** or **CRDTs** if Memora supported real-time collaborative bookmark editing?
7.  **Atomic Sync Operations**: If a user saves a bookmark with an image and a voice note simultaneously, and the network fails halfway through the sync of the image, how does our `syncQueue` ensure the "whole" bookmark is eventually consistent?
8.  **Idempotency in API Design**: Many sync items use `Date.now() + Math.random()` for IDs. Is this sufficient for a globally distributed system? How would you implement server-side idempotency to prevent duplicate bookmarks if a client retries a "successful" request that timed out locally?
9.  **Sync Queue Starvation**: If a single "large" sync item (e.g., a 50MB HD video bookmark) repeatedly fails and blocks the `BATCH_SIZE = 5` queue, how would you redesign the `syncNow()` worker to prevent head-of-line blocking?
10. **Partial Sync State**: A user has 500 pending items. The app is closed during the 250th item's sync. Explain how the `markSyncItemComplete` and `status` fields in `sync_queue` prevent data loss or double-posting.

## 3. Performance & Optimization

11. **SQLite FTS5 Fallback**: In `lib/db.ts`, we try FTS5 and then fallback to `LIKE`. Why is FTS5 significantly faster for searching 10,000+ bookmarks, and what are the specific index maintenance costs associated with it? 
12. **FlatList "Windowing"**: In `app/(tabs)/index.tsx`, we use `FlatList`. As the library grows to 5,000+ items, what specific props (`initialNumToRender`, `windowSize`, `maxToRenderPerBatch`) would you tune, and why?
13. **Image/Audio Memory Management**: Saved assets are stored in the local file system. How do you prevent the OS from purging these files during "low disk space" events, and how do you handle memory leaks when rendering many high-res images in a grid?
14. **JS Thread vs. UI Thread**: Explain how `react-native-reanimated` (used in `save.tsx`) helps keep the interface responsive even when the JS thread is busy processing a large database migration or sync payload.
15. **Query Debouncing**: We debounce search queries by 150ms. If the database grows significantly, would you move the filtering logic to a **Web Worker** (if supported) or a background thread in SQLite? How does Drizzle handle concurrent read/write locks?

## 4. Security & Robustness

16. **Token Persistence**: Our `AuthStore` persists tokens. If a device is compromised, how would you implement "Secure Enclave" storage (Keychain/Keystore) in Expo, and what are the limitations of `AsyncStorage`?
17. **API Rate Limiting & Backoff**: We use exponential backoff in `calculateBackoff`. In a DDOS situation, how would the client differentiate between a "Safe to retry" 503 and a "Stop immediately" 429?
18. **Input Sanitization**: In `save.tsx`, we handle URLs. Beyond `new URL(urlString)`, what common security vulnerabilities (like SSRF if the server does the scraping) must the lead be aware of when saving user-provided links?
19. **Privacy Leaks in Logs**: We `console.log` sync results. In a production build, how do you implement a sanitizing logger that prevents PII (titles, URLs) from leaking into crash reporting tools like Sentry?
20. **Biometric Guard**: How would you architect a "Private Vault" feature where specific bookmarks require a `LocalAuthentication` prompt before the SQLite query is even executed?

## 5. Engineering Mindset & Scalability

21. **Legacy Support**: We have `// Re-export types for backwards compatibility` in `db.ts`. How do you manage technical debt during a major refactor without breaking the existing local database of 100,000 users?
22. **Observability**: If a user reports "My search is slow," but you can't reproduce it, what telemetry (performance markers, query timing) would you add to the next build to diagnose the issue?
23. **Battery Impact**: The `syncInterval` is set to 30 seconds. How does this impact battery life on iOS/Android, and what would be a more "power-efficient" trigger (like Push Notifications or Background Fetch)?
24. **Database Migrations**: We use Drizzle. Explain the process of adding a "Category" column to the `bookmarks` table to ensure that none of the existing user data is wiped during the app update.
25. **Modularization**: If the "Save" feature became extremely complex (OCR, Video processing, AI summarization), how would you split `save.tsx` (already 1000+ lines) into manageable sub-modules without "prop-drilling" everything?
26. **Testing Strategy**: How would you mock the SQLite database for unit tests vs. integration tests? Is it worth running a full "Sync Integration" test on every PR?
27. **Resource Cleanup**: In `sync.ts`, we have `stopSyncWorker`. Why is it critical to unsubscribe from `NetInfo` and `AppState` listeners, and what happens if the app context is destroyed before they finish?
28. **Third-party Bloat**: Every package added (like `expo-audio` or `reanimated`) increases the bundle size. How do you justify adding a new dependency to the team vs. writing a custom bridge?
29. **Build Pipeline**: For a production app, how would you automate the "Asset Optimization" (downscaling saved images) in the background to save user storage?
30. **Mental Model**: Choose any file in the repo. If you had to rewrite it from scratch with an "infinite budget," what is the one thing you would change architecturally?

---

# Selected Lead-Level Answers (The Depth)

### Ques 1: Layered Decoupling & Schema Evolution
**Answer**: Decoupling allows the UI to remain optimistic (instant UI update) while the "Sync Engine" works in the background. For schema evolution, a Lead implements **Database Versioning**. If the server schema changes (e.g., `tags` becomes an array of objects), the client must include a `schema_version` in the sync payload. The server then decides to:
1. Run a migration on the fly.
2. Reject the sync and force an app update.
3. Provide a translation layer (Adapter Pattern) to support older client versions temporarily.

### Ques 6: Conflict Resolution (CRDTs vs LWW)
**Answer**: "Last-Write-Wins" is simple but leads to data loss in collaborative environments. For a "Gold Standard" implementation, I would recommend **LWW-Element-Set CRDTs** for tags and **JSON-CRDTs** for the bookmark body. Each change is recorded with a `Lamport Timestamp`. Conflicts are resolved deterministically on the client before syncing, ensuring the server remains a "dumb storage" for converging states.

### Ques 9: Head-of-Line Blocking in Sync
**Answer**: The current sequential batching is prone to starvation. To fix this, I would implement **Multi-Channel Queuing**:
- **Channel A**: Small metadata (Links, Notes) - High priority, processed instantly.
- **Channel B**: Large assets (Audio, Images) - Low priority, processed only on Wi-Fi/Unlimited data.
If an item fails repeatedly, it should be moved to a "Dead Letter Queue" after `MAX_RETRIES`, notifying the user rather than halting the background sync worker.

### Ques 11: SQLite FTS5 vs LIKE
**Answer**: `LIKE` perform a full table scan ($O(N)$ complexity), which is slow. FTS5 uses an **Inverted Index** (similar to Elasticsearch) where search is $O(M)$ (M being query length). The trade-off is Disk Space: FTS5 requires a separate virtual table that duplicates some content, and "Write Performance" drops slightly because every insert/update must also update the search index.

### Ques 14: JS vs UI Thread (Reanimated)
**Answer**: Standard `Animated` library often communicates with the JS thread on every frame (16ms). If the JS thread is busy (e.g., `JSON.parse` of a 1MB sync payload), animations stutter. `Reanimated` runs the animation logic on the **UI Thread** using "Worklets". This ensures that even if the app's logic "freezes" for a split second, the user sees a smooth 60fps interaction (like the scale-down on the Save button).

### Ques 23: Power Efficiency of 30s Polling
**Answer**: Constant 30s polling is a "battery killer" because it keeps the radio active. A Lead would shift to **Event-Driven Sync**:
1. Immediate sync on "User Action" (Saving/Editing).
2. "Lazy Sync" when the app returns to foreground.
3. Server-initiated sync via **Silent Push Notifications** (FCM/APNs) to tell the client "Data has changed, pull now."

---

*Prepared by: Antigravity (Senior AI Coding Assistant)*
