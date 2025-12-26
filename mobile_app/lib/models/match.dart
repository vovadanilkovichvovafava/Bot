class TeamInfo {
  final String name;
  final String? logo;

  TeamInfo({required this.name, this.logo});

  factory TeamInfo.fromJson(Map<String, dynamic> json) {
    return TeamInfo(
      name: json['name'] ?? 'Unknown',
      logo: json['logo'] ?? json['crest'],
    );
  }
}

class Match {
  final int id;
  final TeamInfo homeTeam;
  final TeamInfo awayTeam;
  final String league;
  final String leagueCode;
  final DateTime matchDate;
  final String status;
  final int? homeScore;
  final int? awayScore;

  Match({
    required this.id,
    required this.homeTeam,
    required this.awayTeam,
    required this.league,
    required this.leagueCode,
    required this.matchDate,
    required this.status,
    this.homeScore,
    this.awayScore,
  });

  factory Match.fromJson(Map<String, dynamic> json) {
    return Match(
      id: json['id'],
      homeTeam: TeamInfo.fromJson(json['home_team']),
      awayTeam: TeamInfo.fromJson(json['away_team']),
      league: json['league'] ?? json['competition'] ?? 'Unknown',
      leagueCode: json['league_code'] ?? json['competition_code'] ?? '',
      matchDate: DateTime.parse(json['match_date'] ?? json['utc_date']),
      status: json['status'] ?? 'scheduled',
      homeScore: json['home_score'],
      awayScore: json['away_score'],
    );
  }

  bool get isFinished => status.toLowerCase() == 'finished';
  bool get isLive => status.toLowerCase() == 'in_play' || status.toLowerCase() == 'live' || status.toLowerCase() == 'paused';
  bool get isScheduled => status.toLowerCase() == 'scheduled' || status.toLowerCase() == 'timed';

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
  final Map<String, dynamic>? headToHead;

  MatchDetail({
    required super.id,
    required super.homeTeam,
    required super.awayTeam,
    required super.league,
    required super.leagueCode,
    required super.matchDate,
    required super.status,
    super.homeScore,
    super.awayScore,
    this.venue,
    this.referee,
    this.homeForm = const [],
    this.awayForm = const [],
    this.headToHead,
  });

  factory MatchDetail.fromJson(Map<String, dynamic> json) {
    return MatchDetail(
      id: json['id'],
      homeTeam: TeamInfo.fromJson(json['home_team']),
      awayTeam: TeamInfo.fromJson(json['away_team']),
      league: json['league'] ?? json['competition'] ?? 'Unknown',
      leagueCode: json['league_code'] ?? json['competition_code'] ?? '',
      matchDate: DateTime.parse(json['match_date'] ?? json['utc_date']),
      status: json['status'] ?? 'scheduled',
      homeScore: json['home_score'],
      awayScore: json['away_score'],
      venue: json['venue'],
      referee: json['referee'],
      homeForm: List<String>.from(json['home_form'] ?? []),
      awayForm: List<String>.from(json['away_form'] ?? []),
      headToHead: json['head_to_head'],
    );
  }
}
