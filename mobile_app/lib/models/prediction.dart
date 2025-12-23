class Prediction {
  final int id;
  final int matchId;
  final String homeTeam;
  final String awayTeam;
  final String competition;
  final DateTime? matchDate;
  final String betType;
  final double confidence;
  final double? odds;
  final String? analysis;
  final String? altBetType;
  final double? altConfidence;
  final String? result;
  final DateTime createdAt;

  Prediction({
    required this.id,
    required this.matchId,
    required this.homeTeam,
    required this.awayTeam,
    required this.competition,
    this.matchDate,
    required this.betType,
    required this.confidence,
    this.odds,
    this.analysis,
    this.altBetType,
    this.altConfidence,
    this.result,
    required this.createdAt,
  });

  factory Prediction.fromJson(Map<String, dynamic> json) {
    return Prediction(
      id: json['id'],
      matchId: json['match_id'],
      homeTeam: json['home_team'],
      awayTeam: json['away_team'],
      competition: json['competition'] ?? '',
      matchDate: json['match_date'] != null
          ? DateTime.parse(json['match_date'])
          : null,
      betType: json['bet_type'],
      confidence: (json['confidence'] ?? 0).toDouble(),
      odds: json['odds']?.toDouble(),
      analysis: json['analysis'],
      altBetType: json['alt_bet_type'],
      altConfidence: json['alt_confidence']?.toDouble(),
      result: json['result'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  bool get isWin => result == 'win';
  bool get isLoss => result == 'lose';
  bool get isPending => result == null || result == 'pending';

  String get matchName => '$homeTeam vs $awayTeam';
}
