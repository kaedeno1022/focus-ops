from pathlib import Path
from collections import defaultdict
import re


TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9_.-]+")


class ContentIndex:

    def __init__(self):

        self.token_index: dict[str, set[str]] = defaultdict(set)

        self.file_index: dict[str, str] = {}

        self.symbol_index: dict[str, set[str]] = defaultdict(set)

    def build(self, files: list[str]):

        self.token_index.clear()
        self.file_index.clear()
        self.symbol_index.clear()

        for file in files:

            path = Path(file)

            self.file_index[path.name.lower()] = file

            try:
                text = path.read_text(
                    encoding="utf-8",
                    errors="ignore"
                )
            except Exception:
                continue

            self._index_tokens(file, text)
            self._index_symbols(file, text)

    def _index_tokens(
        self,
        file: str,
        text: str
    ):

        for token in TOKEN_PATTERN.findall(
            text.lower()
        ):
            self.token_index[token].add(file)

    def _index_symbols(
        self,
        file: str,
        text: str
    ):

        patterns = [

            r"function\s+([A-Za-z0-9_]+)",
            r"class\s+([A-Za-z0-9_]+)",
            r"const\s+([A-Za-z0-9_]+)",
            r"let\s+([A-Za-z0-9_]+)",
            r"var\s+([A-Za-z0-9_]+)",

            r"def\s+([A-Za-z0-9_]+)",
            r"class\s+([A-Za-z0-9_]+)",

            r'id="([^"]+)"',
            r"id='([^']+)'",
        ]

        for pattern in patterns:

            for match in re.findall(
                pattern,
                text
            ):
                self.symbol_index[
                    match.lower()
                ].add(file)

    def search_files(
        self,
        filename: str
    ) -> list[str]:

        filename = filename.lower()

        results = []

        for name, path in self.file_index.items():

            if filename in name:
                results.append(path)

        return results

    def search_tokens(
        self,
        tokens: list[str]
    ) -> list[str]:

        hits = set()

        for token in tokens:

            hits.update(
                self.token_index.get(
                    token.lower(),
                    set()
                )
            )

        return list(hits)

    def search_symbols(
        self,
        symbols: list[str]
    ) -> list[str]:

        hits = set()

        for symbol in symbols:

            hits.update(
                self.symbol_index.get(
                    symbol.lower(),
                    set()
                )
            )

        return list(hits)