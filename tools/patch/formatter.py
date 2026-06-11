import re


def normalize_diff(diff: str) -> str:
    """
    - garbage removal
    - ensure headers exist
    """

    diff = diff.strip()

    # 最低限のdiffチェック
    if not diff.startswith("---") and not diff.startswith("diff"):
        return ""

    return diff


def extract_target_files(diff: str) -> list[str]:
    return re.findall(r"^\+\+\+ b/(.+)$", diff, re.M)