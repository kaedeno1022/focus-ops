# tools/hypothesis_engine.py

from dataclasses import dataclass

@dataclass
class Hypothesis:
    issue: str
    file: str | None
    confidence: float
    reasoning: str


def extract_hypothesis(llm_output: str) -> list[Hypothesis]:
    """
    LLM出力から仮説を構造化（簡易でもOK）
    """

    # 超シンプル版（後で強化）
    import re

    results = []

    for line in llm_output.splitlines():
        if "bug" in line.lower() or "issue" in line.lower():
            results.append(
                Hypothesis(
                    issue=line[:80],
                    file=None,
                    confidence=0.5,
                    reasoning=line,
                )
            )

    return results