# =========================================================
# 📦 FASE 1: DEPENDENCIAS (Caché estricto)
# =========================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install 

# =========================================================
# 🏗️ FASE 2: BUILDER (Compilación de la App)
# =========================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Dominio público canónico. Se inyecta en BUILD porque las NEXT_PUBLIC_* se
# reemplazan por su valor al compilar: si no está presente acá, queda vacío en
# la imagen y no hay variable de entorno en Cloud Run que lo arregle después.
# Los redirects de idioma del proxy (src/proxy.ts) se construyen contra esta
# base para no filtrar la URL interna *.run.app cuando Cloudflare reescribe el Host.
ARG NEXT_PUBLIC_SITE_URL=https://clicks-and-go.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

# =========================================================
# 🚀 FASE 3: RUNNER (Imagen Final Ultraligera y Segura)
# =========================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

# El binario de Sharp ya viene incluido en el standalone gracias a package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 🔒 Blindaje: Ejecutar como usuario sin privilegios
USER nextjs

EXPOSE 3000

# 🩺 HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]