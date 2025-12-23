import 'package:flutter/material.dart';

class BetTypeChip extends StatelessWidget {
  final String betType;
  final bool isSelected;
  final VoidCallback? onTap;

  const BetTypeChip({
    super.key,
    required this.betType,
    this.isSelected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? colorScheme.primary : colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? colorScheme.primary : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _getIcon(betType),
              size: 16,
              color: isSelected ? colorScheme.onPrimary : colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 6),
            Text(
              _getLabel(betType),
              style: TextStyle(
                color: isSelected ? colorScheme.onPrimary : colorScheme.onSurfaceVariant,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getIcon(String type) {
    switch (type.toUpperCase()) {
      case 'П1':
      case '1':
        return Icons.home;
      case 'П2':
      case '2':
        return Icons.flight;
      case 'Х':
      case 'X':
        return Icons.handshake;
      case 'ТБ2.5':
      case 'OVER':
        return Icons.arrow_upward;
      case 'ТМ2.5':
      case 'UNDER':
        return Icons.arrow_downward;
      case 'BTTS':
        return Icons.sports_soccer;
      case '1X':
        return Icons.home_work;
      case 'X2':
        return Icons.connecting_airports;
      default:
        return Icons.casino;
    }
  }

  String _getLabel(String type) {
    final labels = {
      'П1': 'Home',
      '1': 'Home',
      'П2': 'Away',
      '2': 'Away',
      'Х': 'Draw',
      'X': 'Draw',
      'ТБ2.5': 'Over 2.5',
      'OVER': 'Over 2.5',
      'ТМ2.5': 'Under 2.5',
      'UNDER': 'Under 2.5',
      'BTTS': 'Both Score',
      '1X': '1X',
      'X2': 'X2',
      '12': 'No Draw',
    };
    return labels[type.toUpperCase()] ?? type;
  }
}

class BetTypeSelector extends StatelessWidget {
  final String? selectedType;
  final ValueChanged<String>? onSelected;
  final List<String> betTypes;

  const BetTypeSelector({
    super.key,
    this.selectedType,
    this.onSelected,
    this.betTypes = const ['П1', 'Х', 'П2', 'ТБ2.5', 'ТМ2.5', 'BTTS'],
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: betTypes.map((type) {
        return BetTypeChip(
          betType: type,
          isSelected: selectedType == type,
          onTap: () => onSelected?.call(type),
        );
      }).toList(),
    );
  }
}
