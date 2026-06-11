from dataclasses import is_dataclass, asdict
from typing import Any

def to_dict(obj: Any):
    if is_dataclass(obj) and not isinstance(obj, type):
        return asdict(obj)

    if isinstance(obj, list):
        return [to_dict(x) for x in obj]

    if isinstance(obj, dict):
        return {k: to_dict(v) for k, v in obj.items()}

    return obj