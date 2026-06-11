import difflib


def build_patch(file_path: str, before: str, after: str) -> str:

    diff = difflib.unified_diff(
        before.splitlines(),
        after.splitlines(),
        fromfile=file_path,
        tofile=file_path,
        lineterm=""
    )

    return "\n".join(diff)


def generate_patches(top_files, hypotheses, index):

    patches = []

    for h in hypotheses:

        file = h.file or (top_files[0] if top_files else None)
        if not file:
            continue

        meta = index.get(file, {})
        code = meta.get("content", "")

        # -----------------------------
        # 1. event binding issue
        # -----------------------------
        if "event" in h.issue.lower() or "binding" in h.issue.lower():

            before = code
            after = code + "\n// FIX: ensure rebind on view switch\n"

            patches.append({
                "file": file,
                "type": "event-rebind-fix",
                "diff": build_patch(file, before, after)
            })

        # -----------------------------
        # 2. state issue
        # -----------------------------
        elif "state" in h.issue.lower():

            before = code
            after = code + "\n// FIX: ensure state sync before render\n"

            patches.append({
                "file": file,
                "type": "state-sync-fix",
                "diff": build_patch(file, before, after)
            })

        # -----------------------------
        # 3. filter issue
        # -----------------------------
        elif "filter" in h.issue.lower():

            before = code
            after = code + "\n// FIX: reapply filter on view change\n"

            patches.append({
                "file": file,
                "type": "filter-reapply-fix",
                "diff": build_patch(file, before, after)
            })

    return patches