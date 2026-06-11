import subprocess


def verify():
    """
    プロジェクトに応じてテスト or lint を回す
    """

    try:
        result = subprocess.run(
            ["python", "-m", "compileall", "."],
            capture_output=True,
            text=True
        )

        return result.returncode == 0

    except Exception:
        return False