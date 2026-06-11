from tools.types import Evidence


def build_evidence(files, index):

    out = []

    for f in files:

        meta = index.get(f, {})

        signals = {
            "event": meta.get("event_score", 0),
            "state": meta.get("state_score", 0),
            "filter": meta.get("filter_score", 0),
            "render": meta.get("render_score", 0),
        }

        score = sum(signals.values())

        out.append(
            Evidence(
                file=f,
                signals=signals,
                score=score,
                snippets=[]
            )
        )

    return out