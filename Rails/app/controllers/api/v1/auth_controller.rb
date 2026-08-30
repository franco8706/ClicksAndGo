module Api
  module V1
    # =====================================================================
    # 🔐 ADAPTER DE NEXTAUTH — el puente que le devuelve Postgres a Rails
    # =====================================================================
    #
    # ## Por qué existe
    #
    # `Web/src/auth.ts` abría su PROPIO pool de Postgres y hacía 14 queries
    # directas. Eso rompía la regla central del proyecto —Rails es el único
    # dueño de la base— y, más concreto, desbordaba el presupuesto de
    # conexiones: `clicks-db2` es db-f1-micro y acepta 25 en total, de las
    # cuales ~20 quedan para la app. Con `maxScale: 50` y un pool por
    # instancia, Next.js solo podía pedir hasta 150.
    #
    # Mover las sesiones acá NO elimina esas conexiones: las CONCENTRA. En vez
    # de dos servicios compitiendo por 20, queda uno con presupuesto acotado
    # (maxScale 4 × 4 hilos = 16), que sí entra.
    #
    # ## Por qué los tokens van en el CUERPO y no en la URL
    #
    # `session_token` y el token de verificación son credenciales portadoras:
    # quien las tiene, es el usuario. Una URL —path o query string— termina en
    # los logs de acceso de Cloud Run, en el historial del proxy y en cualquier
    # herramienta de observabilidad. Eso convertiría un log en un almacén de
    # sesiones robables. Por eso los lookups de sesión son POST con el token en
    # el body, aunque semánticamente sean lecturas: la corrección de seguridad
    # gana sobre la pureza REST.
    #
    # El mismo criterio aplica al email en `users/lookup`: es dato personal.
    #
    # ## Autenticación
    #
    # `InternalApiAuth` es obligatorio acá. Estos endpoints crean sesiones: sin
    # la clave compartida, cualquiera con acceso de red a Rails podría fabricar
    # una sesión para el usuario que quisiera. Cloud Run expone Rails con
    # `ingress: all`, así que la clave es lo único que separa esto de internet.
    class AuthController < ApplicationController
      include InternalApiAuth

      # ── Usuarios ──────────────────────────────────────────────────────

      def create_user
        user = User.create!(
          name: params[:name],
          email: params[:email],
          email_verified: params[:emailVerified],
          image: params[:image]
        )
        render json: serialize_user(user), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: "ERROR", message: e.message }, status: :unprocessable_entity
      end

      def find_user
        user = User.find_by(id: params[:id])
        return render json: nil, status: :ok unless user

        render json: serialize_user(user), status: :ok
      end

      # POST — el email es dato personal y no debe quedar en los logs de acceso.
      # Resuelve los dos lookups del adapter: por email y por cuenta OAuth.
      def lookup_user
        user =
          if params[:email].present?
            User.find_by(email: params[:email])
          elsif params[:provider].present? && params[:providerAccountId].present?
            Account.find_by(
              provider: params[:provider],
              provider_account_id: params[:providerAccountId]
            )&.user
          end

        return render json: nil, status: :ok unless user

        render json: serialize_user(user), status: :ok
      end

      def update_user
        user = User.find_by(id: params[:id])
        return render json: { status: "ERROR" }, status: :not_found unless user

        # COALESCE del SQL original: un campo ausente NO borra el valor previo.
        user.name           = params[:name]          if params.key?(:name)          && !params[:name].nil?
        user.email          = params[:email]         if params.key?(:email)         && !params[:email].nil?
        user.email_verified = params[:emailVerified] if params.key?(:emailVerified) && !params[:emailVerified].nil?
        user.image          = params[:image]         if params.key?(:image)         && !params[:image].nil?
        user.save!

        render json: serialize_user(user), status: :ok
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: "ERROR", message: e.message }, status: :unprocessable_entity
      end

      def delete_user
        User.where(id: params[:id]).destroy_all
        render json: { status: "SUCCESS" }, status: :ok
      end

      # ── Cuentas OAuth ─────────────────────────────────────────────────

      def link_account
        # Upsert por (provider, provider_account_id), igual que el
        # `ON CONFLICT DO UPDATE` del SQL original: reautenticarse con el mismo
        # proveedor refresca los tokens en vez de fallar por duplicado.
        cuenta = Account.find_or_initialize_by(
          provider: params[:provider],
          provider_account_id: params[:providerAccountId]
        )
        cuenta.user_id       = params[:userId]
        cuenta.type          = params[:type]
        cuenta.access_token  = params[:access_token]
        cuenta.refresh_token = params[:refresh_token]
        cuenta.expires_at    = params[:expires_at]
        # Estos tres solo se fijan al crear: el SQL original tampoco los
        # actualizaba en el conflicto.
        if cuenta.new_record?
          cuenta.token_type    = params[:token_type]
          cuenta.scope         = params[:scope]
          cuenta.id_token      = params[:id_token]
          cuenta.session_state = params[:session_state]
        end
        cuenta.save!

        render json: { status: "SUCCESS" }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: "ERROR", message: e.message }, status: :unprocessable_entity
      end

      def unlink_account
        Account.where(
          provider: params[:provider],
          provider_account_id: params[:providerAccountId]
        ).destroy_all
        render json: { status: "SUCCESS" }, status: :ok
      end

      # ── Sesiones (token SIEMPRE en el cuerpo) ─────────────────────────

      def create_session
        sesion = Session.create!(
          user_id: params[:userId],
          session_token: params[:sessionToken],
          expires: params[:expires]
        )
        render json: serialize_session(sesion), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: "ERROR", message: e.message }, status: :unprocessable_entity
      end

      # POST aunque sea una lectura: ver la nota de arriba sobre los tokens.
      # Es el endpoint más caliente del sistema — corre en CADA request de un
      # usuario logueado, así que trae la sesión y el usuario en una sola query.
      def lookup_session
        sesion = Session.includes(:user).find_by(session_token: params[:sessionToken])
        return render json: nil, status: :ok unless sesion&.user

        render json: {
          session: serialize_session(sesion),
          user: serialize_user(sesion.user)
        }, status: :ok
      end

      def update_session
        sesion = Session.find_by(session_token: params[:sessionToken])
        return render json: nil, status: :ok unless sesion

        sesion.update!(expires: params[:expires])
        render json: serialize_session(sesion), status: :ok
      end

      def delete_session
        Session.where(session_token: params[:sessionToken]).destroy_all
        render json: { status: "SUCCESS" }, status: :ok
      end

      # ── Tokens de verificación (magic links) ──────────────────────────

      def create_verification_token
        vt = VerificationToken.create!(
          identifier: params[:identifier],
          token: params[:token],
          expires: params[:expires]
        )
        render json: serialize_verification_token(vt), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { status: "ERROR", message: e.message }, status: :unprocessable_entity
      end

      # Consumir es DESTRUIR: un magic link vale una sola vez. Si se devolviera
      # sin borrar, el enlace del email quedaría reutilizable indefinidamente.
      def use_verification_token
        vt = VerificationToken.find_by(
          identifier: params[:identifier],
          token: params[:token]
        )
        return render json: nil, status: :ok unless vt

        datos = serialize_verification_token(vt)
        VerificationToken.where(identifier: params[:identifier], token: params[:token]).delete_all
        render json: datos, status: :ok
      end

      private

      # Las claves salen en camelCase porque es el contrato que espera
      # NextAuth (`AdapterUser`). La traducción vive acá y no en el cliente
      # para que el adapter de Next.js sea un pasamanos sin lógica.
      def serialize_user(user)
        {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.email_verified,
          image: user.image
        }
      end

      def serialize_session(sesion)
        {
          userId: sesion.user_id,
          sessionToken: sesion.session_token,
          expires: sesion.expires
        }
      end

      def serialize_verification_token(vt)
        { identifier: vt.identifier, token: vt.token, expires: vt.expires }
      end
    end
  end
end
