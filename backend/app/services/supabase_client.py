"""
Supabase client setup.
Reads configuration from environment variables.
"""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@lru_cache(maxsize=1)
def get_supabase_client():
    """
    Create and return a cached Supabase client instance.

    Requires SUPABASE_URL and SUPABASE_ANON_KEY environment variables.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment. "
            "Copy .env.example to .env and fill in your Supabase credentials."
        )

    from supabase import create_client, Client

    client: Client = create_client(url, key)
    return client
