# =========================================================
# FASE 1: BUILDER
# =========================================================
FROM rust:slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache de dependencias: solo recompila si cambian Cargo.toml / Cargo.lock
RUN USER=root cargo new --bin clicks-agent
WORKDIR /app/clicks-agent
COPY Cargo.toml Cargo.lock* ./
RUN cargo build --release
RUN rm src/*.rs ./target/release/deps/clicks_agent*

# Compilación real con optimizaciones para CPUs de Cloud Run (Intel Haswell+)
COPY src ./src
RUN RUSTFLAGS="-C target-cpu=x86-64-v2" cargo build --release

# =========================================================
# FASE 2: RUNNER — distroless (sin shell, sin package mgr)
# Imagen ~25MB vs ~120MB de debian:slim → cold-starts más rápidos
# Incluye: glibc, libssl3, ca-certificates — suficiente para TLS y MongoDB Atlas
# =========================================================
FROM gcr.io/distroless/cc-debian12:nonroot AS runner

WORKDIR /app

COPY --from=builder --chown=65532:65532 \
    /app/clicks-agent/target/release/clicks-agent /app/clicks-agent

EXPOSE 8080
ENV PORT=8080

# nonroot (UID 65532) ya es el usuario por defecto de :nonroot
ENTRYPOINT ["/app/clicks-agent"]
