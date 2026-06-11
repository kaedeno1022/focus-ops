# tools/contradiction_checker.py

def check_contradiction(prev_hypothesis: list[str], new_text: str) -> bool:
    """
    仮説が崩れてるかチェック
    """

    if not prev_hypothesis:
        return False

    for h in prev_hypothesis:
        if h not in new_text:
            return True

    return False