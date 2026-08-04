"""Configuration for Microsoft Graph Outlook integration."""
import os
from typing import List


def get_client_id() -> str:
    return (
        os.environ.get("AZURE_CLIENT_ID")
        or os.environ.get("MS_CLIENT_ID")
        or ""
    ).strip()


def get_tenant_id() -> str:
    return (
        os.environ.get("AZURE_TENANT_ID")
        or os.environ.get("MS_TENANT_ID")
        or "common"
    ).strip() or "common"


def get_scopes() -> List[str]:
    raw = os.environ.get(
        "AZURE_SCOPES",
        "Mail.Read Calendars.Read User.Read",
    )
    return [s for s in raw.split() if s]


def get_msal_cache_path() -> str:
    return os.environ.get("MSAL_CACHE_PATH", "./data/msal_cache.json")


def get_device_flow_path() -> str:
    return os.environ.get("MSAL_FLOW_PATH", "./data/outlook_device_flow.json")
