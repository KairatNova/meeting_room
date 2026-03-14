import sys
from pathlib import Path


# Добавляем backend/ в sys.path, чтобы импорты вида `from app...` работали в pytest.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

