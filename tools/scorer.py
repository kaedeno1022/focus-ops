from pathlib import Path


def score_files(files, hints):

    scored = []

    for f in files:

        score = 0
        lf = f.lower()

        for h in hints:
            if h.lower() in lf:
                score += 200

        if any(x in lf for x in ["state", "event", "filter", "kanban"]):
            score += 100

        try:
            size = Path(f).stat().st_size
            if size < 15000:
                score += 10
        except:
            pass

        scored.append((f, score))

    return sorted(scored, key=lambda x: x[1], reverse=True)