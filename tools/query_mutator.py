from tools.types import Query


def mutate_query(user_input: str) -> Query:

    expanded = []

    lower = user_input.lower()

    if "daily" in lower:
        expanded += ["daily", "html"]

    if "filter" in lower:
        expanded += ["filter"]

    if "kanban" in lower:
        expanded += ["kanban"]

    return Query(
        primary=user_input,
        expanded=list(set(expanded))
    )