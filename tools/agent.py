import sys
import json
from dataclasses import dataclass, asdict, is_dataclass
from typing import Any, Dict, List, Tuple, Optional

from tools.query_mutator import mutate_query
from tools.planner import plan
from tools.indexer import index_codebase
from tools.retriever import retrieve
from tools.evidence import build_evidence
from tools.hypothesis import generate, prune
from tools.llm import call_ollama


# =========================================================
# SAFE SERIALIZER（重要）
# =========================================================

def to_dict(obj: Any):
    """
    LLM入力用の安全変換層
    - dataclass → dict
    - list/dict 再帰対応
    """

    if obj is None:
        return None

    if is_dataclass(obj) and not isinstance(obj, type):
        return asdict(obj)

    if isinstance(obj, list):
        return [to_dict(x) for x in obj]

    if isinstance(obj, dict):
        return {k: to_dict(v) for k, v in obj.items()}

    return obj


# =========================================================
# FINAL EXPLAIN (LLM ONLY)
# =========================================================

def explain(context: Dict[str, Any]) -> str:

    safe_context = to_dict(context)

    prompt = f"""
You are a senior debugging Copilot agent.

Return Japanese only.

RULES:
- Be concise
- No speculation beyond given hypotheses
- Structure:
  1. 原因
  2. 根拠
  3. 修正方針

DATA:
{json.dumps(safe_context, ensure_ascii=False, indent=2)}
"""

    return call_ollama(
        model="qwen2.5-coder:14b",
        prompt=prompt,
        stream=False
    )


# =========================================================
# MAIN PIPELINE
# =========================================================

def run(user_input: str):

    print("\n🔍 input:", user_input)

    # 1. query mutation
    query = mutate_query(user_input)
    print("🧠 query:", query)

    # 2. plan (LLM optional)
    plan_result = plan(query)

    # 3. index
    index = index_codebase()
    print(f"📦 indexed files: {len(index)}")

    # 4. retrieve
    top_files = retrieve(query, index)

    print("📄 top_files:", top_files[:8])

    # 5. evidence graph
    evidence = build_evidence(top_files, index)

    # 6. hypothesis
    hypotheses = prune(generate(evidence))

    print(f"💡 hypotheses: {len(hypotheses)}")

    # 7. context build
    context = {
        "input": user_input,
        "query": query,
        "plan": plan_result,
        "top_files": top_files,
        "hypotheses": hypotheses,
        "evidence_count": len(evidence),
    }

    # 8. LLM final
    print("\n🧠 generating final answer...\n")

    final = explain(context)

    return final


# =========================================================
# CLI
# =========================================================

if __name__ == "__main__":

    if len(sys.argv) > 1:
        user_input = " ".join(sys.argv[1:])
        print(run(user_input))
        sys.exit(0)

    print("agent ready. type your question:")

    while True:
        try:
            user_input = input("> ")

            if user_input.strip().lower() in ["exit", "quit"]:
                break

            result = run(user_input)
            print("\n=== FINAL ===\n")
            print(result)

        except KeyboardInterrupt:
            print("\nbye")
            break