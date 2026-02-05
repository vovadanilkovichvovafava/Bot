class TeamInfo {
  final String name;
  final String? crest;

  TeamInfo({required this.name, this.crest});

  factory TeamInfo.fromJson(Map<String, dynamic> json) {
    return TeamInfo(
      name: json['name'] ?? 'Unknown',
      crest: json['crest'],
    );
  }
}

class Match {
  final int id;
  final TeamInfo homeTeam;
  final TeamInfo awayTeam;
  final String competition;
  final String competitionCode;
  final DateTime utcDate;
  final String status;
  final int? homeScore;
  final int? awayScore;

  Match({
    required this.id,
    required this.homeTeam,
    required this.awayTeam,
    required this.competition,
    required this.competitionCode,
    required this.utcDate,
    required this.status,
    this.homeScore,
    this.awayScore,
  });

  factory Match.fromJson(Map<String, dynamic> json) {
    return Match(
      id: json['id'],
      homeTeam: TeamInfo.fromJson(json['home_team']),
      awayTeam: TeamInfo.fromJson(json['away_team']),
      competition: json['competition'] ?? 'Unknown',
      competitionCode: json['competition_code'] ?? '',
      utcDate: DateTime.parse(json['utc_date']),
      status: json['status'] ?? 'SCHEDULED',
      homeScore: json['home_score'],
      awayScore: json['away_score'],
    );
  }

  bool get isFinished => status == 'FINISHED';
  bool get isLive => status == 'IN_PLAY' || status == 'PAUSED';
  bool get isScheduled => status == 'SCHEDULED' || status == 'TIMED';

  String get score {
    if (homeScore != null && awayScore != null) {
      return '$homeScore - $awayScore';
    }
    return '-';
  }
}

class MatchDetail extends Match {
  final String? venue;
  final String? referee;
  final List<String> homeForm;
  final List<String> awayForm;
  final List<Map<String, dynamic>> h2h;

  MatchDetail({
    required super.id,
    required super.homeTeam,
    required super.awayTeam,
    required super.competition,
    required super.competitionCode,
    required super.utcDate,
    required super.status,
    super.homeScore,
    super.awayScore,
    this.venue,
    this.referee,
    this.homeForm = const [],
    this.awayForm = const [],
    this.h2h = const [],
  });

  factory MatchDetail.fromJson(Map<String, dynamic> json) {
    return MatchDetail(
      id: json['id'],
      homeTeam: TeamInfo.fromJson(json['home_team']),
      awayTeam: TeamInfo.fromJson(json['away_team']),
      competition: json['competition'] ?? 'Unknown',
      competitionCode: json['competition_code'] ?? '',
      utcDate: DateTime.parse(json['utc_date']),
      status: json['status'] ?? 'SCHEDULED',
      homeScore: json['home_score'],
      awayScore: json['away_score'],
      venue: json['venue'],
      referee: json['referee'],
      homeForm: List<String>.from(json['home_form'] ?? []),
      awayForm: List<String>.from(json['away_form'] ?? []),
      h2h: List<Map<String, dynamic>>.from(json['h2h'] ?? []),
    );
  }
}
