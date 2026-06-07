# =========================================================
# 🏗️ FASE 1: BUILDER
# =========================================================
FROM ruby:3.2-slim AS builder

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    libpq-dev \
    pkg-config \
    libyaml-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock* ./

RUN bundle lock --add-platform x86_64-linux && \
    bundle config set --local without 'development test' && \
    bundle config set --local deployment 'true' && \
    bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

# =========================================================
# 🚀 FASE 2: RUNNER 
# =========================================================
FROM ruby:3.2-slim AS runner

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    postgresql-client \
    libpq5 \
    tzdata \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r railsgroup && useradd -r -g railsgroup railsuser

# 1. Copiamos el código
COPY --chown=railsuser:railsgroup . .

# 2. Sobrescribimos el Gemfile.lock de tu PC con el de Linux
COPY --from=builder --chown=railsuser:railsgroup /app/Gemfile.lock ./

# 3. Copiamos las gemas instaladas
COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /app/vendor/bundle /app/vendor/bundle 

# 4. 🛡️ FIX DE PERMISOS: Creamos las carpetas y le damos propiedad absoluta a railsuser
RUN mkdir -p /app/tmp/pids /app/log /app/storage && \
    chown -R railsuser:railsgroup /app

RUN chmod +x /app/entrypoint.sh

ENV RAILS_ENV="production" \
    RAILS_LOG_TO_STDOUT="true" \
    BUNDLE_WITHOUT="development:test" \
    RUBY_YJIT_ENABLE="1" \
    BUNDLE_PATH="/app/vendor/bundle" \
    SECRET_KEY_BASE="llave_maestra_temporal_para_docker_1234567890"

# Bajamos los privilegios AL FINAL
USER railsuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/up || exit 1

# En lugar del entrypoint, levantamos el servidor directo para aislar el error
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]