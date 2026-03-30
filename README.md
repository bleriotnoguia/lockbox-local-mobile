# Lockbox Local — Mobile

A mobile version (iOS & Android) of **Lockbox Local**, a self-control tool for storing sensitive information behind configurable time delays.

## Tech Stack

- **Expo SDK 54** with Expo Router (file-based routing)
- **React Native** + **TypeScript** (strict mode)
- **NativeWind v4** (Tailwind CSS for React Native)
- **Zustand** for state management
- **expo-sqlite** for local SQLite database
- **react-native-quick-crypto** for AES-256-GCM encryption (desktop-compatible)
- **expo-secure-store** for master password hash (Keychain/Keystore)
- **expo-local-authentication** for biometric unlock
- **expo-notifications** for local notifications
- **expo-file-system** + **expo-sharing** + **expo-document-picker** for import/export

## Features

- 🔐 AES-256-GCM encryption with PBKDF2 key derivation (byte-for-byte compatible with desktop)
- ⏱️ Configurable unlock delay + auto-relock
- 🪞 Reflection modal (10s countdown + checklist before unlock)
- ⚠️ Penalty mode (permanently adds delay on cancel)
- 🚨 Single-use emergency (panic) code
- 📅 Scheduled unlock at specific date/time
- 📊 Self-control statistics (streaks, success rate, etc.)
- 🌍 English + French (i18n)
- 🌙 Light / Dark / System theme
- 📤 Import/Export (cross-platform compatible with desktop)
- 🔒 Biometric unlock (Face ID / Fingerprint)
- 🔔 Local notifications when lockbox finishes unlocking
- 💯 100% local — no server, no telemetry, no network

## Getting Started

```bash
npm install
npx expo start
```

## Project Structure

```
app/                    # Expo Router screens
  (auth)/               # Login + setup screens
  (tabs)/               # Tab navigator
    lockboxes/          # List + detail screens
    stats.tsx           # Statistics
  create.tsx            # Create lockbox modal
  settings.tsx          # Settings modal
  about.tsx             # About modal

src/
  crypto/               # AES-256-GCM, PBKDF2, SHA-256, HMAC
  db/                   # SQLite database + migrations + CRUD
  store/                # Zustand stores (auth, lockbox, theme)
  hooks/                # useCountdown, useLockboxStatus, useExportImport
  i18n/                 # Translations (EN/FR) + locale store
  types/                # TypeScript interfaces
  constants/            # Categories, delay presets
  components/           # Shared components (cards, modals)
```

## Desktop Compatibility

Export files (.json) are cross-platform compatible with the desktop Tauri version. The encryption format, HMAC signatures, and data schema are identical.

## License

MIT
