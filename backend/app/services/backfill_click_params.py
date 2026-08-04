"""Восстановление рекламных меток у юзеров, зарегистрированных до 04.08.2026.

Метки должны были сохраняться через saveTrackingParams(), но тот слал их в
PostbackAPI на Railway. Сервис умер 11 июля, запросы уходили в 404, и у всех,
кто зарегистрировался с тех пор, источник в карточке пустой.

Сами данные никуда не делись: фронт цепляет метки к каждому событию аналитики,
включая события анонимного посетителя, и складывает их в analytics_events.metadata.
Там же лежит session_id, а после регистрации у событий появляется и user_id —
этого хватает, чтобы связать первый анонимный заход с уже созданным аккаунтом.

Проход идемпотентный: трогаем только тех, у кого click_params пустой, поэтому
повторный запуск ничего не перезапишет и не испортит атрибуцию.
"""

import json
import logging

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)

TRACKED_KEYS = {"offer", "geo", "external_id", "fbclid", "partner_click_id"} | {
    f"sub_id_{i}" for i in range(1, 16)
}

MAX_ROWS = 300000  # потолок выборки. Событий много: на одного человека их
                   # десятки, и при 20k окно не доставало до июльского залива.


def _clean(meta) -> dict:
    """Оставить из metadata только рекламные метки."""
    if not isinstance(meta, dict):
        return {}
    return {
        k: str(v)[:300]
        for k, v in meta.items()
        if k in TRACKED_KEYS and v not in (None, "", "null", "undefined")
    }


async def backfill_click_params(db: AsyncSession) -> dict:
    stats = {"users_pending": 0, "by_user": 0, "by_session": 0, "updated": 0}

    pending = (await db.execute(
        select(User.id, User.public_id).where(
            User.click_params.is_(None), User.public_id.isnot(None)
        )
    )).all()
    stats["users_pending"] = len(pending)
    if not pending:
        return stats
    user_by_public = {p[1]: p[0] for p in pending}

    # Все события с метками. Фильтр по подстроке отдан базе.
    rows = (await db.execute(
        text("""
            SELECT user_id, session_id, metadata
            FROM analytics_events
            WHERE metadata IS NOT NULL
              AND metadata::text LIKE '%sub_id_%'
            ORDER BY id DESC
            LIMIT :lim
        """),
        {"lim": MAX_ROWS},
    )).all()

    # Метки по сессии и сразу по юзеру, если событие уже было авторизованным.
    params_by_session, params_by_user = {}, {}
    for public_id, session_id, meta in rows:
        clean = _clean(meta)
        if not clean:
            continue
        if session_id and session_id not in params_by_session:
            params_by_session[session_id] = clean
        if public_id and public_id not in params_by_user:
            params_by_user[public_id] = clean

    # Сессия → юзер: события после регистрации несут оба поля, и по ним
    # анонимный заход подтягивается к аккаунту.
    session_owner = dict((await db.execute(
        text("""
            SELECT DISTINCT ON (session_id) session_id, user_id
            FROM analytics_events
            WHERE user_id IS NOT NULL AND session_id IS NOT NULL
            ORDER BY session_id, id DESC
        """)
    )).all())

    resolved = {}
    for public_id, clean in params_by_user.items():
        if public_id in user_by_public:
            resolved[user_by_public[public_id]] = clean
    stats["by_user"] = len(resolved)

    for session_id, clean in params_by_session.items():
        owner = session_owner.get(session_id)
        user_id = user_by_public.get(owner) if owner else None
        if user_id and user_id not in resolved:
            resolved[user_id] = clean
            stats["by_session"] += 1

    for user_id, clean in resolved.items():
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user or user.click_params:
            continue
        user.click_params = json.dumps(clean, ensure_ascii=False)[:4000]
        user.ad_campaign = user.ad_campaign or clean.get("sub_id_6")
        user.ad_set = user.ad_set or clean.get("sub_id_4")
        user.ad_placement = user.ad_placement or clean.get("sub_id_7")
        user.ad_source = user.ad_source or clean.get("sub_id_8")
        stats["updated"] += 1

    if stats["updated"]:
        await db.commit()
    logger.info(
        "[Backfill] Без меток было %(users_pending)s; нашли по юзеру %(by_user)s, "
        "по сессии %(by_session)s; обновлено %(updated)s", stats
    )

    # Какие кампании реально восстановились — по этому видно, попала ли
    # Бразилия, и не пришлось ли лезть в базу руками, чтобы это проверить.
    if stats["updated"]:
        campaigns = {}
        for clean in resolved.values():
            key = clean.get("sub_id_6") or clean.get("offer") or "без кампании"
            campaigns[key] = campaigns.get(key, 0) + 1
        top = sorted(campaigns.items(), key=lambda kv: -kv[1])[:10]
        logger.info("[Backfill] По кампаниям: %s", ", ".join(f"{k}={v}" for k, v in top))

    # Сколько осталось непокрытых — честная цифра для отчёта.
    left = (await db.execute(
        select(User.id).where(User.click_params.is_(None), User.public_id.isnot(None))
    )).all()
    logger.info("[Backfill] Осталось без меток: %s", len(left))
    return stats
