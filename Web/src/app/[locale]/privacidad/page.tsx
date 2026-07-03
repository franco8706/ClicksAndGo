import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    es: "Política de Privacidad | Clicks & Go",
    en: "Privacy Policy | Clicks & Go",
    pt: "Política de Privacidade | Clicks & Go",
  };
  return { title: titles[locale] ?? titles.es };
}

const CONTENT: Record<string, {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
  backLabel: string;
}> = {
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 9 de junio de 2026",
    backLabel: "← Volver al inicio",
    sections: [
      {
        heading: "1. Responsable del tratamiento",
        body: "Clicks & Go opera como plataforma de comparación de precios de laptops. El responsable del tratamiento de datos personales es el titular del sitio, domiciliado en Argentina. Para consultas: info@clicksandgo.com",
      },
      {
        heading: "2. Datos que recopilamos",
        body: "Recopilamos exclusivamente los datos que usted nos proporciona al registrarse:\n• Email (obligatorio para identificarle)\n• Nombre y apellido (opcional, para personalizar su experiencia)\n• Teléfono (opcional, únicamente para recuperación de cuenta)\n• Ciudad (opcional, para mostrar precios localizados)\n\nNo recopilamos dirección postal, datos de pago ni información sensible según el artículo 2 de la Ley 25.326 (Argentina).",
      },
      {
        heading: "3. Uso de los datos",
        body: "Sus datos se utilizan exclusivamente para:\n• Autenticar su sesión en Clicks & Go\n• Mostrarle precios y ofertas localizadas según su región\n• Enviarle alertas de precio si las solicita\n• Recuperar su cuenta mediante número de teléfono (si lo proporcionó)\n\nNo vendemos, cedemos ni comercializamos sus datos personales con terceros.",
      },
      {
        heading: "4. Proveedores de autenticación OAuth",
        body: "Si elige iniciar sesión con Google, Microsoft o Facebook, esos servicios pueden transferirnos su nombre e imagen de perfil según sus propias políticas de privacidad. Únicamente almacenamos el identificador de cuenta y el email asociado. No accedemos a otros datos de su cuenta en esos servicios.",
      },
      {
        heading: "5. Links de afiliados",
        body: "Clicks & Go participa en programas de afiliación (Amazon Associates, Awin, CJ Affiliate, MercadoLibre). Cuando hace clic en 'Comprar', es redirigido a la tienda oficial correspondiente mediante nuestra pasarela /out. Este proceso no implica transferencia de sus datos personales a las tiendas. Podemos recibir una comisión si realiza una compra, sin costo adicional para usted.",
      },
      {
        heading: "6. Cookies y tecnologías similares",
        body: "Utilizamos cookies estrictamente necesarias para mantener su sesión activa (cookie de sesión NextAuth). No utilizamos cookies de rastreo publicitario de terceros. Al usar el sitio, acepta el uso de estas cookies esenciales.",
      },
      {
        heading: "7. Seguridad",
        body: "Sus datos se almacenan en Google Cloud SQL (cifrado en tránsito con SSL/TLS y en reposo). Las contraseñas no existen en nuestro sistema: usamos magic links de email y OAuth, eliminando el riesgo de contraseñas comprometidas.",
      },
      {
        heading: "8. Sus derechos",
        body: "De acuerdo con la Ley 25.326 (Argentina), GDPR (Unión Europea) y LGPD (Brasil), usted tiene derecho a:\n• Acceder a sus datos personales\n• Rectificar datos inexactos\n• Solicitar la eliminación de su cuenta y datos\n• Portabilidad de sus datos\n\nPara ejercer estos derechos, contáctenos en info@clicksandgo.com. Respondemos en un plazo máximo de 30 días hábiles.",
      },
      {
        heading: "9. Retención de datos",
        body: "Conservamos sus datos mientras su cuenta esté activa. Si solicita la eliminación de su cuenta, eliminamos todos sus datos personales en un plazo de 30 días, excepto aquellos que debamos conservar por obligaciones legales.",
      },
      {
        heading: "10. Cambios en esta política",
        body: "Podemos actualizar esta política periódicamente. Le notificaremos cambios significativos por email o mediante un aviso destacado en el sitio. El uso continuado del servicio tras la notificación implica su aceptación.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: June 9, 2026",
    backLabel: "← Back to home",
    sections: [
      {
        heading: "1. Data Controller",
        body: "Clicks & Go operates as a laptop price comparison platform. The data controller is the site owner, based in Argentina. Contact: info@clicksandgo.com",
      },
      {
        heading: "2. Data We Collect",
        body: "We only collect the data you provide when registering:\n• Email (required for identification)\n• First and last name (optional, to personalize your experience)\n• Phone number (optional, only for account recovery)\n• City (optional, to display localized prices)\n\nWe do not collect postal addresses, payment data, or sensitive information.",
      },
      {
        heading: "3. How We Use Your Data",
        body: "Your data is used exclusively to:\n• Authenticate your session on Clicks & Go\n• Show you localized prices and deals based on your region\n• Send price alerts if you request them\n• Recover your account via phone number (if provided)\n\nWe do not sell, rent, or share your personal data with third parties.",
      },
      {
        heading: "4. OAuth Authentication Providers",
        body: "If you choose to sign in with Google, Microsoft, or Facebook, those services may share your name and profile picture with us according to their own privacy policies. We only store the account identifier and associated email. We do not access any other data from your accounts on those services.",
      },
      {
        heading: "5. Affiliate Links",
        body: "Clicks & Go participates in affiliate programs (Amazon Associates, Awin, CJ Affiliate, MercadoLibre). When you click 'Buy', you are redirected to the official store through our /out gateway. This process does not transfer your personal data to stores. We may receive a commission if you make a purchase, at no extra cost to you.",
      },
      {
        heading: "6. Cookies",
        body: "We use strictly necessary cookies to keep your session active (NextAuth session cookie). We do not use third-party advertising tracking cookies. By using the site, you accept these essential cookies.",
      },
      {
        heading: "7. Security",
        body: "Your data is stored on Google Cloud SQL (encrypted in transit with SSL/TLS and at rest). Passwords do not exist in our system — we use email magic links and OAuth, eliminating the risk of compromised passwords.",
      },
      {
        heading: "8. Your Rights",
        body: "Under GDPR (EU), LGPD (Brazil), and applicable laws, you have the right to:\n• Access your personal data\n• Correct inaccurate data\n• Request deletion of your account and data\n• Data portability\n\nTo exercise these rights, contact us at info@clicksandgo.com. We respond within 30 business days.",
      },
      {
        heading: "9. Data Retention",
        body: "We retain your data while your account is active. If you request account deletion, we remove all your personal data within 30 days, except data we must retain for legal obligations.",
      },
      {
        heading: "10. Changes to This Policy",
        body: "We may update this policy periodically. We will notify you of significant changes by email or via a prominent notice on the site. Continued use of the service after notification implies your acceptance.",
      },
    ],
  },
  pt: {
    title: "Política de Privacidade",
    updated: "Última atualização: 9 de junho de 2026",
    backLabel: "← Voltar ao início",
    sections: [
      {
        heading: "1. Responsável pelo tratamento",
        body: "Clicks & Go opera como plataforma de comparação de preços de laptops. O responsável pelo tratamento de dados pessoais é o titular do site, com sede na Argentina. Contato: info@clicksandgo.com",
      },
      {
        heading: "2. Dados que coletamos",
        body: "Coletamos apenas os dados que você nos fornece ao se registrar:\n• Email (obrigatório para identificação)\n• Nome e sobrenome (opcional, para personalizar sua experiência)\n• Telefone (opcional, somente para recuperação de conta)\n• Cidade (opcional, para exibir preços localizados)\n\nNão coletamos endereço postal, dados de pagamento ou informações sensíveis.",
      },
      {
        heading: "3. Uso dos dados",
        body: "Seus dados são usados exclusivamente para:\n• Autenticar sua sessão no Clicks & Go\n• Mostrar preços e ofertas localizados com base na sua região\n• Enviar alertas de preço se você solicitar\n• Recuperar sua conta via número de telefone (se fornecido)\n\nNão vendemos, alugamos nem compartilhamos seus dados pessoais com terceiros.",
      },
      {
        heading: "4. Provedores OAuth",
        body: "Se você optar por entrar com Google, Microsoft ou Facebook, esses serviços podem compartilhar seu nome e foto de perfil conosco conforme suas próprias políticas de privacidade. Armazenamos apenas o identificador de conta e o email associado. Não acessamos outros dados de suas contas nesses serviços.",
      },
      {
        heading: "5. Links de afiliados",
        body: "Clicks & Go participa de programas de afiliados (Amazon Associates, Awin, CJ Affiliate, MercadoLibre). Ao clicar em 'Comprar', você é redirecionado para a loja oficial pelo nosso gateway /out. Esse processo não transfere seus dados pessoais para as lojas. Podemos receber uma comissão se você fizer uma compra, sem custo adicional para você.",
      },
      {
        heading: "6. Cookies",
        body: "Usamos cookies estritamente necessários para manter sua sessão ativa (cookie de sessão NextAuth). Não usamos cookies de rastreamento publicitário de terceiros. Ao usar o site, você aceita esses cookies essenciais.",
      },
      {
        heading: "7. Segurança",
        body: "Seus dados são armazenados no Google Cloud SQL (criptografados em trânsito com SSL/TLS e em repouso). Senhas não existem no nosso sistema — usamos magic links de email e OAuth, eliminando o risco de senhas comprometidas.",
      },
      {
        heading: "8. Seus direitos",
        body: "De acordo com a LGPD (Brasil), GDPR (UE) e leis aplicáveis, você tem o direito de:\n• Acessar seus dados pessoais\n• Corrigir dados imprecisos\n• Solicitar a exclusão de sua conta e dados\n• Portabilidade de dados\n\nPara exercer esses direitos, entre em contato pelo info@clicksandgo.com. Respondemos em até 30 dias úteis.",
      },
      {
        heading: "9. Retenção de dados",
        body: "Mantemos seus dados enquanto sua conta estiver ativa. Se você solicitar a exclusão da conta, removemos todos os seus dados pessoais em 30 dias, exceto dados que devemos manter por obrigações legais.",
      },
      {
        heading: "10. Alterações nesta política",
        body: "Podemos atualizar esta política periodicamente. Notificaremos você sobre mudanças significativas por email ou por meio de um aviso em destaque no site. O uso continuado do serviço após a notificação implica sua aceitação.",
      },
    ],
  },
};

export default async function PrivacidadPage({ params }: Props) {
  const { locale } = await params;
  const content = CONTENT[locale] ?? CONTENT.es;
  const dict: any = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  return (
    <div className="min-h-screen bg-black pt-32 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-10">
          <Link
            href={`/${locale}`}
            className="text-xs text-gray-600 hover:text-blue-400 transition-colors font-semibold uppercase tracking-widest mb-6 inline-block"
          >
            {content.backLabel}
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/25 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-blue-400" />
            </div>
            <h1
              className="text-5xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              {content.title}
            </h1>
          </div>
          <p className="text-gray-600 text-sm">{content.updated}</p>
        </div>

        {/* Contenido */}
        <div className="space-y-8">
          {content.sections.map((section) => (
            <div key={section.heading} className="bg-gray-950/60 border border-gray-800/40 rounded-2xl p-6">
              <h2
                className="text-lg font-bold text-white mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {section.heading}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-gray-900 flex flex-wrap gap-4 text-xs text-gray-600">
          <Link href={`/${locale}/terminos`} className="hover:text-blue-400 transition-colors font-semibold">
            {dict.footer?.termsLink || "Términos"}
          </Link>
          <Link href={`/${locale}/cookies`} className="hover:text-blue-400 transition-colors font-semibold">
            {dict.footer?.cookiesLink || "Cookies"}
          </Link>
          <Link href={`/${locale}`} className="hover:text-blue-400 transition-colors font-semibold">
            Clicks & Go
          </Link>
        </div>

      </div>
    </div>
  );
}
