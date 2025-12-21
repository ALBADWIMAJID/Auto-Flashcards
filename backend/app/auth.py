# backend/app/auth.py
from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional, Tuple, Dict, Any

import httpx
from dotenv import load_dotenv
from fastapi import Header, HTTPException

# يقرأ .env محليًا (على Render لن يعتمد عليه، لأن Render يستخدم Environment Variables)
load_dotenv()


def _env(name: str) -> Optional[str]:
    v = os.getenv(name)
    if v is None:
        return None
    v = v.strip()
    return v or None


@lru_cache(maxsize=1)
def _get_supabase_env() -> Tuple[str, str]:
    """
    يرجع (SUPABASE_URL, API_KEY) مرة واحدة (caching).
    ملاحظة: تغيير env يحتاج Restart/Redeploy حتى يتحدث الكاش.
    """
    supabase_url = _env("SUPABASE_URL")

    api_key = (
        _env("SUPABASE_ANON_KEY")
        or _env("SUPABASE_SERVICE_ROLE_KEY")
        or _env("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )

    if not supabase_url or not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Server misconfigured: Missing Supabase env vars. "
                "Set SUPABASE_URL and one of "
                "[SUPABASE_ANON_KEY | SUPABASE_SERVICE_ROLE_KEY | NEXT_PUBLIC_SUPABASE_ANON_KEY]."
            ),
        )

    return supabase_url, api_key


async def _fetch_supabase_user(authorization: Optional[str]) -> Dict[str, Any]:
    """
    يستدعي Supabase Auth endpoint للحصول على بيانات المستخدم من الـ access token.
    """

    # خيار مفيد للتطوير فقط (لا تفعّله في الإنتاج):
    # لو حطيت DISABLE_AUTH=1 بيرجع مستخدم وهمي بدون Supabase
    if _env("DISABLE_AUTH") == "1":
        return {"id": "dev-user", "email": "dev@example.com"}

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization must be Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty Bearer token")

    supabase_url, api_key = _get_supabase_env()
    url = f"{supabase_url.rstrip('/')}/auth/v1/user"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            r = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": api_key,
                },
            )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to reach Supabase Auth service")

    # 401/403 معناها التوكن غير صالح/منتهي
    if r.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="Invalid/expired token")

    # أي شيء غير 200 وغير 401/403 غالبًا مشكلة اتصال/إعدادات
    if r.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase Auth error (status={r.status_code})",
        )

    data = r.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User id not found in token")

    return data


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    يرجع dict فيه id + email ... إلخ.
    """
    return await _fetch_supabase_user(authorization)


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    للتوافق مع بقية الراوترات: يرجع UUID فقط.
    """
    data = await _fetch_supabase_user(authorization)
    return data["id"]
