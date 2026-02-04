import 'package:flutter/material.dart';

class AppTheme {
  // FC26 Neon Brand Colors
  static const Color primaryColor = Color(0xFF00F5FF);      // Cyan neon
  static const Color primaryDark = Color(0xFF0891B2);       // Dark cyan
  static const Color primaryLight = Color(0xFF67E8F9);      // Light cyan
  static const Color accentColor = Color(0xFFFF00FF);       // Magenta neon
  static const Color accentSecondary = Color(0xFFBF00FF);   // Purple neon

  // FC26 Colors
  static const Color fc26Gold = Color(0xFFFFD700);          // Gold accent
  static const Color fc26Orange = Color(0xFFFF6B00);        // Orange neon
  static const Color neonGreen = Color(0xFF00FF88);         // Green neon
  static const Color neonPink = Color(0xFFFF0080);          // Pink neon

  // Dark background colors
  static const Color darkBg = Color(0xFF0A0A0F);            // Very dark
  static const Color darkCard = Color(0xFF12121A);          // Card background
  static const Color darkSurface = Color(0xFF1A1A25);       // Surface
  static const Color darkBorder = Color(0xFF2A2A3A);        // Border

  // Semantic Colors
  static const Color successColor = Color(0xFF00FF88);      // Neon green
  static const Color errorColor = Color(0xFFFF3366);        // Neon red
  static const Color warningColor = Color(0xFFFFAA00);      // Neon orange
  static const Color infoColor = Color(0xFF00F5FF);         // Cyan

  // Confidence colors - neon style
  static const Color highConfidence = Color(0xFF00FF88);    // 75%+ green
  static const Color mediumConfidence = Color(0xFFFFAA00);  // 60-74% orange
  static const Color lowConfidence = Color(0xFFFF3366);     // <60% red

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryColor, accentColor],
  );

  static const LinearGradient neonGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF00F5FF), Color(0xFFBF00FF)],
  );

  static const LinearGradient goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFD700), Color(0xFFFF6B00)],
  );

  static const LinearGradient darkBackgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF0A0A0F), Color(0xFF12121A)],
  );

  static Color getConfidenceColor(double confidence) {
    if (confidence >= 75) return highConfidence;
    if (confidence >= 60) return mediumConfidence;
    return lowConfidence;
  }

  // Glow effect helper
  static List<BoxShadow> neonGlow(Color color, {double blur = 20, double spread = 2}) {
    return [
      BoxShadow(
        color: color.withOpacity(0.6),
        blurRadius: blur,
        spreadRadius: spread,
      ),
      BoxShadow(
        color: color.withOpacity(0.3),
        blurRadius: blur * 2,
        spreadRadius: spread * 2,
      ),
    ];
  }

  // Light Theme (redirect to dark - FC26 app is dark-only for neon effect)
  static ThemeData lightTheme = darkTheme;

  // Dark Theme - FC26 Neon Style
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.dark(
      primary: primaryColor,
      secondary: accentColor,
      tertiary: fc26Gold,
      error: errorColor,
      surface: darkCard,
      onSurface: Colors.white,
      onPrimary: darkBg,
      onSecondary: Colors.white,
    ),
    scaffoldBackgroundColor: darkBg,
    appBarTheme: const AppBarTheme(
      centerTitle: true,
      elevation: 0,
      backgroundColor: Colors.transparent,
      foregroundColor: Colors.white,
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: Colors.white,
        letterSpacing: 1.0,
      ),
    ),
    cardTheme: CardTheme(
      elevation: 0,
      color: darkCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: darkBorder, width: 1),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: darkCard,
      indicatorColor: primaryColor.withOpacity(0.2),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: primaryColor, size: 24);
        }
        return IconThemeData(color: Colors.white.withOpacity(0.5), size: 24);
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            color: primaryColor,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          );
        }
        return TextStyle(
          color: Colors.white.withOpacity(0.5),
          fontSize: 12,
        );
      }),
    ),
    tabBarTheme: TabBarTheme(
      labelColor: primaryColor,
      unselectedLabelColor: Colors.white.withOpacity(0.5),
      indicatorColor: primaryColor,
      indicatorSize: TabBarIndicatorSize.label,
      dividerColor: Colors.transparent,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        backgroundColor: primaryColor,
        foregroundColor: darkBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        foregroundColor: primaryColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        side: const BorderSide(color: primaryColor, width: 2),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primaryColor,
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: darkSurface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: darkBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: darkBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: errorColor, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      hintStyle: TextStyle(
        color: Colors.white.withOpacity(0.3),
        fontSize: 16,
      ),
      prefixIconColor: Colors.white.withOpacity(0.5),
    ),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: Colors.white,
        letterSpacing: -0.5,
      ),
      headlineMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: Colors.white,
        letterSpacing: -0.5,
      ),
      headlineSmall: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: Colors.white,
      ),
      titleLarge: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      titleSmall: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        color: Color(0xFFB0B3B8),
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        color: Color(0xFFB0B3B8),
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        color: Color(0xFF808080),
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFF2A2A3A),
      thickness: 1,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: darkSurface,
      selectedColor: primaryColor.withOpacity(0.2),
      labelStyle: const TextStyle(color: Colors.white),
      side: BorderSide(color: darkBorder),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: Colors.white,
      textColor: Colors.white,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return primaryColor;
        }
        return Colors.white.withOpacity(0.5);
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return primaryColor.withOpacity(0.3);
        }
        return Colors.white.withOpacity(0.1);
      }),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: primaryColor,
      linearTrackColor: darkSurface,
    ),
  );
}
