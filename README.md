# Lockbox Local — Mobile

> A native mobile app (iOS & Android) for storing sensitive information behind configurable time delays — your self-control companion, always in your pocket.

![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-TypeScript-61DAFB?logo=react)
![NativeWind](https://img.shields.io/badge/NativeWind-v4-38BDF8)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/bleriotnoguia/lockbox-local-mobile)](https://github.com/bleriotnoguia/lockbox-local-mobile/releases/latest)

## Background & Motivation

Lockbox Local is inspired by [Pluckeye Lockbox](https://lockbox.pluckeye.net/help), a web service that stores information in "boxes" accessible only after a configurable delay — a simple but effective tool for **self-control**.

This mobile app brings the full Lockbox Local experience to your phone: the same encryption, the same self-control tools, and full cross-platform compatibility with the desktop version, so your lockboxes travel with you.

> **Desktop version also available** — see [github.com/bleriotnoguia/lockbox-local](https://github.com/bleriotnoguia/lockbox-local) for Windows, macOS and Linux.

## Features

### Core
- **AES-256-GCM encryption** with PBKDF2 key derivation (byte-for-byte compatible with the desktop version)
- **Configurable unlock delay** — set how long you must wait before accessing content
- **Auto re-lock** — lockboxes automatically re-lock after a defined period
- **Master password** — global protection via Keychain/Keystore; never stored in plaintext

### Self-control tools
- **Reflection modal** — 10-second forced countdown + checklist before confirming an unlock
- **Penalty mode** — permanently adds extra delay when a countdown is cancelled
- **Extend delay** — permanently increase the unlock delay (increase only, never decrease)
- **Single-use panic code** — emergency bypass code; once used it cannot be reset without the code
- **Scheduled unlock** — set a specific date/time for a lockbox to automatically become unlockable

### Mobile-specific
- **Biometric unlock** — Face ID / Fingerprint via `expo-local-authentication`
- **Local notifications** — get notified when a countdown finishes unlocking
- **Import/Export** — share `.json` files cross-platform with the desktop version

### Monitoring
- **Self-control statistics** — streaks, success rate, monthly and all-time stats

### Interface
- **English + French** (i18n)
- **Light / Dark / System theme**
- **100% local** — no server, no telemetry, no network

## Download

Pre-built releases are available on the [Releases page](https://github.com/bleriotnoguia/lockbox-local-mobile/releases/latest).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + Expo Router (file-based routing) |
| Language | React Native + TypeScript (strict mode) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| State | Zustand |
| Database | expo-sqlite (local SQLite) |
| Encryption | react-native-quick-crypto (AES-256-GCM) |
| Secure storage | expo-secure-store (Keychain / Keystore) |
| Biometrics | expo-local-authentication |
| Notifications | expo-notifications |
| Import/Export | expo-file-system + expo-sharing + expo-document-picker |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For iOS: macOS + Xcode
- For Android: Android Studio + Android SDK

### Run locally

```bash
npm install
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with the Expo Go app.

## Project Structure

```
app/                    # Expo Router screens
  (auth)/               # Login + setup screens
  (tabs)/               # Tab navigator
    lockboxes/          # List + detail screens
    stats.tsx           # Statistics screen
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

Export files (`.json`) are fully cross-platform compatible with the [desktop Tauri version](https://github.com/bleriotnoguia/lockbox-local). The encryption format, HMAC signatures, and data schema are identical — you can freely move lockboxes between your phone and your computer.

| | Desktop (Tauri) | Mobile (Expo) |
|---|:---:|:---:|
| AES-256-GCM encryption | ✓ | ✓ |
| PBKDF2 key derivation | ✓ | ✓ |
| HMAC-signed export | ✓ | ✓ |
| Import/Export (cross-platform) | ✓ | ✓ |
| Biometric unlock | — | ✓ |
| Local push notifications | — | ✓ |
| Windows / macOS / Linux | ✓ | — |
| iOS / Android | — | ✓ |

## License

MIT
