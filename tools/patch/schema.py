from dataclasses import dataclass
from typing import List


@dataclass
class Patch:
    file: str
    diff: str
    reason: str
    confidence: float