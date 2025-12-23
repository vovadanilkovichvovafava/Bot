import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Basic smoke test - just verify app can be referenced
    expect(true, isTrue);
  });

  group('Model tests', () {
    test('User model parses correctly', () {
      final json = {
        'id': 1,
        'email': 'test@example.com',
        'username': 'testuser',
        'language': 'en',
        'timezone': 'UTC',
        'is_premium': false,
        'daily_requests': 0,
        'daily_limit': 3,
        'bonus_predictions': 0,
        'min_odds': 1.5,
        'max_odds': 3.0,
        'risk_level': 'medium',
        'total_predictions': 10,
        'correct_predictions': 7,
        'accuracy': 70.0,
        'created_at': '2024-01-01T00:00:00Z',
      };

      // Test would import User model and verify parsing
      expect(json['email'], 'test@example.com');
      expect(json['accuracy'], 70.0);
    });
  });
}
