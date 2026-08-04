"""
OutlookClient — Microsoft Graph API (adapted from shared email_service implementation).
Used by Timekeeper for sent-mail and calendar import on macOS and Windows.
"""
from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterator, List, Optional
from urllib.parse import quote

import requests

from graph.config import get_client_id, get_scopes, get_tenant_id
from graph.microsoft_graph import authenticate_and_get_token
from shared.text_utils import extract_reply_only, graph_datetime_to_local, html_to_plain_text


@dataclass
class Attachment:
    id: str
    name: str
    content_type: str
    content_bytes: bytes

    def save(self, save_folder: str) -> str | None:
        try:
            save_path = os.path.join(save_folder, self.name)
            with open(save_path, "wb") as handle:
                handle.write(self.content_bytes)
            return save_path
        except Exception:
            return None

    def __str__(self) -> str:
        return f"{self.name} ({self.content_type})"


@dataclass
class Email:
    id: str
    subject: str
    sender: str
    sender_email: str
    body: str
    received_datetime: str
    is_read: bool
    body_preview: str
    web_link: str
    attachments: List[Attachment] | None = None

    @classmethod
    def from_json(
        cls,
        email_json: dict,
        attachments: Optional[List["Attachment"]] = None,
    ) -> "Email":
        return cls(
            id=email_json.get("id", ""),
            subject=email_json.get("subject", "No Subject"),
            sender=email_json.get("sender", {})
            .get("emailAddress", {})
            .get("name", "Unknown Sender"),
            sender_email=email_json.get("sender", {})
            .get("emailAddress", {})
            .get("address", ""),
            body=email_json.get("body", {}).get("content", ""),
            received_datetime=email_json.get("receivedDateTime", ""),
            is_read=email_json.get("isRead", False),
            body_preview=email_json.get("bodyPreview", ""),
            web_link=email_json.get("webLink", ""),
            attachments=attachments or [],
        )


class OutlookClient:
    def __init__(self, client_id: str, tenant_id: str, scopes: List[str]):
        self.client_id = client_id
        self.tenant_id = tenant_id
        self.scopes = scopes

    @property
    def access_token(self) -> str:
        return authenticate_and_get_token(self.client_id, self.tenant_id, self.scopes)

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.access_token}",
        }

    def _paginate(self, url: str) -> Iterator[dict]:
        while url:
            response = requests.get(url, headers=self.headers, timeout=60)
            response.raise_for_status()
            payload = response.json()
            for item in payload.get("value", []):
                yield item
            url = payload.get("@odata.nextLink")

    def get_attachments(self, email_id: str) -> Optional[List[Attachment]]:
        endpoint = (
            f"https://graph.microsoft.com/v1.0/me/messages/{email_id}/attachments"
        )
        attachments: list[Attachment] = []
        try:
            for att_json in self._paginate(endpoint):
                if att_json.get("@odata.type") == "#microsoft.graph.fileAttachment":
                    content_bytes = base64.b64decode(att_json.get("contentBytes", ""))
                    attachments.append(
                        Attachment(
                            id=att_json.get("id", ""),
                            name=att_json.get("name", ""),
                            content_type=att_json.get("contentType", ""),
                            content_bytes=content_bytes,
                        )
                    )
            return attachments
        except requests.exceptions.RequestException:
            return None

    def set_email_as_read(self, email_id: str) -> bool:
        endpoint = f"https://graph.microsoft.com/v1.0/me/messages/{email_id}"
        try:
            response = requests.patch(
                endpoint, headers=self.headers, json={"isRead": True}, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException:
            return False

    def set_email_as_unread(self, email_id: str) -> bool:
        endpoint = f"https://graph.microsoft.com/v1.0/me/messages/{email_id}"
        try:
            response = requests.patch(
                endpoint, headers=self.headers, json={"isRead": False}, timeout=30
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException:
            return False

    @staticmethod
    def _should_skip_email_subject(subject: str) -> bool:
        prefixes = (
            "Automatic reply:",
            "Accepted:",
            "Declined:",
            "Tentative:",
        )
        return any(subject.startswith(prefix) for prefix in prefixes)

    @staticmethod
    def _message_body_text(message: dict) -> str:
        body_obj = message.get("body") or {}
        content = body_obj.get("content") or ""
        if (body_obj.get("contentType") or "").lower() == "html":
            content = html_to_plain_text(content)
        return extract_reply_only(content)

    def get_sent_items_for_timekeeper(
        self,
        start_date: str,
        end_date: str,
        on_progress=None,
    ) -> list[dict]:
        """
        Fetch sent mail in date range, returning Timekeeper source dicts.
        on_progress(current, total, message) is optional.
        """
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        start_iso = start_dt.strftime("%Y-%m-%dT00:00:00Z")
        end_iso = end_dt.strftime("%Y-%m-%dT00:00:00Z")
        filter_query = (
            f"sentDateTime ge {start_iso} and sentDateTime lt {end_iso}"
        )
        select = "subject,body,sentDateTime"
        base_url = (
            "https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages"
            f"?$filter={quote(filter_query)}"
            f"&$select={select}&$top=50&$orderby=sentDateTime desc"
        )

        items: list[dict] = []
        scanned = 0
        for message in self._paginate(base_url):
            scanned += 1
            if on_progress and scanned % 20 == 0:
                on_progress(scanned, scanned, f"Processing emails... {scanned}")

            subject = message.get("subject") or ""
            if self._should_skip_email_subject(subject):
                continue

            sent_raw = message.get("sentDateTime") or ""
            sent_local = graph_datetime_to_local(sent_raw)
            date_only = sent_local[:10]
            if not (start_date <= date_only <= end_date):
                continue

            reply_only = self._message_body_text(message)
            items.append(
                {
                    "type": "email",
                    "subject": subject,
                    "body": reply_only[:5000],
                    "date": sent_local,
                }
            )

        if on_progress:
            on_progress(scanned, scanned, f"Found {len(items)} emails in date range")
        return items

    @staticmethod
    def _include_calendar_event(event: dict) -> bool:
        if event.get("isCancelled"):
            return False
        if event.get("isAllDay"):
            return False
        response = (event.get("responseStatus") or {}).get("response", "")
        if event.get("isOrganizer"):
            return True
        return response in ("accepted", "organizer")

    def get_calendar_events_for_timekeeper(
        self,
        start_date: str,
        end_date: str,
        on_progress=None,
    ) -> list[dict]:
        """Fetch calendar occurrences in date range for Timekeeper."""
        start_iso = f"{start_date}T00:00:00"
        end_exclusive = (
            datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        ).strftime("%Y-%m-%dT00:00:00")
        select = (
            "subject,body,start,end,responseStatus,isOrganizer,"
            "isCancelled,isAllDay,iCalUId,seriesMasterId"
        )
        base_url = (
            "https://graph.microsoft.com/v1.0/me/calendarView"
            f"?startDateTime={start_iso}&endDateTime={end_exclusive}"
            f"&$select={select}&$top=50"
        )

        items: list[dict] = []
        scanned = 0
        for event in self._paginate(base_url):
            scanned += 1
            if on_progress and scanned % 20 == 0:
                on_progress(scanned, scanned, f"Processing meetings... {scanned}")

            if not self._include_calendar_event(event):
                continue

            start_info = event.get("start") or {}
            start_raw = start_info.get("dateTime") or ""
            meeting_local = graph_datetime_to_local(start_raw)
            date_only = meeting_local[:10]
            if not (start_date <= date_only <= end_date):
                continue

            end_info = event.get("end") or {}
            end_raw = end_info.get("dateTime") or ""
            duration_minutes = 60
            if start_raw and end_raw:
                try:
                    start_dt = datetime.fromisoformat(start_raw.split(".")[0])
                    end_dt = datetime.fromisoformat(end_raw.split(".")[0])
                    duration_minutes = max(
                        1, int((end_dt - start_dt).total_seconds() // 60)
                    )
                except ValueError:
                    duration_minutes = 60

            body_obj = event.get("body") or {}
            body_content = body_obj.get("content") or ""
            if (body_obj.get("contentType") or "").lower() == "html":
                body_content = html_to_plain_text(body_content)

            external_id = event.get("iCalUId") or event.get("seriesMasterId") or ""

            items.append(
                {
                    "type": "meeting",
                    "subject": event.get("subject") or "",
                    "body": body_content[:5000],
                    "date": meeting_local,
                    "duration_minutes": duration_minutes,
                    "external_id": external_id,
                }
            )

        if on_progress:
            on_progress(scanned, scanned, f"Found {len(items)} meetings in date range")
        return items


def get_timekeeper_outlook_client() -> OutlookClient:
    client_id = get_client_id()
    tenant_id = get_tenant_id()
    scopes = get_scopes()
    if not client_id:
        raise ValueError("AZURE_CLIENT_ID is not configured.")
    return OutlookClient(client_id, tenant_id, scopes)
