from pathlib import Path


ROOT = Path(".")

IGNORE_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    ".venv",
    "venv",
    "dist",
    "build",
}

IGNORE_SUFFIXES = {
    ".pyc",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".pdf",
    ".zip",
    ".exe",
}


def get_files() -> list[str]:

    files = []

    for p in ROOT.rglob("*"):

        if not p.is_file():
            continue

        if any(part in IGNORE_DIRS for part in p.parts):
            continue

        if p.suffix.lower() in IGNORE_SUFFIXES:
            continue

        files.append(str(p))

    return files


def read_file(path: str) -> str:

    try:
        return Path(path).read_text(
            encoding="utf-8",
            errors="ignore",
        )
    except Exception:
        return ""