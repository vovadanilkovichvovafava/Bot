# AI Betting Bot - Mobile App

Flutter mobile application for AI-powered football betting predictions.

## Features

- Cross-platform (iOS & Android)
- AI-powered match analysis
- Real-time match data
- User statistics and history
- Multi-language support (EN, RU, PT, ES)
- Dark/Light theme
- Push notifications

## Requirements

- Flutter 3.16+
- Dart 3.2+

## Setup

### Installation

```bash
# Get dependencies
flutter pub get

# Generate code (Riverpod, JSON serialization, etc.)
flutter pub run build_runner build --delete-conflicting-outputs
```

### Run Development

```bash
# Run on connected device/emulator
flutter run

# Run on specific platform
flutter run -d ios
flutter run -d android
flutter run -d chrome  # Web
```

### Build

```bash
# Android APK
flutter build apk

# Android App Bundle (for Play Store)
flutter build appbundle

# iOS (requires Mac with Xcode)
flutter build ios
```

## Project Structure

```
mobile_app/
├── lib/
│   ├── main.dart           # Entry point
│   ├── screens/            # UI screens
│   ├── widgets/            # Reusable widgets
│   ├── models/             # Data models
│   ├── services/           # API service
│   ├── providers/          # State management
│   ├── utils/              # Theme, router, constants
│   └── l10n/               # Localization
├── assets/
│   ├── images/
│   └── fonts/
├── test/
└── pubspec.yaml
```

## Configuration

Update `lib/utils/constants.dart` with your backend URL:

```dart
static const String baseUrl = 'https://your-api-url.com/api/v1';
```

## State Management

Uses [Riverpod](https://riverpod.dev/) for state management with:
- `StateNotifierProvider` for complex state
- `FutureProvider` for async data
- `Provider` for dependencies

## Screens

1. **Splash** - Initial loading
2. **Auth** - Login/Register
3. **Home** - Dashboard with quick stats
4. **Matches** - Today/Tomorrow/By League
5. **Match Detail** - AI analysis and predictions
6. **Stats** - User statistics and history
7. **Favorites** - Saved teams and leagues
8. **Settings** - Preferences
9. **Premium** - Subscription plans
