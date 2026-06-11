import json
import re

from tools.llm import call_ollama
from tools.types import Plan


PROMPT = """
Return JSON only.

{
  "task_type": "bug|ui bug|logic bug|refactor|unknown",
  "keywords": ["keyword"],
  "files_hint": ["file"],
  "intent": "investigate|explain|debug"
}

INPUT:
{input}
"""


def plan(query):

    text = query.primary if hasattr(query, "primary") else str(query)

    raw = call_ollama(
        model="qwen2.5-coder:14b",
        prompt=PROMPT.replace("{input}", text),
        stream=False
    )

    match = re.search(r"\{[\s\S]*\}", raw)

    if not match:
        data = {}
    else:
        try:
            data = json.loads(match.group())
        except json.JSONDecodeError:
            data = {}

    return Plan(
        task_type=data.get("task_type", "unknown"),
        keywords=data.get("keywords", []),
        files_hint=data.get("files_hint", []),
        intent=data.get("intent", "unknown"),
    )