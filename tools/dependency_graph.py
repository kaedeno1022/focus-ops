import re
from pathlib import Path


class DependencyGraph:

    def __init__(self):
        self.graph: dict[str, set[str]] = {}

    def build(self, files: list[str]):

        self.graph.clear()

        for file in files:

            deps = set()

            try:
                text = Path(file).read_text(
                    encoding="utf-8",
                    errors="ignore"
                )

            except Exception:
                continue

            #
            # html script
            #

            deps.update(
                re.findall(
                    r'src="([^"]+)"',
                    text
                )
            )

            #
            # js import
            #

            deps.update(
                re.findall(
                    r'import.*?from\s+[\'"]([^\'"]+)',
                    text
                )
            )

            self.graph[file] = deps

    def expand(
        self,
        files: list[str]
    ) -> list[str]:

        result = set(files)

        for f in files:

            deps = self.graph.get(
                f,
                set()
            )

            result.update(deps)

        return list(result)