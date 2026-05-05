FROM rust:latest as build_stage
RUN apt-get update && apt-get install -y pkg-config libssl-dev libpq-dev build-essential
WORKDIR /app
COPY . .
RUN cargo build --release
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libssl3 libpq5 && rm -rf /var/lib/apt/lists/*
COPY --from=build_stage /app/target/release/agente-lenovo /agente-lenovo
EXPOSE 8080
CMD ["/agente-lenovo"]
