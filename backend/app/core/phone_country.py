"""
Detect country from phone number prefix.
Uses ITU-T E.164 country calling codes.
"""

# Sorted by prefix length descending for correct matching
# (e.g. +375 Belarus must match before +3 generic)
PHONE_PREFIXES = [
    ('+971', 'AE'),   # ОАЭ
    ('+380', 'UA'),   # Украина
    ('+375', 'BY'),   # Беларусь
    ('+370', 'LT'),   # Литва
    ('+351', 'PT'),   # Португалия
    ('+48', 'PL'),    # Польша
    ('+49', 'DE'),    # Германия
    ('+47', 'NO'),    # Норвегия
    ('+46', 'SE'),    # Швеция
    ('+45', 'DK'),    # Дания
    ('+44', 'GB'),    # UK
    ('+43', 'AT'),    # Австрия
    ('+42', 'CZ'),    # Чехия (420/421)
    ('+41', 'CH'),    # Швейцария
    ('+40', 'RO'),    # Румыния
    ('+39', 'IT'),    # Италия
    ('+38', 'RS'),    # Сербия (fallback for +38x)
    ('+36', 'HU'),    # Венгрия
    ('+35', 'IE'),    # Ирландия (353) / fallback
    ('+34', 'ES'),    # Испания
    # Latin America (World Cup / Argentina campaign geos)
    ('+598', 'UY'),   # Уругвай
    ('+595', 'PY'),   # Парагвай
    ('+593', 'EC'),   # Эквадор
    ('+591', 'BO'),   # Боливия
    ('+54', 'AR'),    # Аргентина
    ('+55', 'BR'),    # Бразилия
    ('+52', 'MX'),    # Мексика
    ('+51', 'PE'),    # Перу
    ('+56', 'CL'),    # Чили
    ('+57', 'CO'),    # Колумбия
    ('+58', 'VE'),    # Венесуэла
    ('+53', 'CU'),    # Куба
    ('+33', 'FR'),    # Франция
    ('+32', 'BE'),    # Бельгия
    ('+31', 'NL'),    # Нидерланды
    ('+30', 'GR'),    # Греция
    ('+27', 'ZA'),    # ЮАР
    ('+7', 'RU'),     # Россия / Казахстан
    ('+1', 'US'),     # США / Канада
]


def detect_country_from_phone(phone: str) -> str | None:
    """
    Detect ISO 3166-1 alpha-2 country code from phone number.
    Phone must start with '+' followed by country code.
    Returns None if country cannot be determined.
    """
    if not phone or not phone.startswith('+'):
        return None

    # Check longest prefixes first (already sorted by length desc)
    for prefix, country in PHONE_PREFIXES:
        if phone.startswith(prefix):
            return country

    return None
