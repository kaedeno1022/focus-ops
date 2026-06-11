# tools/prompt.py

def build_prompt(query: str, files: list, hypotheses: list, evidence: dict):
    prompt = []

    prompt.append("あなたはCopilot型コード解析エージェントです。")
    prompt.append("与えられた仮説とコード証拠から、バグ原因を特定してください。")

    prompt.append("\n# USER QUERY")
    prompt.append(query)

    prompt.append("\n# TARGET FILES")
    for f in files:
        prompt.append(f"- {f}")

    prompt.append("\n# EVIDENCE")
    for f, ev in evidence.items():
        prompt.append(f"{f}: {ev}")

    prompt.append("\n# HYPOTHESES")
    for h in hypotheses:
        prompt.append(
            f"- issue: {h.issue} | file: {h.file} | confidence: {h.confidence}"
        )

    prompt.append("\n# TASK")
    prompt.append("""
次を必ず実行：

1. 最も可能性の高い原因を1つ選ぶ
2. なぜそれが起きるか説明する
3. 実コード上の修正方針を書く
4. 不確実性があれば明示する

出力フォーマット：
- 原因
- 根拠
- 修正方針
- 確信度（%）
""")

    return "\n".join(prompt)