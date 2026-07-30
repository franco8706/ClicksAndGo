"""Configuración común de la suite.

Todos los tests corren OFFLINE por defecto: `IMAGE_VERIFY_ENABLED=false` evita
que `clean_image_url` salga a la red. Cuando un test necesita ejercitar la
verificación HTTP, mockea `requests.get` explícitamente.
"""

import os
import sys

import pytest

# La verificación de imágenes hace GET reales; en tests se apaga salvo que el
# propio test la encienda con el mock puesto.
os.environ.setdefault("IMAGE_VERIFY_ENABLED", "false")
os.environ.setdefault("FX_LIVE_ENABLED", "false")


@pytest.fixture
def reload_module():
    """Recarga un módulo para que relea variables de entorno en el import.

    Varios módulos leen `os.getenv` a nivel de módulo (patrón del proyecto),
    así que cambiar el entorno no basta: hay que reimportar.
    """
    def _reload(name: str):
        for mod in list(sys.modules):
            if mod == name or mod.startswith(f"{name}."):
                del sys.modules[mod]
        return __import__(name, fromlist=["*"])

    return _reload
