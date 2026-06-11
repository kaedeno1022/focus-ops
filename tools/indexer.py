from pathlib import Path


def index_codebase(root="."):

    index = {}

    for p in Path(root).rglob("*"):

        if not p.is_file():
            continue

        index[str(p)] = {
            "event_score": 0,
            "state_score": 0,
            "filter_score": 0,
            "render_score": 0,
            "keywords": []
        }

        text = p.read_text(errors="ignore").lower()

        if "event" in text:
            index[str(p)]["event_score"] += 1
        if "state" in text:
            index[str(p)]["state_score"] += 1
        if "filter" in text:
            index[str(p)]["filter_score"] += 1
        if "render" in text:
            index[str(p)]["render_score"] += 1

    return index