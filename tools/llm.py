import requests
import json


OLLAMA_URL = "http://localhost:11434/api/generate"


def call_ollama(model: str, prompt: str, stream: bool = False) -> str:

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": stream
    }

    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=120)

        if r.status_code != 200:
            return f"[ERROR] Ollama HTTP {r.status_code}: {r.text}"

        data = r.json()

        return data.get("response", "")

    except Exception as e:
        return f"[ERROR] {str(e)}"