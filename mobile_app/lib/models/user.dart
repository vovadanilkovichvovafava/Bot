class User {
  final int id;
  final String email;
  final String? username;
  final String language;
  final String timezone;
  final bool isPremium;
  final DateTime? premiumUntil;
  final int dailyRequests;
  final int dailyLimit;
  final int bonusPredictions;
  final double minOdds;
  final double maxOdds;
  final String riskLevel;
  final int totalPredictions;
  final int correctPredictions;
  final double accuracy;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    this.username,
    required this.language,
    required this.timezone,
    required this.isPremium,
    this.premiumUntil,
    required this.dailyRequests,
    required this.dailyLimit,
    required this.bonusPredictions,
    required this.minOdds,
    required this.maxOdds,
    required this.riskLevel,
    required this.totalPredictions,
    required this.correctPredictions,
    required this.accuracy,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      username: json['username'],
      language: json['language'] ?? 'en',
      timezone: json['timezone'] ?? 'UTC',
      isPremium: json['is_premium'] ?? false,
      premiumUntil: json['premium_until'] != null
          ? DateTime.parse(json['premium_until'])
          : null,
      dailyRequests: json['daily_requests'] ?? 0,
      dailyLimit: json['daily_limit'] ?? 3,
      bonusPredictions: json['bonus_predictions'] ?? 0,
      minOdds: (json['min_odds'] ?? 1.5).toDouble(),
      maxOdds: (json['max_odds'] ?? 3.0).toDouble(),
      riskLevel: json['risk_level'] ?? 'medium',
      totalPredictions: json['total_predictions'] ?? 0,
      correctPredictions: json['correct_predictions'] ?? 0,
      accuracy: (json['accuracy'] ?? 0.0).toDouble(),
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  int get remainingPredictions {
    if (isPremium) return -1; // Unlimited
    return (dailyLimit - dailyRequests) + bonusPredictions;
  }

  bool get canMakePrediction {
    return isPremium || remainingPredictions > 0;
  }
}
