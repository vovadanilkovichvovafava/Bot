"""Восстановление рекламных меток у юзеров, зарегистрированных до 04.08.2026.

Метки должны были сохраняться через saveTrackingParams(), но тот слал их в
PostbackAPI на Railway. Сервис умер 11 июля, запросы уходили в 404, и у всех,
кто зарегистрировался с тех пор, источник неизвестен.

Данные при этом не потеряны: записи сессий rrweb хранят исходный адрес
страницы целиком, вместе с sub_id. Сессия связана с юзером через public_id,
поэтому метки можно вернуть на место.

Проход одноразовый и идемпотентный: трогаем только тех, у кого click_params
пустой, поэтому повторный запуск ничего не портит и ничего не перезапишет.
"""

import json
import logging
import re
from urllib.parse import urlparse, parse_qs

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)

# Метки, которые имеет смысл сохранять. Остальное из адреса — мусор вроде
# служебных флагов роутера.
TRACKED_KEYS = {"offer", "geo", "external_id", "fbclid", "partner_click_id"} | {
    f"sub_id_{i}" for i in range(1, 16)
}

# href внутри события rrweb. Нас интересуют только адреса с метками.
_HREF_RE = re.compile(r'"href"\s*:\s*"([^"]{0,2000})"')

MAX_CHUNKS = 3000  # верхняя граница прохода, чтобы не выгрести всю таблицу


def _params_from_href(href: str) -> dict:
    """Вытащить рекламные метки из адреса. Пустой словарь, если их там нет."""
    try:
        qs = parse_qs(urlparse(href.replace("\\u0026", "&").replace("\\/", "/")).query)
    except Exception:
        return {}
    out = {}
    for key, values in qs.items():
        if key in TRACKED_KEYS and values and values[0]:
            out[key] = str(values[0])[:300]
    return out


async def backfill_click_params(db: AsyncSession) -> dict:
    """Вернуть метки тем, у кого их нет. Возвращает счётчики для лога."""
    stats = {"scanned": 0, "matched": 0, "updated": 0}

    # Кого вообще нужно чинить. Если таких нет — не трогаем тяжёлую таблицу.
    pending = (await db.execute(
        select(User.id, User.public_id).where(
            User.click_params.is_(None), User.public_id.isnot(None)
        )
    )).all()
    if not pending:
        return stats
    by_public_id = {p[1]: p[0] for p in pending}

    # Чанки с метками, свежие первыми. Фильтр по подстроке отдаём базе —
    # тащить в память все записи сессий незачем.
    rows = (await db.execute(
        text("""
            SELECT r.user_id, c.events_json
            FROM replay_chunks c
            JOIN session_replays r ON r.session_id = c.session_id
            WHERE r.user_id IS NOT NULL
              AND c.events_json LIKE '%sub_id_%'
            ORDER BY c.id DESC
            LIMIT :lim
        """),
        {"lim": MAX_CHUNKS},
    )).all()

    seen_users = set()
    for public_id, events_json in rows:
        stats["scanned"] += 1
        user_id = by_public_id.get(public_id)
        if not user_id or user_id in seen_users:
            continue

        params = {}
        for href in _HREF_RE.findall(events_json or ""):
            params = _params_from_href(href)
            if params:
                break
        if not params:
            continue

        stats["matched"] += 1
        seen_users.add(user_id)

        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user or user.click_params:
            continue
        user.click_params = json.dumps(params, ensure_ascii=False)[:4000]
        user.ad_campaign = user.ad_campaign or params.get("sub_id_6")
        user.ad_set = user.ad_set or params.get("sub_id_4")
        user.ad_placement = user.ad_placement or params.get("sub_id_7")
        user.ad_source = user.ad_source or params.get("sub_id_8")
        stats["updated"] += 1

    if stats["updated"]:
        await db.commit()
    logger.info(
        "[Backfill] Метки восстановлены: просмотрено чанков %(scanned)s, "
        "с метками %(matched)s, обновлено юзеров %(updated)s", stats
    )
    return stats
