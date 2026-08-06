"""
=============================================================================
📦 CLICKS & GO — Taxonomía de catálogo digital (v2)

Fuente única de verdad para "¿qué es este producto y dónde va en el sitio?".
Reemplaza al clasificador de 9 tipos planos: el catálogo pasó de "notebooks y
algunos periféricos" a **todo el catálogo digital de los retailers**, que es
lo que traen los feeds de afiliados de verdad.

DOS NIVELES:
  · categoría    — la navegación macro del sitio (9 valores, cerrados)
  · subcategoría — el tipo concreto de producto (~45 valores, cerrados)

Ambos son cerrados a propósito. Un feed trae texto libre del comerciante; si
la taxonomía se derivara de ese texto, la navegación del sitio cambiaría sola
cada vez que Newegg renombre una rama. Acá se traduce a valores propios.

CÓMO SE DISEÑÓ: muestreando 38 keywords contra la Product Search API de
Rakuten (2026-08-06) → 170 rutas de categoría distintas sobre 693.670
productos. Las reglas de abajo salen de esa distribución real, no de imaginar
categorías.

FORMA DEL DATO DE ENTRADA (Rakuten/Newegg):
    primary   = "Electronics"
    secondary = "Electronics Accessories~~Power~~Batteries~~Laptop Batteries"
La HOJA (último segmento) es la que describe el producto; los niveles de
arriba son demasiado genéricos y además se repiten entre ramas distintas.
=============================================================================
"""

from __future__ import annotations

# ─────────────────────────────────────────────────────────────────────────
# 1. TAXONOMÍA CANÓNICA
# ─────────────────────────────────────────────────────────────────────────
# categoría → subcategorías válidas. El orden es el de navegación del sitio.
TAXONOMY: dict[str, tuple[str, ...]] = {
    "computing":   ("laptop", "desktop", "tablets", "servers", "workstations"),
    "displays":    ("monitor", "projectors", "tv"),
    "components":  ("cpu", "gpu", "ram", "motherboards", "power_supplies",
                    "cooling", "cases", "sound_cards", "capture_cards"),
    "storage":     ("ssd", "hdd", "external_drives", "usb_flash", "nas",
                    "memory_cards", "optical_drives"),
    "peripherals": ("keyboard", "mouse", "headphones", "speakers", "microphones",
                    "webcam", "gamepads", "mousepads"),
    "networking":  ("routers", "switches", "network_cards", "range_extenders",
                    "modems", "cables_network"),
    "printing":    ("printer", "scanners", "supplies", "printer_parts",
                    "paper_media"),
    "power":       ("ups", "surge_protectors", "batteries", "chargers", "cables_power"),
    "accessories": ("docking_stations", "kvm", "mounts_stands", "bags_cases",
                    "laptop_parts", "adapters", "cleaning", "other_accessories"),
}

#: Todas las subcategorías válidas, para validación barata.
ALL_SUBCATEGORIES: frozenset[str] = frozenset(
    sub for subs in TAXONOMY.values() for sub in subs
)

#: subcategoría → categoría. Se deriva para no repetir el mapa a mano.
SUBCATEGORY_PARENT: dict[str, str] = {
    sub: cat for cat, subs in TAXONOMY.items() for sub in subs
}


# ─────────────────────────────────────────────────────────────────────────
# 2. RAMAS DE NIVEL 1 QUE NO SON CATÁLOGO DIGITAL
# ─────────────────────────────────────────────────────────────────────────
# Newegg es un marketplace: además de tecnología revende muebles, repuestos
# de auto, ropa y hasta artículos para mascotas. Medido sobre la muestra real:
#   Furniture 107 · Vehicles & Parts 27 · Apparel 9 · Health & Beauty 4
#   Baby & Toddler 1 · Animals & Pet Supplies 1 · Sporting Goods 2
# Nada de eso entra, por más que venga del mismo feed.
PRIMARY_NO_DIGITAL: frozenset[str] = frozenset({
    "apparel & accessories", "health & beauty", "baby & toddler",
    "animals & pet supplies", "sporting goods", "vehicles & parts",
    "food beverages & tobacco", "toys & games", "luggage & bags",
    "mature", "religious & ceremonial", "furniture",
})

# `Home & Garden`, `Office Supplies`, `Hardware` y `Arts & Entertainment` NO
# se rechazan de plano: mezclan artículos irrelevantes con cosas que sí son
# del rubro (sillas gamer, papel de impresión, herramientas de armado). Para
# esas ramas manda la hoja, igual que para Electronics.


# ─────────────────────────────────────────────────────────────────────────
# 2b. RESCATE: señales de tecnología que le ganan a la rama del comerciante
# ─────────────────────────────────────────────────────────────────────────
# El comerciante se equivoca al categorizar más seguido de lo que el título
# miente. Medido sobre la muestra real: 15 de 56 rechazos (27%) eran productos
# tecnológicos legítimos mal ubicados por Newegg — tres headsets gamer de
# marca (Lenovo Legion, SteelSeries Arctis, HyperX Cloud) estaban publicados
# bajo "Vehicles & Parts".
#
# Solo entran frases que NO pueden aparecer en un producto de otro rubro. Por
# eso "gaming headset" y no "headset", "graphics card" y no "card": el filtro
# se aplica sobre items YA rechazados, y una regla laxa acá dejaría entrar el
# Funko POP "Mouse Trap" y el tensiómetro "Blood Pressure Monitor" que la
# misma muestra mostró rechazados correctamente.
STRONG_TECH_SIGNALS: tuple[str, ...] = (
    "gaming headset", "gaming mouse", "gaming keyboard", "mechanical keyboard",
    "graphics card", "video card", "motherboard", "nvme", "ssd",
    "gaming monitor", "wireless router", "mesh wifi", "docking station",
    "thinkpad", "macbook", "chromebook", "ryzen", "geforce", "radeon",
    "ddr3", "ddr4", "ddr5", "power supply", "webcam",
)


# ─────────────────────────────────────────────────────────────────────────
# 3. REGLAS HOJA → SUBCATEGORÍA
# ─────────────────────────────────────────────────────────────────────────
# Se evalúan EN ORDEN y gana la primera que matchea, así que lo específico va
# antes que lo genérico: "laptop batteries" tiene que resolver antes que
# "laptop", y "monitor mount" antes que "monitor".
#
# Cada tupla es (fragmento_a_buscar, subcategoría). El fragmento se busca
# dentro de la hoja de la categoría; si la hoja no resuelve, se reintenta
# sobre la ruta completa y por último sobre el título del producto.
LEAF_RULES: tuple[tuple[str, str], ...] = (
    # ── Partes y repuestos (ANTES que el equipo del que son parte) ──────
    ("laptop batteries",          "batteries"),
    ("laptop replacement screen", "laptop_parts"),
    ("laptop parts",              "laptop_parts"),
    ("laptop docking",            "docking_stations"),
    ("docking station",           "docking_stations"),
    ("projector replacement",     "printer_parts"),
    ("printer part",              "printer_parts"),
    ("printhead",                 "printer_parts"),
    ("cooling part",              "cooling"),
    ("system cooling",            "cooling"),

    # ── Impresión ──────────────────────────────────────────────────────
    ("toner",                     "supplies"),
    ("inkjet cartridge",          "supplies"),
    ("ink cartridge",             "supplies"),
    ("scanner",                   "scanners"),
    ("printer",                   "printer"),
    ("print copy scan",           "printer"),
    ("printer paper",             "paper_media"),

    # ── Almacenamiento ─────────────────────────────────────────────────
    ("network storage",           "nas"),
    ("nas",                       "nas"),
    ("usb flash",                 "usb_flash"),
    ("flash drive",               "usb_flash"),
    ("memory card",               "memory_cards"),
    ("external hard",             "external_drives"),
    ("external drive",            "external_drives"),
    ("solid state",               "ssd"),
    ("ssd",                       "ssd"),
    ("hard drive",                "hdd"),
    ("optical drive",             "optical_drives"),

    # ── Componentes ────────────────────────────────────────────────────
    ("motherboard",               "motherboards"),
    ("circuit board",             "motherboards"),
    ("ram",                       "ram"),
    ("memory module",             "ram"),
    ("processor",                 "cpu"),
    ("cpu",                       "cpu"),
    ("video card",                "gpu"),
    ("graphics card",             "gpu"),
    ("gpu",                       "gpu"),
    ("sound card",                "sound_cards"),
    ("capture card",              "capture_cards"),
    ("computer power suppl",      "power_supplies"),
    ("power supply",              "power_supplies"),
    ("server cases",              "cases"),
    ("computer case",             "cases"),
    ("cooling",                   "cooling"),

    # ── Redes ──────────────────────────────────────────────────────────
    ("bridges & routers",         "routers"),
    ("router",                    "routers"),
    ("range extender",            "range_extenders"),
    ("network switch",            "switches"),
    ("network card",              "network_cards"),
    ("network adapter",           "network_cards"),
    ("modem",                     "modems"),
    ("network cable",             "cables_network"),
    ("ethernet",                  "cables_network"),

    # ── Energía ────────────────────────────────────────────────────────
    ("ups",                       "ups"),
    ("uninterruptible",           "ups"),
    ("surge protection",          "surge_protectors"),
    ("surge protector",           "surge_protectors"),
    ("batteries",                 "batteries"),
    ("battery",                   "batteries"),
    ("charger",                   "chargers"),
    ("power cable",               "cables_power"),
    ("power cord",                "cables_power"),

    # ── Periféricos ────────────────────────────────────────────────────
    ("mice & trackball",          "mouse"),
    ("mouse pad",                 "mousepads"),
    ("mousepad",                  "mousepads"),
    ("mouse",                     "mouse"),
    ("keyboard",                  "keyboard"),
    ("headphone",                 "headphones"),
    ("headset",                   "headphones"),
    ("earbud",                    "headphones"),
    ("microphone",                "microphones"),
    ("speaker",                   "speakers"),
    ("webcam",                    "webcam"),
    ("web camera",                "webcam"),
    ("gamepad",                   "gamepads"),
    ("game controller",           "gamepads"),

    # ── Pantallas ──────────────────────────────────────────────────────
    ("computer monitor",          "monitor"),
    ("monitor",                   "monitor"),
    ("projector",                 "projectors"),
    ("television",                "tv"),

    # ── Equipos ────────────────────────────────────────────────────────
    ("laptop",                    "laptop"),
    ("notebook computer",         "laptop"),
    ("chromebook",                "laptop"),
    ("desktop computer",          "desktop"),
    ("desktop",                   "desktop"),
    ("workstation",               "workstations"),
    ("server",                    "servers"),
    ("tablet",                    "tablets"),

    # ── Accesorios varios ──────────────────────────────────────────────
    ("kvm",                       "kvm"),
    ("mount",                     "mounts_stands"),
    ("stand",                     "mounts_stands"),
    ("rack",                      "mounts_stands"),
    ("carrying case",             "bags_cases"),
    ("backpack",                  "bags_cases"),
    ("laptop bag",                "bags_cases"),
    ("sleeve",                    "bags_cases"),
    ("adapter",                   "adapters"),
    ("cleaning",                  "cleaning"),

    # ── Cables genéricos (AL FINAL: "audio & video cables" tiene que
    #    poder resolver antes por su rama) ────────────────────────────
    ("cable",                     "cables_power"),
)


def _hoja(secondary: str) -> str:
    """Último segmento de la ruta jerárquica, en minúsculas."""
    partes = [p.strip() for p in str(secondary or "").split("~~") if p.strip()]
    return partes[-1].lower() if partes else ""


def _buscar(texto: str) -> str | None:
    """Regla MÁS ESPECÍFICA que matchea dentro de `texto`.

    Gana el fragmento más largo, y a igual longitud el que aparece antes. No
    gana el orden de la lista: eso hacía que un "SteelSeries Arctis Gaming
    Headset … 30 Hour Battery" saliera como batería, porque la regla de
    baterías está más arriba que la de auriculares.

    El fragmento más largo es el más específico por construcción —
    "laptop batteries" describe mejor que "laptop", y "docking station" mejor
    que "laptop"—, así que la especificidad deja de depender de que alguien
    mantenga el orden correcto al agregar una regla.
    """
    if not texto:
        return None
    candidatos = [
        (len(frag), -texto.find(frag), sub)
        for frag, sub in LEAF_RULES
        if frag in texto
    ]
    return max(candidatos)[2] if candidatos else None


def classify_product(primary: str, secondary: str, title: str = "") -> tuple[str, str] | None:
    """Devuelve `(categoría, subcategoría)` o `None` si no es catálogo digital.

    Tres intentos, del dato más confiable al menos:
      1. la HOJA de la categoría — la asigna el comerciante sobre una
         taxonomía cerrada, es lo más estructurado que hay;
      2. la RUTA completa — cubre las hojas genéricas tipo "Computers", donde
         la rama de arriba sí dice de qué se trata;
      3. el TÍTULO — texto libre, último recurso.

    `None` significa descartar. No hay categoría "otros" de fallback a nivel
    producto: algo que no se pudo ubicar en la taxonomía no puede navegarse
    ni filtrarse en el sitio, así que no entra.
    """
    pri = str(primary or "").strip().lower()

    # El feed trae filas corruptas: se observó un `<primary>` que era una URL
    # entera de producto. No se intenta interpretarla — se descarta la fila.
    if pri.startswith("http"):
        return None

    titulo = str(title or "").lower()

    if pri in PRIMARY_NO_DIGITAL and not any(s in titulo for s in STRONG_TECH_SIGNALS):
        return None

    sub = (
        _buscar(_hoja(secondary))
        or _buscar(str(secondary or "").lower().replace("~~", " "))
        or _buscar(titulo)
    )
    if sub is None:
        return None

    categoria = SUBCATEGORY_PARENT.get(sub)
    if categoria is None:          # regla apuntando a una subcategoría borrada
        return None
    return categoria, sub


def is_valid_pair(category: str, subcategory: str) -> bool:
    """¿El par pertenece a la taxonomía? Lo usa la validación de ingesta."""
    return subcategory in TAXONOMY.get(category, ())
