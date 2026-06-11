from typing import List


def rank_files(files: List[str], hits: List[str]) -> List[str]:
    if not files:
        return []

    # hitに含まれるもの優先（最低限）
    scored = []

    for f in files:
        score = 0
        for h in hits:
            if h in f:
                score += 1
        scored.append((score, f))

    scored.sort(reverse=True)

    return [f for _, f in scored]