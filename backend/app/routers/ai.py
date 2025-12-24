# backend/app/routers/ai.py

from __future__ import annotations

import base64
import os
from io import BytesIO
from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from openai import OpenAI

from ml.service.flashcards_service import (
    flashcards_service,
    FlashcardsRequest,
)
from ml.api.schemas import (
    Flashcard,
    GenerateFlashcardsRequest,
    GenerateFlashcardsResponse,
)

router = APIRouter()


# --------- helpers: extract text from uploads (txt/pdf/docx) ---------

def _safe_limit_text(text: str, max_chars: int = 20000) -> str:
    """Avoid sending extremely long texts into the model/service."""
    text = (text or "").strip()
    if len(text) > max_chars:
        return text[:max_chars]
    return text


def _guess_ext(filename: str) -> str:
    name = (filename or "").lower().strip()
    if "." in name:
        return name.rsplit(".", 1)[-1]
    return ""


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _clean_env_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (
        cleaned.startswith("'") and cleaned.endswith("'")
    ):
        cleaned = cleaned[1:-1].strip()
    return cleaned or None


_IMAGE_MIME_BY_EXT = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
}


def _get_openai_key() -> str:
    api_key = _clean_env_value(os.getenv("OPENAI_API_KEY"))
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not set; image OCR is unavailable.",
        )
    return api_key


def _get_openai_model() -> str:
    return (
        _clean_env_value(os.getenv("OPENAI_OCR_MODEL"))
        or _clean_env_value(os.getenv("OPENAI_MODEL"))
        or "gpt-4o-mini"
    )


def _extract_text_from_image(raw: bytes, mime_type: str) -> str:
    if not _env_bool("LLM_ENABLED", True):
        raise HTTPException(
            status_code=400,
            detail="LLM is disabled (LLM_ENABLED=0); image OCR is unavailable.",
        )

    api_key = _get_openai_key()
    model = _get_openai_model()
    timeout_sec = float(os.getenv("OPENAI_TIMEOUT_SEC", "30.0"))

    data_url = f"data:{mime_type};base64,{base64.b64encode(raw).decode('ascii')}"
    prompt = "Extract all readable text from this image. Return plain text only."

    try:
        client = OpenAI(api_key=api_key, timeout=timeout_sec)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Image OCR failed via OpenAI: {exc}",
        )

    return (resp.choices[0].message.content or "").strip()


async def _extract_text_from_upload(file: UploadFile) -> str:
    """
    Extract text from UploadFile (txt/pdf/docx).
    Raises 415 for unsupported types.
    """
    raw = await file.read()
    if not raw:
        return ""

    content_type = (file.content_type or "").lower()
    ext = _guess_ext(file.filename or "")

    # DOCX
    if content_type in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    } or ext == "docx":
        try:
            from docx import Document  # python-docx
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"python-docx is not installed/available: {exc}",
            )

        doc = Document(BytesIO(raw))
        parts = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
        return "\n".join(parts).strip()

    # PDF
    if content_type == "application/pdf" or ext == "pdf":
        try:
            from pypdf import PdfReader
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"pypdf is not installed/available: {exc}",
            )

        reader = PdfReader(BytesIO(raw))
        pages_text: List[str] = []
        for page in reader.pages:
            try:
                pages_text.append((page.extract_text() or "").strip())
            except Exception:
                pages_text.append("")
        return "\n".join([t for t in pages_text if t]).strip()

    # Plain text (fallback)
    if content_type.startswith("text/") or ext in {"txt", "md", "csv", "log"}:
        return raw.decode("utf-8", errors="replace").strip()

    # Images (OCR via OpenAI)
    if content_type.startswith("image/") or ext in _IMAGE_MIME_BY_EXT:
        mime_type = (
            content_type
            if content_type.startswith("image/")
            else _IMAGE_MIME_BY_EXT.get(ext, "image/png")
        )
        return _extract_text_from_image(raw, mime_type)

    # Unknown type
    raise HTTPException(
        status_code=415,
        detail=(
            "Unsupported file type. Supported: txt/pdf/docx and images (png/jpg/jpeg/webp). "
            f"content_type={file.content_type}, filename={file.filename}"
        ),
    )


# --------- endpoints ---------

@router.post(
    "/generate",
    response_model=GenerateFlashcardsResponse,
    summary="Генерация флеш-карточек из текста",
)
async def generate_flashcards_endpoint(
    payload: GenerateFlashcardsRequest,
) -> GenerateFlashcardsResponse:
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст для генерации пустой")

    service_request = FlashcardsRequest(
        text=_safe_limit_text(text),
        max_cards=payload.max_cards,
    )

    result = flashcards_service.generate(service_request)

    cards_models: List[Flashcard] = [Flashcard(**card) for card in result.cards]

    return GenerateFlashcardsResponse(
        cards=cards_models,
        cached=result.cached,
        latency_ms=result.latency_ms,
    )


@router.post(
    "/generate-file",
    response_model=GenerateFlashcardsResponse,
    summary="Генерация флеш-карточек из файла (txt/pdf/docx)",
)
async def generate_flashcards_from_file_endpoint(
    file: UploadFile = File(...),
    max_cards: int = Form(5),
) -> GenerateFlashcardsResponse:
    extracted = await _extract_text_from_upload(file)
    extracted = (extracted or "").strip()

    if not extracted:
        raise HTTPException(
            status_code=400,
            detail="Не удалось извлечь текст из файла (файл пустой или без текста).",
        )

    service_request = FlashcardsRequest(
        text=_safe_limit_text(extracted),
        max_cards=max_cards,
    )

    result = flashcards_service.generate(service_request)
    cards_models: List[Flashcard] = [Flashcard(**card) for card in result.cards]

    return GenerateFlashcardsResponse(
        cards=cards_models,
        cached=result.cached,
        latency_ms=result.latency_ms,
    )
