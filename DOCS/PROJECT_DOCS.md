# Memora - Project Documentation

## App Flow Diagram

```mermaid
flowchart TD
    %% Entry Points
    Start([App Launch]) --> AuthCheck{Authenticated?}
    
    %% Authentication
    AuthCheck -->|No| Register[Register / Login]
    Register --> AuthCheck
    AuthCheck -->|Yes| MainTabs
    
    %% Main Tabs
    MainTabs --> Tab1[Library]
    MainTabs --> Tab2[Search]
    MainTabs --> Tab3[Save]
    MainTabs --> Tab4[Discover]
    MainTabs --> Tab5[Settings]
    
    %% Library Flow
    Tab1 --> ViewBookmarks[View Bookmarks]
    ViewBookmarks --> Action1{Favorite?}
    Action1 -->|Yes| Unfavorite[Remove from Favorites]
    Action1 -->|No| Favorite[Add to Favorites]
    ViewBookmarks --> Action2{Open?}
    Action2 --> OpenBrowser[Open in Browser]
    ViewBookmarks --> Action3{Delete?}
    Action3 --> Delete[Delete Bookmark]
    
    %% Search Flow
    Tab2 --> SearchInput[Enter Search Query]
    SearchInput --> Filter[Apply Filters]
    Filter --> TypeFilter{Content Type?}
    TypeFilter -->|Link| LinkResults[Link Results]
    TypeFilter -->|Image| ImageResults[Image Results]
    TypeFilter -->|Note| NoteResults[Note Results]
    TypeFilter -->|Voice| VoiceResults[Voice Results]
    Filter --> TagFilter{Tags?}
    TagFilter --> FilteredResults[Filtered Results]
    
    %% Save Flow
    Tab3 --> EnterURL[Enter URL]
    EnterURL --> Extract[Extract Metadata]
    Extract --> AddTags[Add Tags]
    AddTags --> SetPrivacy{Set Public/Private}
    SetPrivacy --> Save[Save Bookmark]
    Save --> TrackTags[Track Tags in user_tags]
    TrackTags --> SyncToServer{Sync Enabled?}
    SyncToServer -->|Yes| Sync[Sync to Server]
    
    %% Discover Flow
    Tab4 --> GetTopTags[Get Top 10 Tags]
    GetTopTags --> ServerFeed[Query Server API]
    ServerFeed --> PersonalizedFeed[Personalized Feed]
    PersonalizedFeed --> Vote{Vote on Bookmark}
    Vote -->|Upvote| Upvote[Upvote]
    Vote -->|Downvote| Downvote[Downvote]
    
    %% Settings Flow
    Tab5 --> ThemeSettings[Theme Settings]
    ThemeSettings --> DarkMode{Dark Mode?}
    DarkMode -->|Yes| Dark[Dark Theme]
    DarkMode -->|No| Light[Light Theme]
    Tab5 --> SyncSettings[Sync Settings]
    SyncSettings --> ManualSync[Manual Sync]
    ManualSync --> ServerSync[Sync to Server]
    
    %% Audio Playback
    VoiceResults --> PlayAudio[Play Voice Note]
    PersonalizedFeed --> PlayAudio
    PlayAudio --> AudioPlayer[Audio Player Active]
    AudioPlayer --> TabSwitch{Tab Switch?}
    TabSwitch -->|Yes| StopAudio[Stop Audio]
    TabSwitch -->|No| ContinueAudio[Continue Playing]
```

## System Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Mobile App (Expo/React Native)"]
        UI["UI Layer<br/>Screens & Components"]
        State["Zustand State<br/>Stores"]
        API["API Client<br/>lib/api.ts"]
        DB["Local SQLite<br/>expo-sqlite"]
    end
    
    subgraph Server["Backend Server (Express.js)"]
        Express["Express Server<br/>index.ts"]
        Routes["API Routes<br/>(/api/feed, /api/sync, ...)"]
        DBServer["better-sqlite3<br/>Database"]
    end
    
    subgraph External["External Services"]
        Browser["Web Browser<br/>(Open URLs)"]
        Internet["Internet<br/>(URL Metadata)"]
    end
    
    UI --> State
    State --> DB
    State --> API
    API --> Express
    Express --> Routes
    Routes --> DBServer
    UI --> Browser
    API --> Internet
    
    %% Data Flow Annotations
    DB -- "Local Storage<br/>bookmarks, user_tags" --> DB
    Express -- "Sync<br/>bookmarks, tags" --> API
    Internet -- "Metadata Extraction<br/>(title, desc, image)" --> API
```

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Layer
    participant Store as Zustand Store
    participant LocalDB as Local SQLite
    participant API as API Client
    participant Server as Express Server
    participant RemoteDB as Server Database
    
    Note over User,Server: Save Bookmark Flow
    User->>UI: Enter URL
    UI->>Store: saveBookmark(url)
    Store->>LocalDB: INSERT bookmarks
    Store->>LocalDB: UPDATE user_tags
    LocalDB-->>Store: Success
    Store->>API: POST /api/sync
    API->>Server: Sync Request
    Server->>RemoteDB: INSERT/UPDATE bookmarks
    Server-->>API: Success
    API-->>Store: Synced
    Store-->>UI: Updated
    
    Note over User,Server: Discover Feed Flow
    User->>UI: Open Discover Tab
    UI->>Store: getTopTags()
    Store->>LocalDB: SELECT top 10 tags
    LocalDB-->>Store: tags (react, design)
    Store->>API: GET /api/feed?tags=react,design
    API->>Server: Feed Request
    Server->>RemoteDB: Query by tags
    RemoteDB-->>Server: Feed items
    Server-->>API: JSON response
    API-->>Store: Feed data
    Store-->>UI: Render Feed
    
    Note over User,Server: Audio Playback Flow
    User->>UI: Tap Voice Bookmark
    UI->>Store: playAudio(id, uri)
    Store->>Store: Set currentlyPlayingId
    Store->>UI: Show Audio Player
    UI-->>User: Playing...
    User->>UI: Switch Tab
    UI->>Store: stopAudio()
    Store->>Store: Clear currentlyPlayingId
    Note over UI,Store: Auto-stop on focus blur
```

## Overview

Memora is a mobile bookmark management app built with Expo (React Native). It allows users to save, organize, and discover web bookmarks with tags. The app features a personalized discovery feed that recommends bookmarks based on user's saved interests.

## Tech Stack

| Category | Technology |
|----------|-------------|
| Framework | Expo SDK 54 + React Native 0.81 |
| Navigation | expo-router v6 |
| State Management | Zustand |
| Database | expo-sqlite (local) + better-sqlite3 (server) |
| Audio | expo-av |
| UI Components | React Native + react-native-reanimated |
| Backend | Express.js (Node.js) |

## Project Structure

```
memora/
├── app/                    # expo-router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Library (saved bookmarks)
│   │   ├── search.tsx     # Search bookmarks
│   │   ├── save.tsx       # Save new bookmark
│   │   ├── discover.tsx   # Discover community bookmarks
│   │   ├── settings.tsx   # App settings
│   │   └── _layout.tsx    # Tab layout
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
│   ├── GridBookmarkCard.tsx
│   ├── BookmarkCard.tsx   # (dead code - unused)
│   ├── AudioPlayerModal.tsx
│   └── ...
├── stores/                # Zustand state stores
│   ├── useThemeStore.ts  # Theme (colors, spacing)
│   ├── useBookmarkStore.ts # Bookmarks CRUD
│   ├── useAuthStore.ts    # Authentication
│   └── useAudioStore.ts   # Audio playback
├── lib/
│   ├── db.ts             # Local SQLite database
│   └── api.ts            # API client for server
├── server/               # Express backend
│   └── index.ts          # API endpoints
└── constants/
    └── theme.ts          # Theme constants
```

## Features

### 1. Bookmark Management
- Save URLs with automatic metadata extraction (title, description, image)
- Add custom tags to bookmarks
- Mark bookmarks as public/private
- Favorite/bookmark bookmarks
- Delete bookmarks

### 2. Search & Filter
- Full-text search across bookmarks
- Filter by content type (link, image, note, voice)
- Filter by tags

### 3. Audio Playback
- Play voice notes directly in the app
- Centralized audio state (only one plays at a time)
- Auto-stop when switching tabs

### 4. Discover Feed (Server-Based)
- Shows community bookmarks from other users
- Personalized recommendations based on user's top saved tags
- Tags tracked locally and synced to server

### 5. Theme Support
- Dark/Light mode
- Customizable colors, spacing, typography

## Database Schema

### Local Database (expo-sqlite)

**bookmarks table:**
```sql
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  domain TEXT,
  tags TEXT DEFAULT '[]',
  is_public INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  local_path TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  synced_at INTEGER,
  is_deleted INTEGER DEFAULT 0
);
```

**user_tags table:**
```sql
CREATE TABLE user_tags (
  tag TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  last_used INTEGER
);
```

**sync_queue table:**
```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER
);
```

### Server Database (better-sqlite3)

**bookmarks table:**
```sql
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  tags TEXT DEFAULT '[]',
  save_count INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);
```

**global_tags table:**
```sql
CREATE TABLE global_tags (
  tag TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);
```

## API Endpoints

### Server (Express)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/feed` | GET | Get community feed (supports `?tags=react,design&limit=50`) |
| `/api/sync` | POST | Sync bookmarks from app |
| `/api/vote` | POST | Vote for a bookmark |
| `/api/preview` | GET | Get URL metadata (`?url=...`) |
| `/api/auth/register` | POST | Register user |
| `/api/auth/check-username` | GET | Check username availability |

## State Management (Zustand)

### useAudioStore
```typescript
interface AudioState {
  currentlyPlayingId: string | null;
  isPlaying: boolean;
  play: (bookmarkId: string, audioUri: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}
```

### useBookmarkStore
- `bookmarks`: All saved bookmarks
- `loadBookmarks()`: Fetch from local DB
- `addBookmark()`: Save new bookmark
- `removeBookmark()`: Delete bookmark
- `searchBookmarks()`: Full-text search

## Key Implementation Details

### 1. Audio Auto-Stop on Tab Switch
Uses `useFocusEffect` to stop audio when leaving a screen:
```typescript
useFocusEffect(
  useCallback(() => {
    return () => stop(); // Cleanup on unmount
  }, [stop])
);
```

### 2. Discover Feed Recommendation
1. Get user's top 10 tags from local `user_tags` table
2. Send tags to server `/api/feed?tags=react,design`
3. Server filters bookmarks by those tags
4. Returns trending + recent bookmarks

### 3. Tag Tracking
- When bookmark saved locally → tags added to `user_tags` table
- When syncing to server → server updates `global_tags` table
- Discover feed uses local tags to query server

## Running the Project

### Development
```bash
# Terminal 1 - Start server
cd memora/server
npm run server

# Terminal 2 - Start app
cd memora
npx expo start
```

### Build
```bash
npx expo run:android
# or
npx expo run:ios
```

## Known Issues / Dead Code

- `components/BookmarkCard.tsx` - Unused component (not imported anywhere)
- `components/AudioPlayerModal.tsx` - Originally had local audio state, now uses centralized store
- `components/BookmarkOptionsModal.tsx` - Not used
- `components/ImageViewerModal.tsx` - Not used
- `components/NoteReaderModal.tsx` - Not used
- `components/EmptyState.tsx` - Used in some places

## Future Improvements

1. **Offline Discover Feed**: Cache server feed locally for offline use
2. **Tag Suggestions**: Auto-suggest tags when saving bookmarks
3. **Share Extension**: Save bookmarks from other apps
4. **Export/Import**: Backup and restore bookmarks
5. **PWA Support**: Web version of the app