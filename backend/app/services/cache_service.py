import redis
import json
import hashlib
from app.core.config import settings

# Connect to Redis
try:
    r = redis.from_url(settings.REDIS_URL, decode_responses=True)
    r.ping()
    print("Redis connected successfully")
except Exception as e:
    print(f"Redis connection failed: {e}")
    r = None

# Cache expiry — 1 hour
CACHE_TTL = 3600

def make_cache_key(question: str, schema_name: str) -> str:
    """
    Creates a unique cache key from question + schema.
    We hash it so long questions don't cause key issues.
    
    e.g. "how many students per dept" + "college_2"
    → "query:a3f9b2c1d4e5..."
    """
    raw = f"{schema_name}:{question.lower().strip()}"
    hashed = hashlib.md5(raw.encode()).hexdigest()
    return f"query:{hashed}"

def get_cached(question: str, schema_name: str) -> dict | None:
    """
    Returns cached result if exists, None if not.
    """
    if r is None:
        return None
    try:
        key  = make_cache_key(question, schema_name)
        data = r.get(key)
        if data:
            print(f"Cache HIT: {question[:50]}")
            return json.loads(data)
        print(f"Cache MISS: {question[:50]}")
        return None
    except Exception as e:
        print(f"Cache get error: {e}")
        return None

def set_cached(question: str, schema_name: str, result: dict) -> None:
    """
    Stores result in cache with 1 hour expiry.
    """
    if r is None:
        return
    try:
        key = make_cache_key(question, schema_name)
        r.setex(key, CACHE_TTL, json.dumps(result, default=str))
        print(f"Cache SET: {question[:50]}")
    except Exception as e:
        print(f"Cache set error: {e}")

def clear_cache() -> int:
    """
    Clears all cached queries.
    Returns number of keys deleted.
    """
    if r is None:
        return 0
    try:
        keys = r.keys("query:*")
        if keys:
            r.delete(*keys)
        return len(keys)
    except Exception as e:
        print(f"Cache clear error: {e}")
        return 0

def get_cache_stats() -> dict:
    """
    Returns cache statistics.
    Used by admin dashboard later.
    """
    if r is None:
        return {"status": "disconnected"}
    try:
        keys  = r.keys("query:*")
        info  = r.info("stats")
        return {
            "status":      "connected",
            "cached_queries": len(keys),
            "hits":        info.get("keyspace_hits", 0),
            "misses":      info.get("keyspace_misses", 0),
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}