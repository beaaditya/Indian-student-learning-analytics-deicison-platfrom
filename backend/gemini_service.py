"""
Gemini AI Service Module
Student Learning Analytics & Decision Intelligence Platform

Manages Google Gemini AI client lifecycle, multi-model fallback chain,
rate limit recovery, structured JSON schema generation, and safe text analysis.
"""
import os
import json
import logging
from typing import Optional, Dict, Any, List
from backend.config import settings

logger = logging.getLogger("backend.gemini_service")

# Active model fallback chain
MODEL_FALLBACK_CHAIN: List[str] = [
    settings.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]


def get_gemini_client():
    """Initializes and returns the Google GenAI client if GEMINI_API_KEY is configured."""
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.warning(f"Could not initialize GenAI client: {e}")
        return None


def generate_ai_analysis(
    system_instruction: str,
    prompt: str,
    model_name: Optional[str] = None,
    response_schema: Optional[Dict[str, Any]] = None,
    temperature: float = 0.2,
) -> Optional[str]:
    """
    Sends a prompt to Gemini with multi-model fallback and rate-limit recovery.
    Returns the string text or None if all models fail or no API key is available.
    """
    client = get_gemini_client()
    if not client:
        return None

    preferred = model_name or settings.GEMINI_MODEL
    candidates = [preferred] + [m for m in MODEL_FALLBACK_CHAIN if m != preferred]

    last_error = None
    for model in candidates:
        try:
            from google.genai import types
            config_params: Dict[str, Any] = {
                "system_instruction": system_instruction,
                "temperature": temperature,
            }
            if response_schema:
                config_params["response_mime_type"] = "application/json"
                config_params["response_schema"] = response_schema

            config = types.GenerateContentConfig(**config_params)
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            if response and response.text:
                return response.text
        except Exception as e:
            err_str = str(e)
            last_error = e
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "404" in err_str:
                logger.warning(f"Gemini model {model} unavailable/rate-limited: {e}. Trying next in chain.")
                continue
            else:
                logger.warning(f"Gemini generation error on model {model}: {e}")
                continue

    logger.info(f"Gemini API unavailable or models exhausted: {last_error}")
    return None


def generate_report_json(
    system_instruction: str,
    prompt: str,
    schema: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Generates structured JSON output from Gemini validated against schema."""
    raw_text = generate_ai_analysis(
        system_instruction=system_instruction,
        prompt=prompt,
        response_schema=schema,
        temperature=0.1,
    )
    if not raw_text:
        return None
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse Gemini JSON output: {e}")
        return None
