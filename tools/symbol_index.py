import re

from pathlib import Path
from collections import defaultdict


PATTERNS = [

    r"function\s+([A-Za-z_]\w*)",

    r"class\s+([A-Za-z_]\w*)",

    r"const\s+([A-Za-z_]\w*)",

    r'getElementById\("([^"]+)"\)',

    r'id="([^"]+)"'
]


class SymbolIndex:

    def __init__(self):

        self.index = defaultdict(set)

    def build(
        self,
        files: list[str]
    ):

        self.index.clear()

        for file in files:

            try:

                text = Path(file).read_text(
                    encoding="utf-8",
                    errors="ignore"
                )

            except Exception:
                continue

            for pattern in PATTERNS:

                for symbol in re.findall(
                    pattern,
                    text
                ):

                    self.index[
                        symbol.lower()
                    ].add(file)

    def search(
        self,
        queries: list[str]
    ) -> list[str]:

        hits = set()

        for q in queries:

            hits.update(
                self.index.get(
                    q.lower(),
                    set()
                )
            )

        return list(hits)

    def search_top(self, queries: list[str], limit: int = 30):

        hits = self.search(queries)

        return hits[:limit]