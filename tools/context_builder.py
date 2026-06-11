from pathlib import Path

MAX_CHARS = 30000


def build_context(files):

    chunks = []
    total = 0

    for f, _ in files:

        try:
            text = Path(f).read_text(errors="ignore")[:3000]
        except:
            continue

        chunk = f"\nFILE:{f}\n{text}\n"

        if total + len(chunk) > MAX_CHARS:
            break

        chunks.append(chunk)
        total += len(chunk)

    return "\n".join(chunks)