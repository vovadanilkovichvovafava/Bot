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
  final int? homeScore;
  final int? awayScore;

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
    this.homeScore,
    this.awayScore,
  });

  factory Prediction.fromJson(Map<String, dynamic> json) {
    return Prediction(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      matchId: json['match_id'] is int ? json['match_id'] : int.tryParse(json['match_id'].toString()) ?? 0,
      homeTeam: json['home_team'] ?? '',
      awayTeam: json['away_team'] ?? '',
      competition: json['competition'] ?? '',
      matchDate: json['match_date'] != null
          ? DateTime.tryParse(json['match_date'])
          : null,
      betType: json['bet_type'] ?? '',
      confidence: (json['confidence'] ?? 0).toDouble(),
      odds: json['odds']?.toDouble(),
      analysis: json['analysis'],
      altBetType: json['alt_bet_type'],
      altConfidence: json['alt_confidence']?.toDouble(),
      result: json['result'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      homeScore: json['home_score'],
      awayScore: json['away_score'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'match_id': matchId,
      'home_team': homeTeam,
      'away_team': awayTeam,
      'competition': competition,
      'match_date': matchDate?.toIso8601String(),
      'bet_type': betType,
      'confidence': confidence,
      'odds': odds,
      'analysis': analysis,
      'alt_bet_type': altBetType,
      'alt_confidence': altConfidence,
      'result': result,
      'created_at': createdAt.toIso8601String(),
      'home_score': homeScore,
      'away_score': awayScore,
    };
  }

  Prediction copyWith({
    int? id,
    int? matchId,
    String? homeTeam,
    String? awayTeam,
    String? competition,
    DateTime? matchDate,
    String? betType,
    double? confidence,
    double? odds,
    String? analysis,
    String? altBetType,
    double? altConfidence,
    String? result,
    DateTime? createdAt,
    int? homeScore,
    int? awayScore,
  }) {
    return Prediction(
      id: id ?? this.id,
      matchId: matchId ?? this.matchId,
      homeTeam: homeTeam ?? this.homeTeam,
      awayTeam: awayTeam ?? this.awayTeam,
      competition: competition ?? this.competition,
      matchDate: matchDate ?? this.matchDate,
      betType: betType ?? this.betType,
      confidence: confidence ?? this.confidence,
      odds: odds ?? this.odds,
      analysis: analysis ?? this.analysis,
      altBetType: altBetType ?? this.altBetType,
      altConfidence: altConfidence ?? this.altConfidence,
      result: result ?? this.result,
      createdAt: createdAt ?? this.createdAt,
      homeScore: homeScore ?? this.homeScore,
      awayScore: awayScore ?? this.awayScore,
    );
  }

  bool get isWin => result == 'win';
  bool get isLoss => result == 'loss' || result == 'lose';
  bool get isPending => result == null || result == 'pending';
  bool get isVoid => result == 'void';

  String get matchName => '$homeTeam vs $awayTeam';

  String get resultDisplay {
    if (isWin) return 'Won';
    if (isLoss) return 'Lost';
    if (isVoid) return 'Void';
    return 'Pending';
  }
}
