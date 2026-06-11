from tools.llm import call_ollama
from tools.patch.schema import Patch
import json


def generate_patch(user_input: str, context: dict) -> list[Patch]:

    prompt = f"""
You are a senior software engineer.

Return ONLY JSON array of patches.

Each item:
{{
  "file": "...",
  "diff": "... unified diff ...",
  "reason": "...",
  "confidence": 0.0-1.0
}}

RULES:
- no explanation
- no markdown
- diff must be valid unified diff
- minimal changes only

CONTEXT:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""

    raw = call_ollama(
        model="qwen2.5-coder:14b",
        prompt=prompt
    )

    try:
        data = json.loads(raw)
    except Exception:
        return []

    return [
        Patch(**p) for p in data
        if isinstance(p, dict)
    ]