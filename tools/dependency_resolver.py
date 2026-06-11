# tools/dependency_resolver.py

from pathlib import Path
import re


IMPORT_PATTERNS = [
    r'import .*? from ["\'](.*?)["\']',
    r'src=["\'](.*?)["\']',
    r'href=["\'](.*?)["\']',
]


def _read(path: str) -> str:

    try:
        return Path(path).read_text(
            encoding="utf-8",
            errors="ignore"
        )

    except Exception:
        return ""


def _resolve_path(
    current_file: str,
    dep: str
) -> str | None:

    dep = dep.split("?")[0]
    dep = dep.split("#")[0]

    if not dep:
        return None

    # URL除外
    if dep.startswith("http"):
        return None

    if dep.startswith("//"):
        return None

    current_dir = Path(current_file).parent

    resolved = (
        current_dir / dep
    ).resolve()

    if resolved.exists():

        return str(
            resolved.relative_to(
                Path.cwd()
            )
        )

    return None


def resolve_dependencies(
    files: list[str],
    max_depth: int = 2,
) -> list[str]:

    resolved = set(files)

    queue = list(files)

    depth = 0

    while queue and depth < max_depth:

        current = queue.copy()

        queue.clear()

        for file in current:

            text = _read(file)

            if not text:
                continue

            for pattern in IMPORT_PATTERNS:

                for dep in re.findall(
                    pattern,
                    text
                ):

                    dep_file = _resolve_path(
                        file,
                        dep
                    )

                    if not dep_file:
                        continue

                    if dep_file in resolved:
                        continue

                    resolved.add(dep_file)

                    queue.append(dep_file)

        depth += 1

    return list(resolved)