class Rack::Attack

  # ── Throttles de lectura ────────────────────────────────────────────────────
  # Catálogo: 120 req/min por IP (el frontend hace batches de ~3 requests en carga)
  throttle("catalog/ip", limit: 120, period: 60) do |req|
    req.ip if req.get? && req.path.start_with?("/api/v1/notebooks")
  end

  # Noticias: 60 req/min por IP
  throttle("news/ip", limit: 60, period: 60) do |req|
    req.ip if req.get? && req.path.include?("hardware_news")
  end

  # ── Throttles de escritura ─────────────────────────────────────────────────
  # POST desde Python (scraper): límite más generoso por IP interna
  throttle("write/ip", limit: 30, period: 60) do |req|
    req.ip if req.post? && req.path.start_with?("/api/v1/")
  end

  # ── Bloqueo de herramientas de escaneo ─────────────────────────────────────
  blocklist("block-scanners") do |req|
    ua = req.user_agent.to_s.downcase
    ua.match?(/sqlmap|nikto|masscan|nmap|dirbuster|zgrab|nuclei/)
  end

  # ── Respuesta estándar para throttled ─────────────────────────────────────
  self.throttled_responder = lambda do |_env|
    [429,
     { "Content-Type" => "application/json" },
     ['{"error":"Rate limit exceeded","retry_after":60}']]
  end
end
