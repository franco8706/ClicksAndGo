# ☁️ Migración a AWS — Clicks & Go

Guía de despliegue en AWS tras la baja de Google Cloud (billing). El stack completo
ya está dockerizado, así que la ruta más simple y barata es **una instancia EC2
con Docker Compose** (todo incluido: Postgres, MongoDB y los 4 microservicios).

## 🧠 Inteligencia sin billing de GCP (importante)

**Vertex AI es un servicio de Google Cloud**: sin facturación GCP activa, no funciona
desde ninguna nube. La cadena cognitiva quedó preparada en 3 niveles con failover
automático (`Python/src/providers/router.py`):

| Nivel | Proveedor | Requiere | Estado |
|---|---|---|---|
| 1 | **Vertex AI** | Billing GCP activo | Se reactiva solo cuando vuelva el billing |
| 2 | **Gemini API** (AI Studio) | Solo una API key **gratis** | ✅ Funciona desde AWS, sin billing GCP |
| 3 | **Antigravity** | Nada (heurística local) | ✅ Siempre disponible |

👉 Sacá tu API key gratis en https://aistudio.google.com/apikey y ponela en `.env`
como `GEMINI_API_KEY`. Con eso los agentes (scoring, SEO, noticias, auditoría legal)
siguen usando **Gemini real** aunque GCP esté caído.

## 🚀 Despliegue rápido (EC2 + Docker Compose)

1. **Crear la instancia** (consola AWS → EC2 → Launch instance):
   - AMI: Ubuntu Server 22.04 LTS (o 24.04)
   - Tipo: `t3.medium` mínimo (2 vCPU / 4 GB — el build de Rust lo necesita);
     `t3.small` puede servir si construís las imágenes en otra máquina.
   - Storage: 30 GB gp3
   - **Security Group**: entrada TCP 22 (tu IP) y TCP 80 (0.0.0.0/0)

2. **Conectarse y desplegar**:
   ```bash
   ssh -i tu-clave.pem ubuntu@IP-PUBLICA
   curl -fsSL https://raw.githubusercontent.com/franco8706/ClicksAndGo/main/Infra/aws/deploy-ec2.sh -o deploy-ec2.sh
   bash deploy-ec2.sh
   # La primera corrida crea .env → editarlo (nano ~/clicksandgo/.env) → correr de nuevo
   bash deploy-ec2.sh
   ```

3. **Verificar**: `sudo docker compose ps` → los 6 contenedores `healthy`,
   y la web en `http://IP-PUBLICA/es`.

## 🌍 Geolocalización en AWS

A diferencia de Vercel/Cloudflare, EC2 no inyecta cabeceras de país. El middleware
del frontend ya lo resuelve solo: hace lookup de la IP del visitante (ip-api.com)
con caché en cookie de 30 días. No requiere configuración.

## 📈 Escalado futuro (cuando haya tráfico real)

- **Dominio + HTTPS**: apuntar un dominio a la IP (Elastic IP) y poner Caddy o
  un ALB con certificado ACM adelante. Requerido para redes de afiliados.
- **Datos gestionados**: migrar Postgres a RDS y Mongo a DocumentDB/Atlas
  (cambiar `DATABASE_URL` / `MONGODB_URI` en `.env` — el código no cambia).
- **Contenedores gestionados**: ECS Fargate o App Runner reutilizando los mismos
  Dockerfiles (equivalente a los manifests de `Infra/cloud/` de Cloud Run).

## 💰 Costo estimado

- `t3.medium` on-demand: ~USD 30/mes (con Savings Plan ~USD 19/mes).
- Free tier de AWS (12 meses, cuentas nuevas): `t3.micro` gratis — alcanza para
  demo/aprobación de afiliados si el build se hace aparte.
