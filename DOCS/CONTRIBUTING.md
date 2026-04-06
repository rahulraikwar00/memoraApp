# Contributing to Memora

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Expo CLI | Latest |
| Android Studio / Xcode | For Android/iOS builds |

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd memora

# Install dependencies
npm install

# Start the backend server (Terminal 1)
cd server
npm run server

# Start the app (Terminal 2)
npx expo start
```

## Project Structure

```
memora/
├── app/                    # expo-router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Library (saved bookmarks)
│   │   ├── search.tsx     # Search
│   │   ├── save.tsx       # Save new bookmark
│   │   ├── discover.tsx   # Discover feed
│   │   ├── settings.tsx   # Settings
│   │   └── _layout.tsx   # Tab layout
│   └── _layout.tsx       # Root layout
├── components/            # Reusable UI components
├── stores/                # Zustand state stores
├── lib/                   # Utilities (db, api)
├── server/                # Express backend
└── constants/             # Theme constants
```

## Key Concepts

### State Management

Uses Zustand for global state. Key stores:

- `useBookmarkStore.ts` - Bookmarks CRUD, search
- `useAuthStore.ts` - Authentication
- `useAudioStore.ts` - Audio playback (single player)
- `useThemeStore.ts` - Theme (dark/light)

### Database

- **Local**: expo-sqlite (mobile)
- **Server**: better-sqlite3

### Audio

Only one audio plays at a time. Use `useAudioStore` - not local component state. Audio auto-stops on tab switch via `useFocusEffect`.

## Adding a New Feature

### 1. Create the Screen

Add to `app/(tabs)/`:

```typescript
// app/(tabs)/featureName.tsx
import { View, Text } from 'react-native';

export default function FeatureName() {
  return <View><Text>Feature</Text></View>;
}
```

### 2. Add to Tab Navigation

Edit `app/(tabs)/_layout.tsx` to include the new tab.

### 3. Create / Update Store

Add state/actions to `stores/useFeatureStore.ts`:

```typescript
import { create } from 'zustand';

interface FeatureState {
  data: string[];
  fetchData: () => Promise<void>;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  data: [],
  fetchData: async () => {
    // fetch and set data
  },
}));
```

### 4. Add API Endpoint (if needed)

Add to `server/index.ts`:

```typescript
app.get('/api/feature', (req, res) => {
  // handle request
});
```

## Coding Standards

- TypeScript strict mode
- Component props: explicit typing
- No inline styles - use theme constants
- Use Zustand for shared state, not prop drilling
- Clean up effects in `useFocusEffect` return

## Common Tasks

### Adding a New Bookmark Field

1. Local DB: Update schema in `lib/db.ts`
2. Server DB: Update schema in `server/index.ts`
3. Store: Add to interface and actions
4. UI: Add input/display in relevant screens

### Adding a New API Endpoint

1. Define route in `server/index.ts`
2. Add client function in `lib/api.ts`
3. Call from store

### Modifying Audio Behavior

The audio system is centralized in `useAudioStore`. Do NOT add local audio state to components. All playback goes through:

```typescript
const { play, pause, resume, stop } = useAudioStore();
```

## Testing

```bash
# Run TypeScript check
npx tsc --noEmit

# Run lint
npx expo lint
```

## Known Issues

- Some components are dead code (unused): `BookmarkCard.tsx`, `BookmarkOptionsModal.tsx`, `ImageViewerModal.tsx`, `NoteReaderModal.tsx`
- Consider enabling these or removing them