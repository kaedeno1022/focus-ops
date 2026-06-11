from tools.types import Hypothesis


def generate(evidence):

    out = []

    for ev in evidence:

        s = ev.signals

        if s["state"] and s["filter"] and s["render"]:
            out.append(Hypothesis(
                issue="state-filter-render desync",
                file=ev.file,
                confidence=0.75,
                evidence=["state", "filter", "render"],
                contradictions=[]
            ))

        if s["event"] and s["filter"]:
            out.append(Hypothesis(
                issue="event binding lost on view switch",
                file=ev.file,
                confidence=0.8,
                evidence=["event", "filter"],
                contradictions=[]
            ))

    return out


def prune(hypotheses):

    seen = set()
    out = []

    for h in sorted(hypotheses, key=lambda x: x.confidence, reverse=True):

        key = (h.issue, h.file)

        if key in seen:
            continue

        if h.confidence < 0.5:
            continue

        out.append(h)
        seen.add(key)

    return out[:5]