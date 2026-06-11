from tools.types import Query


def retrieve(query: Query, index: dict, k=10):

    scores = []

    for f, meta in index.items():

        score = 0

        for q in query.expanded:
            if q in f.lower():
                score += 3

        score += meta.get("event_score", 0)
        score += meta.get("state_score", 0)
        score += meta.get("filter_score", 0)
        score += meta.get("render_score", 0)

        scores.append((f, score))

    scores.sort(key=lambda x: x[1], reverse=True)

    return [f for f, _ in scores[:k]]