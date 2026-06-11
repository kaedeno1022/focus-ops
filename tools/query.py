from dataclasses import dataclass
from typing import List


@dataclass
class Query:
    primary: str
    expanded: List[str]