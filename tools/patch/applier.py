from pathlib import Path
import shutil
from tools.patch.schema import Patch


def apply_patch(patch: Patch):

    path = Path(patch.file)

    if not path.exists():
        print(f"[SKIP] file not found: {patch.file}")
        return False

    # backup
    backup = path.with_suffix(path.suffix + ".bak")
    shutil.copy(path, backup)

    # naive patch apply（簡易版）
    original = path.read_text(encoding="utf-8")

    # NOTE: 本来は unified diff parser 推奨
    new_content = _apply_simple_replace(original, patch.diff)

    path.write_text(new_content, encoding="utf-8")

    print(f"[APPLIED] {patch.file}")
    return True


def _apply_simple_replace(original: str, diff: str) -> str:
    """
    超簡易版（実運用ならdiff parserに置き換え）
    """
    lines = diff.split("\n")

    for line in lines:
        if line.startswith("-") and not line.startswith("---"):
            original = original.replace(line[1:], "")
        if line.startswith("+") and not line.startswith("+++"):
            original += "\n" + line[1:]

    return original