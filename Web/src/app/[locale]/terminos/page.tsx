import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    es: "Términos de Uso | Clicks & Go",
    en: "Terms of Use | Clicks & Go",
    pt: "Termos de Uso | Clicks & Go",
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
    title: "Términos de Uso",
    updated: "Última actualización: 9 de junio de 2026",
    backLabel: "← Volver al inicio",
    sections: [
      {
        heading: "1. Aceptación de los términos",
        body: "Al acceder o usar Clicks & Go, aceptás estos Términos de Uso. Si no estás de acuerdo, no utilices el servicio. Nos reservamos el derecho de modificarlos en cualquier momento con aviso previo.",
      },
      {
        heading: "2. Descripción del servicio",
        body: "Clicks & Go es una plataforma de comparación de precios de laptops. Rastreamos precios de tiendas oficiales y mostramos la mejor oferta disponible en tu región. No somos una tienda ni vendemos productos directamente.",
      },
      {
        heading: "3. Exactitud de precios y disponibilidad",
        body: "Los precios son actualizados automáticamente y verificados antes de mostrarse. Sin embargo, los precios pueden cambiar entre el momento en que se captura la información y cuando hacés clic en 'Comprar'. La disponibilidad final del producto y el precio de venta lo determina exclusivamente la tienda oficial.",
      },
      {
        heading: "4. Links de afiliados y comisiones",
        body: "Clicks & Go participa en programas de afiliados. Cuando comprás a través de nuestros links, podemos recibir una comisión de la tienda. Esto no modifica el precio que pagás ni condiciona las recomendaciones que hacemos. Mostramos las mejores ofertas objetivamente, independientemente de si generan comisión.",
      },
      {
        heading: "5. Uso de la cuenta",
        body: "Al crear una cuenta en Clicks & Go:\n• Sos responsable de mantener la seguridad de tu cuenta\n• No podés transferir tu cuenta a terceros\n• Aceptás recibir emails transaccionales relacionados con el servicio\n• Podés solicitar la eliminación de tu cuenta en cualquier momento",
      },
      {
        heading: "6. Conducta prohibida",
        body: "Está prohibido:\n• Usar el servicio para fines comerciales no autorizados\n• Intentar extraer datos masivamente (scraping) sin autorización\n• Usar bots, scrapers o medios automatizados para acceder al sitio\n• Vulnerar o intentar vulnerar la seguridad del sistema",
      },
      {
        heading: "7. Propiedad intelectual",
        body: "El contenido de Clicks & Go (diseño, código, textos, logotipo) es propiedad del titular del sitio y está protegido por las leyes de propiedad intelectual aplicables. Los datos de precios y especificaciones provienen de fuentes públicas y tiendas oficiales.",
      },
      {
        heading: "8. Limitación de responsabilidad",
        body: "Clicks & Go se proporciona 'tal cual' y 'según disponibilidad'. No garantizamos que el servicio sea ininterrumpido o libre de errores. No somos responsables por:\n• Diferencias entre el precio mostrado y el precio final en la tienda\n• Daños derivados del uso o imposibilidad de uso del servicio\n• Pérdidas económicas derivadas de decisiones de compra basadas en nuestra información",
      },
      {
        heading: "9. Ley aplicable y jurisdicción",
        body: "Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia será sometida a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, Argentina, con renuncia expresa a cualquier otro fuero.",
      },
      {
        heading: "10. Contacto",
        body: "Para consultas sobre estos Términos de Uso: info@clicksandgo.com",
      },
    ],
  },
  en: {
    title: "Terms of Use",
    updated: "Last updated: June 9, 2026",
    backLabel: "← Back to home",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By accessing or using Clicks & Go, you agree to these Terms of Use. If you disagree, do not use the service. We reserve the right to modify them at any time with prior notice.",
      },
      {
        heading: "2. Service Description",
        body: "Clicks & Go is a laptop price comparison platform. We track prices from official stores and display the best available deal in your region. We are not a store and do not sell products directly.",
      },
      {
        heading: "3. Price Accuracy and Availability",
        body: "Prices are updated automatically and verified before display. However, prices may change between when the information is captured and when you click 'Buy'. Final product availability and sale price are determined solely by the official store.",
      },
      {
        heading: "4. Affiliate Links and Commissions",
        body: "Clicks & Go participates in affiliate programs. When you purchase through our links, we may receive a commission from the store. This does not modify the price you pay or affect the recommendations we make. We display the best deals objectively, regardless of whether they generate a commission.",
      },
      {
        heading: "5. Account Use",
        body: "By creating a Clicks & Go account:\n• You are responsible for maintaining your account security\n• You may not transfer your account to third parties\n• You agree to receive transactional emails related to the service\n• You may request account deletion at any time",
      },
      {
        heading: "6. Prohibited Conduct",
        body: "The following is prohibited:\n• Using the service for unauthorized commercial purposes\n• Attempting mass data extraction (scraping) without authorization\n• Using bots, scrapers, or automated means to access the site\n• Attempting to breach system security",
      },
      {
        heading: "7. Intellectual Property",
        body: "Clicks & Go content (design, code, text, logo) is the property of the site owner and is protected by applicable intellectual property laws. Price and specification data comes from public sources and official stores.",
      },
      {
        heading: "8. Limitation of Liability",
        body: "Clicks & Go is provided 'as is' and 'as available'. We do not guarantee uninterrupted or error-free service. We are not liable for:\n• Differences between the displayed price and the final price at the store\n• Damages from use or inability to use the service\n• Economic losses from purchase decisions based on our information",
      },
      {
        heading: "9. Governing Law and Jurisdiction",
        body: "These terms are governed by the laws of the Republic of Argentina. Any dispute shall be submitted to the ordinary courts of the Autonomous City of Buenos Aires, Argentina.",
      },
      {
        heading: "10. Contact",
        body: "For inquiries about these Terms of Use: info@clicksandgo.com",
      },
    ],
  },
  pt: {
    title: "Termos de Uso",
    updated: "Última atualização: 9 de junho de 2026",
    backLabel: "← Voltar ao início",
    sections: [
      {
        heading: "1. Aceitação dos termos",
        body: "Ao acessar ou usar o Clicks & Go, você concorda com estes Termos de Uso. Se não concordar, não use o serviço. Reservamo-nos o direito de modificá-los a qualquer momento com aviso prévio.",
      },
      {
        heading: "2. Descrição do serviço",
        body: "Clicks & Go é uma plataforma de comparação de preços de laptops. Rastreamos preços de lojas oficiais e exibimos a melhor oferta disponível na sua região. Não somos uma loja e não vendemos produtos diretamente.",
      },
      {
        heading: "3. Precisão de preços e disponibilidade",
        body: "Os preços são atualizados automaticamente e verificados antes de serem exibidos. No entanto, os preços podem mudar entre o momento em que a informação é capturada e quando você clica em 'Comprar'. A disponibilidade final do produto e o preço de venda são determinados exclusivamente pela loja oficial.",
      },
      {
        heading: "4. Links de afiliados e comissões",
        body: "Clicks & Go participa de programas de afiliados. Quando você compra através dos nossos links, podemos receber uma comissão da loja. Isso não altera o preço que você paga nem condiciona as recomendações que fazemos. Exibimos as melhores ofertas objetivamente, independentemente de gerarem comissão.",
      },
      {
        heading: "5. Uso da conta",
        body: "Ao criar uma conta no Clicks & Go:\n• Você é responsável por manter a segurança da sua conta\n• Não pode transferir sua conta para terceiros\n• Concorda em receber emails transacionais relacionados ao serviço\n• Pode solicitar a exclusão da conta a qualquer momento",
      },
      {
        heading: "6. Conduta proibida",
        body: "É proibido:\n• Usar o serviço para fins comerciais não autorizados\n• Tentar extrair dados em massa (scraping) sem autorização\n• Usar bots, scrapers ou meios automatizados para acessar o site\n• Tentar violar a segurança do sistema",
      },
      {
        heading: "7. Propriedade intelectual",
        body: "O conteúdo do Clicks & Go (design, código, textos, logotipo) é propriedade do titular do site e está protegido pelas leis de propriedade intelectual aplicáveis. Os dados de preços e especificações provêm de fontes públicas e lojas oficiais.",
      },
      {
        heading: "8. Limitação de responsabilidade",
        body: "Clicks & Go é fornecido 'como está' e 'conforme disponível'. Não garantimos que o serviço seja ininterrupto ou livre de erros. Não somos responsáveis por:\n• Diferenças entre o preço exibido e o preço final na loja\n• Danos decorrentes do uso ou impossibilidade de uso do serviço\n• Perdas econômicas decorrentes de decisões de compra baseadas em nossas informações",
      },
      {
        heading: "9. Lei aplicável e jurisdição",
        body: "Estes termos são regidos pelas leis da República Argentina. Qualquer controvérsia será submetida aos tribunais ordinários da Cidade Autônoma de Buenos Aires, Argentina.",
      },
      {
        heading: "10. Contato",
        body: "Para dúvidas sobre estes Termos de Uso: info@clicksandgo.com",
      },
    ],
  },
};

export default async function TerminosPage({ params }: Props) {
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
              <FileText size={20} className="text-blue-400" />
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
          <Link href={`/${locale}/privacidad`} className="hover:text-blue-400 transition-colors font-semibold">
            {dict.footer?.privacyLink || "Privacidad"}
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
