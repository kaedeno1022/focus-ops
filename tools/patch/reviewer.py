from tools.patch.schema import Patch


def show_patch(patches: list[Patch]) -> bool:

    print("\n===== PATCH PREVIEW =====\n")

    for i, p in enumerate(patches):

        print(f"[{i}] FILE: {p.file}")
        print(f"REASON: {p.reason}")
        print(f"CONFIDENCE: {p.confidence}")
        print("\n--- DIFF ---")
        print(p.diff)
        print("\n----------------------\n")

    ans = input("Apply these patches? (y/N): ")

    return ans.lower().strip() == "y"