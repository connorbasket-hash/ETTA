"""Progress reporting for Outlook extract scripts (stderr JSON lines)."""
import json
import sys


def send_progress(stage: str, message: str, current: int = 0, total: int = 0) -> None:
    progress = {
        "type": "progress",
        "stage": stage,
        "message": message,
        "current": current,
        "total": total,
    }
    print(json.dumps(progress), file=sys.stderr, flush=True)
