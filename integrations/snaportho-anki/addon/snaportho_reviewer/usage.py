import os
import sys

HEARTBEAT_FILENAME = "usage_heartbeat.txt"


def os_family(platform=None):
    value = sys.platform if platform is None else platform
    if value == "darwin":
        return "mac"
    if str(value).startswith("win"):
        return "windows"
    if str(value).startswith("linux"):
        return "linux"
    return "other"


def utc_day(now=None):
    from datetime import datetime, timezone
    current = now or datetime.now(timezone.utc)
    return current.date().isoformat()


def heartbeat_path(addon_root):
    return os.path.join(addon_root, "user_files", HEARTBEAT_FILENAME)


def read_heartbeat_day(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return handle.read().strip() or None
    except OSError:
        return None


def write_heartbeat_day(path, day):
    directory = os.path.dirname(path)
    os.makedirs(directory, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(day)


def should_send_heartbeat(last_day, today):
    return bool(today) and last_day != today
