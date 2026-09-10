"""
In-Memory TTL Response Cache Module
Student Learning Analytics & Decision Intelligence Platform

Provides thread-safe, high-performance in-memory caching with TTL expiration,
parameter-aware cache key generation, size bounding, and safe eviction.
"""
import time
import json
import logging
from threading import Lock
from typing import Any, Dict, Optional, Tuple

from backend.config import settings

logger = logging.getLogger("backend.cache")

# Internal cache entry: (data, expiry_timestamp)
_cache: Dict[str, Tuple[Any, float]] = {}
_lock = Lock()
_MAX_CACHE_ENTRIES = 250


def make_cache_key(prefix: str, **kwargs: Any) -> str:
    """
    Constructs a deterministic cache key from an endpoint prefix and parameter key-values.
    Filters out None/empty values to keep keys canonical.
    """
    clean_params = []
    for k, v in sorted(kwargs.items()):
        if v is not None and v != "":
            clean_params.append((k, str(v).strip()))
    serialized = json.dumps(clean_params, sort_keys=True)
    return f"{prefix}:{serialized}"


def get_cached(key: str) -> Optional[Any]:
    """
    Retrieves a cached item if caching is enabled and the item has not expired.
    """
    if not settings.CACHE_ENABLED:
        return None

    now = time.time()
    with _lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        data, expires_at = entry
        if now < expires_at:
            return data
        # Expired: clean up
        _cache.pop(key, None)
        return None


def set_cached(key: str, data: Any, ttl: Optional[int] = None) -> None:
    """
    Stores an item in the cache with the configured TTL (in seconds).
    Enforces maximum cache capacity by evicting expired items or the oldest items.
    """
    if not settings.CACHE_ENABLED:
        return

    effective_ttl = ttl if (ttl is not None and ttl > 0) else settings.CACHE_TTL_SECONDS
    expires_at = time.time() + effective_ttl

    with _lock:
        now = time.time()
        # Periodic cleanup if size exceeds limit
        if len(_cache) >= _MAX_CACHE_ENTRIES:
            expired_keys = [k for k, (_, exp) in _cache.items() if now >= exp]
            for k in expired_keys:
                _cache.pop(k, None)
            # If still over capacity, remove oldest 25% of entries
            if len(_cache) >= _MAX_CACHE_ENTRIES:
                sorted_entries = sorted(_cache.items(), key=lambda item: item[1][1])
                for k, _ in sorted_entries[: _MAX_CACHE_ENTRIES // 4]:
                    _cache.pop(k, None)

        _cache[key] = (data, expires_at)


def clear_cache() -> None:
    """Clears all cached entries immediately."""
    with _lock:
        _cache.clear()
        logger.info("In-memory response cache cleared.")


def get_cache_stats() -> Dict[str, Any]:
    """Returns diagnostic statistics about the active cache."""
    now = time.time()
    with _lock:
        active_count = sum(1 for _, exp in _cache.values() if now < exp)
        return {
            "enabled": settings.CACHE_ENABLED,
            "ttl_seconds": settings.CACHE_TTL_SECONDS,
            "total_keys": len(_cache),
            "active_keys": active_count,
            "max_entries": _MAX_CACHE_ENTRIES,
        }
