/// API Configuration
class ApiConstants {
  static const String baseUrl = 'https://appbot-production-152e.up.railway.app/api/v1';

  // Endpoints
  static const String auth = '/auth';
  static const String users = '/users';
  static const String matches = '/matches';
  static const String predictions = '/predictions';
  static const String leagues = '/leagues';
  static const String stats = '/stats';
  static const String favorites = '/favorites';
}

/// App Constants
class AppConstants {
  static const String appName = 'AI Betting Bot';
  static const String version = '1.0.0';

  // Cache durations
  static const Duration matchesCacheDuration = Duration(minutes: 2);
  static const Duration userCacheDuration = Duration(minutes: 5);

  // Limits
  static const int freeDailyLimit = 3;
}

/// Bet Types
class BetTypes {
  static const Map<String, String> names = {
    'П1': 'Home Win',
    'П2': 'Away Win',
    'Х': 'Draw',
    'ТБ2.5': 'Over 2.5',
    'ТМ2.5': 'Under 2.5',
    'BTTS': 'Both Teams Score',
    '1X': 'Home or Draw',
    'X2': 'Away or Draw',
    '12': 'Not Draw',
  };

  static String getName(String code, String language) {
    // TODO: Add localized names
    return names[code] ?? code;
  }
}

/// Leagues
class Leagues {
  static const Map<String, String> competitions = {
    'PL': 'Premier League',
    'PD': 'La Liga',
    'BL1': 'Bundesliga',
    'SA': 'Serie A',
    'FL1': 'Ligue 1',
    'CL': 'Champions League',
    'EL': 'Europa League',
    'ELC': 'Championship',
    'DED': 'Eredivisie',
    'PPL': 'Primeira Liga',
    'BSA': 'Brasileirão',
    'BL2': 'Bundesliga 2',
    'SB': 'Serie B',
    'FL2': 'Ligue 2',
    'SD': 'Segunda División',
    'SPL': 'Scottish Premier',
    'BJL': 'Jupiler Pro League',
    'ASL': 'Liga Argentina',
    'EL1': 'League One',
    'FAC': 'FA Cup',
    'DFB': 'DFB-Pokal',
    'MLS': 'MLS',
  };

  static const List<String> topLeagues = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL', 'EL'];
}
