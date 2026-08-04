"""Text helpers shared by COM and Microsoft Graph extractors."""
import re
from html.parser import HTMLParser


def extract_reply_only(body: str) -> str:
    """Extract only the user's reply from an email thread, excluding quoted content."""
    if not body:
        return ""

    separators = [
        r"\n\s*From:.*\n",
        r"\n\s*-----Original Message-----",
        r"\n\s*----- Original Message -----",
        r"\n\s*On .+ wrote:",
        r"\n\s*________+",
        r"\n\s*>",
        r"\n\s*Sent from my ",
    ]

    earliest_pos = len(body)
    for pattern in separators:
        match = re.search(pattern, body, re.IGNORECASE)
        if match and match.start() < earliest_pos:
            earliest_pos = match.start()

    return body[:earliest_pos].strip()


class _HTMLToText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def get_text(self) -> str:
        return "".join(self._parts)


def html_to_plain_text(html: str) -> str:
    if not html:
        return ""
    parser = _HTMLToText()
    try:
        parser.feed(html)
        parser.close()
        text = parser.get_text()
    except Exception:
        text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def graph_datetime_to_local(iso_value: str) -> str:
    """Convert Graph ISO datetime to YYYY-MM-DDTHH:MM:SS local (matches COM output)."""
    from datetime import datetime

    if not iso_value:
        return ""
    normalized = iso_value.replace("Z", "+00:00")
    if "." in normalized:
        base, rest = normalized.split(".", 1)
        if "+" in rest:
            frac, tz = rest.split("+", 1)
            normalized = f"{base}+{tz}"
        elif "-" in rest[1:]:
            frac, tz = rest.rsplit("-", 1)
            normalized = f"{base}-{tz}"
        else:
            normalized = base
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is not None:
        dt = dt.astimezone().replace(tzinfo=None)
    return dt.strftime("%Y-%m-%dT%H:%M:%S")
