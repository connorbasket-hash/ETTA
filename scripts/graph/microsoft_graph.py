"""Microsoft authentication for Graph API (device code + token cache)."""
from __future__ import annotations

import json
import os
from typing import Any

import msal

from graph.config import get_client_id, get_device_flow_path, get_msal_cache_path, get_scopes, get_tenant_id


def _ensure_parent_dir(path: str) -> None:
    parent = os.path.dirname(os.path.abspath(path))
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)


def _load_cache() -> msal.SerializableTokenCache:
    cache = msal.SerializableTokenCache()
    cache_path = get_msal_cache_path()
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as handle:
            cache.deserialize(handle.read())
    return cache


def _save_cache(cache: msal.SerializableTokenCache) -> None:
    if not cache.has_state_changed:
        return
    cache_path = get_msal_cache_path()
    _ensure_parent_dir(cache_path)
    with open(cache_path, "w", encoding="utf-8") as handle:
        handle.write(cache.serialize())


def get_public_client() -> tuple[msal.PublicClientApplication, msal.SerializableTokenCache]:
    client_id = get_client_id()
    if not client_id:
        raise ValueError(
            "AZURE_CLIENT_ID is not configured. Set it in Settings or your environment."
        )
    tenant_id = get_tenant_id()
    cache = _load_cache()
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    app = msal.PublicClientApplication(
        client_id,
        authority=authority,
        token_cache=cache,
    )
    return app, cache


def authenticate_and_get_token(
    client_id: str | None = None,
    tenant_id: str | None = None,
    scopes: list[str] | None = None,
) -> str:
    """Return a valid access token, refreshing silently when possible."""
    # client_id/tenant_id params kept for compatibility with colleague's API
    _ = client_id
    _ = tenant_id
    scope_list = scopes or get_scopes()
    app, cache = get_public_client()
    accounts = app.get_accounts()
    if accounts:
        result = app.acquire_token_silent(scope_list, account=accounts[0])
        if result and "access_token" in result:
            _save_cache(cache)
            return result["access_token"]
        if result and "error" in result:
            raise RuntimeError(result.get("error_description") or result["error"])
    raise RuntimeError(
        "Outlook is not connected. Open Settings and sign in with Microsoft 365."
    )


def get_auth_status() -> dict[str, Any]:
    client_id = get_client_id()
    if not client_id:
        return {
            "configured": False,
            "connected": False,
            "account": None,
            "message": "Azure Client ID is not configured.",
        }
    app, _cache = get_public_client()
    accounts = app.get_accounts()
    if not accounts:
        return {
            "configured": True,
            "connected": False,
            "account": None,
            "message": "Not signed in.",
        }
    account = accounts[0]
    username = account.get("username") or account.get("name")
    try:
        authenticate_and_get_token()
        return {
            "configured": True,
            "connected": True,
            "account": username,
            "message": "Connected.",
        }
    except Exception as exc:
        return {
            "configured": True,
            "connected": False,
            "account": username,
            "message": str(exc),
        }


def start_device_flow() -> dict[str, Any]:
    app, cache = get_public_client()
    flow = app.initiate_device_flow(scopes=get_scopes())
    if "user_code" not in flow:
        error = flow.get("error_description") or flow.get("error") or "Device flow failed"
        raise RuntimeError(error)
    flow_path = get_device_flow_path()
    _ensure_parent_dir(flow_path)
    with open(flow_path, "w", encoding="utf-8") as handle:
        json.dump(flow, handle)
    _save_cache(cache)
    return {
        "user_code": flow.get("user_code"),
        "verification_uri": flow.get("verification_uri"),
        "message": flow.get("message"),
        "expires_in": flow.get("expires_in"),
    }


def complete_device_flow() -> dict[str, Any]:
    flow_path = get_device_flow_path()
    if not os.path.exists(flow_path):
        raise RuntimeError("No sign-in in progress. Click Connect Outlook first.")
    with open(flow_path, "r", encoding="utf-8") as handle:
        flow = json.load(handle)
    app, cache = get_public_client()
    result = app.acquire_token_by_device_flow(flow)
    if "access_token" not in result:
        error = result.get("error_description") or result.get("error") or "Sign-in failed"
        if result.get("error") == "authorization_pending":
            return {"success": False, "pending": True, "message": error}
        raise RuntimeError(error)
    _save_cache(cache)
    try:
        os.remove(flow_path)
    except OSError:
        pass
    accounts = app.get_accounts()
    username = None
    if accounts:
        username = accounts[0].get("username") or accounts[0].get("name")
    return {"success": True, "account": username, "message": "Connected successfully."}


def logout() -> None:
    cache_path = get_msal_cache_path()
    flow_path = get_device_flow_path()
    for path in (cache_path, flow_path):
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass
