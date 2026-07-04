require 'ipaddr'
require 'net/http'
require 'uri'

module Api
  module V1
    # =========================================================
    # 🌍 ENDPOINT: GET /api/v1/geo
    # Resolución de país por IP compartida entre la Web (middleware
    # de Next.js) y la App móvil (React Native). Un solo lugar de
    # verdad para "desde dónde entra el usuario".
    #
    # Prioridad:
    #   1. ?country=XX          (override manual / testing)
    #   2. Cabeceras de plataforma (Vercel / Cloudflare / CloudFront)
    #   3. Lookup por IP (ip-api.com, cacheado 24h por IP)
    #   4. Fallback 'US'
    # =========================================================
    class GeoController < ApplicationController
      SUPPORTED_COUNTRIES = %w[AR ES US MX BR CO CL].freeze

      GEO_CURRENCY_MAP = {
        'AR' => 'ARS', 'ES' => 'EUR', 'MX' => 'MXN', 'US' => 'USD',
        'BR' => 'BRL', 'CO' => 'COP', 'CL' => 'CLP'
      }.freeze

      COUNTRY_LOCALE_MAP = {
        'BR' => 'pt', 'US' => 'en',
        'ES' => 'es', 'AR' => 'es', 'MX' => 'es', 'CO' => 'es', 'CL' => 'es'
      }.freeze

      def show
        country = resolve_country
        country = 'US' unless SUPPORTED_COUNTRIES.include?(country)

        render json: {
          country_code: country,
          currency: GEO_CURRENCY_MAP.fetch(country, 'USD'),
          locale: COUNTRY_LOCALE_MAP.fetch(country, 'es'),
          supported_countries: SUPPORTED_COUNTRIES
        }, status: :ok
      end

      private

      def resolve_country
        # 1. Override explícito (testing y preferencia del usuario)
        override = params[:country].to_s.upcase[0, 2]
        return override if SUPPORTED_COUNTRIES.include?(override)

        # 2. Cabeceras de plataforma (gratis, sin latencia)
        header_country =
          request.headers['x-vercel-ip-country'] ||
          request.headers['cf-ipcountry'] ||
          request.headers['cloudfront-viewer-country']
        return header_country.upcase[0, 2] if header_country.present?

        # 3. Lookup por IP real (cacheado 24h por IP)
        ip = client_ip
        return 'US' if ip.blank? || private_ip?(ip)

        Rails.cache.fetch("geo/ip/#{ip}", expires_in: 24.hours) do
          lookup_country_by_ip(ip) || 'US'
        end
      end

      def client_ip
        forwarded = request.headers['X-Forwarded-For'].to_s.split(',').first.to_s.strip
        candidate = forwarded.presence || request.remote_ip
        # 🛡️ SSRF guard: X-Forwarded-For lo controla el cliente. Aceptamos
        # SOLO una IP válida — así nunca entra un valor como "@evil.com" que
        # desviaría el host del lookup vía userinfo de la URL.
        valid_ip?(candidate) ? candidate : nil
      end

      def valid_ip?(str)
        return false if str.blank?
        IPAddr.new(str)
        true
      rescue IPAddr::InvalidAddressError
        false
      end

      def private_ip?(ip)
        ip == '::1' || ip.start_with?('127.', '10.', '192.168.', '::ffff:') ||
          ip.match?(/\A172\.(1[6-9]|2\d|3[01])\./)
      end

      def lookup_country_by_ip(ip)
        # ip ya viene validada por valid_ip? (formato IP puro) — sin interpolación peligrosa
        uri = URI("http://ip-api.com/json/#{ip}?fields=countryCode")
        response = Net::HTTP.start(uri.host, uri.port, open_timeout: 1.5, read_timeout: 1.5) do |http|
          http.get(uri.request_uri)
        end
        return nil unless response.is_a?(Net::HTTPSuccess)

        JSON.parse(response.body)['countryCode']&.upcase&.slice(0, 2)
      rescue StandardError => e
        Rails.logger.warn("[Geo] Lookup de IP falló (#{e.class}): sirviendo fallback")
        nil
      end
    end
  end
end
