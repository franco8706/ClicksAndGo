import re

class DataNormalizerAgent:
    """
    Escudo Zero-Trust de Normalización v4.0.
    Garantiza que ningún dato tóxico o mal tipado llegue a la IA o a la Base de Datos.
    """
    
    @staticmethod
    def sanitize_string(text: str) -> str:
        if not text: return ""
        clean = re.sub(r'<[^>]+>', '', str(text))
        clean = re.sub(r'[\n\r\t]+', ' ', clean)
        return clean.strip()

    @staticmethod
    def extract_number(value, default=0.0):
        if isinstance(value, (int, float)): return float(value)
        if not value: return default
        clean_str = re.sub(r'[^\d.]', '', str(value).replace(',', '.'))
        try:
            return float(clean_str) if clean_str else default
        except ValueError:
            return default

    def normalize_laptop_data(self, raw_data: dict) -> dict:
        """Convierte datos crudos de APIs al contrato estricto de Clicks & Go v4.0."""
        
        title = self.sanitize_string(raw_data.get("name", ""))
        
        ram_match = re.search(r'(\d+)\s*(?:GB|gb)\s*(?:RAM|ram|Memoria)?', title)
        ram_gb = int(ram_match.group(1)) if ram_match else 8
        
        storage_match = re.search(r'(\d+)\s*(?:GB|TB|gb|tb)\s*(?:SSD|HDD)?', title)
        storage_gb = int(storage_match.group(1)) if storage_match else 256
        if storage_match and 'TB' in storage_match.group(0).upper():
            storage_gb *= 1024

        country = self.sanitize_string(raw_data.get("country_code", "US"))[:2].upper()
        
        # Mapeo determinista de moneda según el país (Reparación de la Fuga Financiera)
        currency_map = {"AR": "ARS", "US": "USD", "ES": "EUR", "MX": "MXN", "BR": "BRL", "CO": "COP", "CL": "CLP"}
        currency = raw_data.get("currency") or currency_map.get(country, "USD")

        # Matriz Cambiaria Centralizada (Solo Ingesta) — referencia ~2026.
        # TODO: idealmente alimentar desde una API FX (ej. exchangerate.host) en lugar de hardcode.
        # Unidades por 1 USD.
        exchange_rates = {
            "ARS": 1450.0,
            "EUR": 0.92,
            "MXN": 17.5,
            "BRL": 5.2,
            "COP": 3900.0,
            "CLP": 920.0,
            "USD": 1.0
        }
        applied_rate = exchange_rates.get(currency, 1.0)

        original_price = self.extract_number(raw_data.get("financials", {}).get("original_price"))
        current_price = self.extract_number(raw_data.get("financials", {}).get("current_price"))

        # Cálculo del descuento en Backend
        discount_pct = 0
        if original_price > current_price and original_price > 0:
            discount_pct = int(((original_price - current_price) / original_price) * 100)

        return {
            "sku_original": self.sanitize_string(raw_data.get("sku_original", "")),
            "retailer_slug": self.sanitize_string(raw_data.get("retailer_slug", "generic")),
            "country_code": country,
            "currency": currency,
            "brand": self.sanitize_string(raw_data.get("brand", "Genérica")),
            "name": title[:150],
            "condition": "new",
            "hardware": {
                "cpu": self.sanitize_string(raw_data.get("cpu", "Procesador Estándar")),
                "gpu": self.sanitize_string(raw_data.get("gpu", "Gráficos Integrados")),
                "ram_gb": ram_gb,
                "storage_gb": storage_gb,
                "display_inches": 15.6
            },
            "financials": {
                "original_price": original_price,
                "current_price": current_price,
                "discount_pct": discount_pct,
                "applied_exchange_rate": applied_rate,
                "in_stock": True
            },
            "urls": {
                "image": raw_data.get("urls", {}).get("image", ""),
                "affiliate_raw": raw_data.get("urls", {}).get("affiliate_raw", "")
            }
        }