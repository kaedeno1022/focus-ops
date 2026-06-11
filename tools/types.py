from dataclasses import dataclass
from typing import List, Dict, Optional


@dataclass
class Query:
    primary: str
    expanded: List[str]


@dataclass
class Plan:
    task_type: str
    keywords: List[str]
    files_hint: List[str]
    intent: str


@dataclass
class Evidence:
    file: str
    signals: Dict[str, int]
    score: float
    snippets: List[str]


@dataclass
class Hypothesis:
    issue: str
    file: Optional[str]
    confidence: float
    evidence: List[str]
    contradictions: List[str]