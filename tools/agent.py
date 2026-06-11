import sys

from tools.query_mutator import mutate_query
from tools.planner import plan
from tools.indexer import index_codebase
from tools.retriever import retrieve
from tools.evidence import build_evidence
from tools.hypothesis import generate, prune
from tools.llm import call_ollama


def explain(context):

    prompt = f"""
You are a senior debugging agent.

Return Japanese only.

1. 原因
2. 根拠
3. 修正方針

DATA:
{context}
"""

    return call_ollama(
        model="qwen2.5-coder:14b",
        prompt=prompt
    )


def run(user_input: str):

    query = mutate_query(user_input)

    plan_result = plan(query)

    index = index_codebase()

    top_files = retrieve(query, index)

    evidence = build_evidence(top_files, index)

    hypotheses = prune(generate(evidence))

    context = {
        "input": user_input,
        "query": query.expanded,
        "plan": plan_result.task_type,
        "top_files": top_files,
        "hypotheses": [
            {
                "issue": h.issue,
                "file": h.file,
                "confidence": h.confidence,
                "evidence": h.evidence
            }
            for h in hypotheses
        ]
    }

    return explain(context)


if __name__ == "__main__":

    if len(sys.argv) > 1:
        print(run(" ".join(sys.argv[1:])))
        exit()

    print("agent ready. type your question:")

    while True:
        try:
            user_input = input("> ").strip()

            if user_input in ["exit", "quit"]:
                break

            print(run(user_input))

        except Exception as e:
            print("[ERROR]", e)