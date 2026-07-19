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

// ─────────────────────────────────────────────────────────────────────────────
// Política de alcance MUNDIAL: la plataforma opera globalmente. No se redacta
// "bajo la ley de un país" — se reconocen los regímenes de cada región donde
// el usuario reside (GDPR/UK GDPR, CCPA/CPRA, LGPD, Ley 25.326, PIPEDA, etc.)
// y se aplica el que corresponda a cada persona.
// ─────────────────────────────────────────────────────────────────────────────
const CONTENT: Record<string, {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
  backLabel: string;
}> = {
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 19 de julio de 2026",
    backLabel: "← Volver al inicio",
    sections: [
      {
        heading: "1. Alcance mundial y responsable del tratamiento",
        body: "Clicks & Go es una plataforma de comparación de precios de productos de tecnología que opera a nivel mundial. Esta política se aplica a todas las personas que usan el servicio, en cualquier país.\n\nEl responsable del tratamiento de los datos personales es el operador de Clicks & Go. Contacto para cualquier consulta de privacidad: info@clicksandgo.com.\n\nSegún su lugar de residencia, le protegen además normas locales como el GDPR (Unión Europea) y UK GDPR (Reino Unido), la CCPA/CPRA (California, EE. UU.), la LGPD (Brasil), la Ley 25.326 (Argentina), la PIPEDA (Canadá) u otras equivalentes. Nada en esta política limita los derechos que esas normas le reconocen.",
      },
      {
        heading: "2. Datos que recopilamos",
        body: "Recopilamos únicamente lo necesario para operar el servicio:\n\nSi crea una cuenta:\n• Email (obligatorio: es su identificador de cuenta)\n• Nombre y foto de perfil (si los comparte su proveedor de acceso — Google, Microsoft o Facebook)\n• Teléfono y ciudad (opcionales, si los completa en su panel)\n• Idioma preferido y país preferido para el catálogo\n• Sus favoritos y alertas de precio\n\nDe forma automática durante la visita:\n• País aproximado, derivado de su dirección IP. La IP se usa solo en tránsito para esta derivación y NO se almacena. Lo único que se persiste es el código de país (ej. \"ES\"), para mostrarle catálogo, moneda y ofertas de su región.\n• Cookie de sesión (solo si inicia sesión).\n\nNO recopilamos: dirección postal, datos de pago o tarjetas (las compras ocurren en las tiendas, nunca en Clicks & Go), datos biométricos, ni categorías sensibles de información (salud, religión, orientación, afiliación política o sindical).",
      },
      {
        heading: "3. Para qué usamos los datos (finalidades y bases legales)",
        body: "• Autenticar su sesión y mantener su cuenta — base legal: ejecución del contrato de servicio.\n• Mostrar catálogo, moneda y ofertas de su región — base legal: interés legítimo en ofrecer un servicio relevante.\n• Enviar la alerta de precio que usted mismo configuró — base legal: ejecución del servicio solicitado.\n• Enviarle un enlace de acceso (magic link) cuando lo pide — base legal: ejecución del servicio.\n• Seguridad, prevención de fraude y abuso — base legal: interés legítimo.\n\nNO usamos sus datos para: venderlos o alquilarlos a terceros, publicidad personalizada de terceros, ni decisiones automatizadas con efectos jurídicos sobre usted. Las puntuaciones que ve en el sitio (deal score) evalúan productos, nunca personas.",
      },
      {
        heading: "4. Acceso con Google, Microsoft o Facebook (OAuth)",
        body: "Si elige iniciar sesión con Google, Microsoft o Facebook, ese proveedor nos transmite su identificador de cuenta, su email y —según el proveedor— su nombre y foto de perfil, conforme a la política de privacidad del propio proveedor. Solo almacenamos esos datos mínimos. No obtenemos acceso a sus contactos, archivos, publicaciones ni a ningún otro contenido de esas cuentas. Puede revocar el acceso en cualquier momento desde la configuración de seguridad de su proveedor.",
      },
      {
        heading: "5. Enlaces de afiliados",
        body: "Clicks & Go participa en programas de afiliación (por ejemplo Amazon Associates, Awin, CJ Affiliate, MercadoLibre). Al hacer clic en \"Comprar\" usted es redirigido a la tienda oficial a través de nuestra pasarela /out. En esa redirección NO transferimos sus datos personales a la tienda: la tienda solo recibe la visita, como si hubiera llegado por cualquier enlace. Podemos recibir una comisión si completa una compra, sin costo adicional para usted. La relación de compraventa (pago, envío, garantía, devoluciones) es exclusivamente entre usted y la tienda.",
      },
      {
        heading: "6. Cookies y tecnologías similares",
        body: "Usamos únicamente cookies estrictamente necesarias:\n• Cookie de sesión (NextAuth) — mantiene su sesión iniciada. Caduca a los 30 días o al cerrar sesión.\n• Cookie de preferencia de tema/idioma, si aplica.\n\nNO usamos cookies publicitarias, de rastreo entre sitios ni píxeles de terceros. Por eso no mostramos un banner de consentimiento de cookies: las esenciales están exentas de consentimiento en la mayoría de las legislaciones. Si esto cambiara alguna vez, pediremos consentimiento previo donde la ley lo exija.",
      },
      {
        heading: "7. Con quién compartimos datos (encargados del tratamiento)",
        body: "No vendemos ni cedemos sus datos. Para operar usamos proveedores que procesan datos por cuenta nuestra, bajo sus propios compromisos de protección:\n• Google Cloud Platform (EE. UU.) — alojamiento de la plataforma y base de datos cifrada.\n• Resend — envío de emails transaccionales (enlaces de acceso y alertas de precio).\n• Google, Microsoft y Facebook — solo si usted elige iniciar sesión con ellos.\n\nLa telemetría técnica interna del sistema (métricas de agentes y logs de operación) no contiene sus datos personales.\n\nPodemos divulgar datos si una ley u orden judicial válida lo exige, limitándonos al mínimo requerido.",
      },
      {
        heading: "8. Transferencias internacionales",
        body: "Nuestros servidores están operados por Google Cloud Platform en Estados Unidos. Si usted reside fuera de EE. UU., sus datos se transfieren a ese país para poder prestar el servicio. Estas transferencias se amparan en los mecanismos de legalidad que correspondan a su región (por ejemplo, Cláusulas Contractuales Tipo y el marco de privacidad de datos UE–EE. UU. del que Google es participante).",
      },
      {
        heading: "9. Seguridad",
        body: "• Cifrado en tránsito (TLS/HTTPS) en todo el sitio y cifrado en reposo en la base de datos.\n• Sin contraseñas: el acceso es por proveedores OAuth o enlaces de un solo uso al email, lo que elimina el riesgo de robo de contraseñas.\n• Acceso interno a los datos limitado por el principio de mínimo privilegio y claves gestionadas en un gestor de secretos.\n• Arquitectura de confianza cero entre los componentes internos del sistema.\n\nNingún sistema es infalible: si detectáramos una brecha de seguridad que afecte sus datos, se lo notificaremos según los plazos de la ley aplicable a su región.",
      },
      {
        heading: "10. Retención de datos",
        body: "• Datos de cuenta: mientras la cuenta esté activa.\n• Si solicita eliminar la cuenta: borramos sus datos personales en un máximo de 30 días, salvo lo que la ley nos obligue a conservar (y solo durante ese plazo legal).\n• Sesiones caducan automáticamente a los 30 días.\n• El código de país derivado por visita no está vinculado a su identidad si usted no tiene cuenta.",
      },
      {
        heading: "11. Sus derechos (todas las regiones)",
        body: "Sea cual sea su país, le reconocemos como mínimo estos derechos sobre sus datos:\n• Acceso: saber qué datos tenemos sobre usted y obtener copia.\n• Rectificación: corregir datos inexactos.\n• Supresión: eliminar su cuenta y sus datos (\"derecho al olvido\").\n• Portabilidad: recibir sus datos en formato estructurado de uso común.\n• Oposición y limitación del tratamiento, cuando aplique.\n• Retirar el consentimiento en cualquier momento, sin afectar la licitud previa.\n• No recibir discriminación por ejercer estos derechos (CCPA).\n\nAdemás: no vendemos ni \"compartimos\" datos personales en el sentido de la CCPA/CPRA, por lo que no existe nada de lo que \"optar por no vender\".\n\nPara ejercerlos: escriba a info@clicksandgo.com desde el email de su cuenta. Respondemos dentro de los 30 días (o el plazo menor que exija su legislación). También tiene derecho a reclamar ante la autoridad de protección de datos de su país (por ejemplo: su Autoridad de Control en la UE, el ICO en Reino Unido, la ANPD en Brasil, la AAIP en Argentina).",
      },
      {
        heading: "12. Menores de edad",
        body: "Clicks & Go no está dirigido a menores de 16 años y no recopilamos conscientemente datos de menores. Si un padre, madre o tutor detecta que un menor creó una cuenta, escríbanos a info@clicksandgo.com y la eliminaremos de inmediato.",
      },
      {
        heading: "13. Señales \"Do Not Track\" y GPC",
        body: "Como no rastreamos usuarios entre sitios ni vendemos datos, el efecto de las señales Do Not Track o Global Privacy Control ya está garantizado por defecto para todos los visitantes.",
      },
      {
        heading: "14. Cambios en esta política",
        body: "Podemos actualizar esta política. Si el cambio es significativo, lo notificaremos por email (si tiene cuenta) o con un aviso destacado en el sitio, con antelación razonable. La fecha de \"última actualización\" al inicio siempre refleja la versión vigente. El uso del servicio tras la entrada en vigor de los cambios implica su aceptación, sin perjuicio de los derechos que no puedan renunciarse según su ley local.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: July 19, 2026",
    backLabel: "← Back to home",
    sections: [
      {
        heading: "1. Worldwide scope and data controller",
        body: "Clicks & Go is a technology price-comparison platform operating worldwide. This policy applies to everyone who uses the service, in any country.\n\nThe data controller is the operator of Clicks & Go. Privacy contact: info@clicksandgo.com.\n\nDepending on where you live, you are additionally protected by local frameworks such as the GDPR (European Union) and UK GDPR, the CCPA/CPRA (California, USA), the LGPD (Brazil), Law 25.326 (Argentina), PIPEDA (Canada) or equivalent laws. Nothing in this policy limits the rights those laws grant you.",
      },
      {
        heading: "2. Data we collect",
        body: "We collect only what is needed to run the service:\n\nIf you create an account:\n• Email (required: it is your account identifier)\n• Name and profile picture (if your sign-in provider — Google, Microsoft or Facebook — shares them)\n• Phone and city (optional, if you fill them in your dashboard)\n• Preferred language and preferred catalog country\n• Your favorites and price alerts\n\nAutomatically during a visit:\n• Approximate country, derived from your IP address. The IP is used in transit only for this derivation and is NOT stored. Only the country code (e.g. \"US\") is persisted, to show you your region's catalog, currency and deals.\n• Session cookie (only if you sign in).\n\nWe do NOT collect: postal address, payment or card data (purchases happen at the stores, never on Clicks & Go), biometric data, or sensitive categories of information (health, religion, orientation, political or union affiliation).",
      },
      {
        heading: "3. How we use data (purposes and legal bases)",
        body: "• Authenticate your session and maintain your account — legal basis: performance of the service contract.\n• Show your region's catalog, currency and deals — legal basis: legitimate interest in a relevant service.\n• Send the price alert you yourself configured — legal basis: performance of the requested service.\n• Send you a sign-in magic link when you request it — legal basis: performance of the service.\n• Security, fraud and abuse prevention — legal basis: legitimate interest.\n\nWe do NOT use your data for: selling or renting it to third parties, third-party personalized advertising, or automated decisions with legal effects on you. The scores you see on the site (deal score) rate products, never people.",
      },
      {
        heading: "4. Signing in with Google, Microsoft or Facebook (OAuth)",
        body: "If you choose to sign in with Google, Microsoft or Facebook, that provider transmits to us your account identifier, your email and — depending on the provider — your name and profile picture, under the provider's own privacy policy. We store only that minimal data. We get no access to your contacts, files, posts or any other content of those accounts. You can revoke access at any time from your provider's security settings.",
      },
      {
        heading: "5. Affiliate links",
        body: "Clicks & Go participates in affiliate programs (e.g. Amazon Associates, Awin, CJ Affiliate, MercadoLibre). When you click \"Buy\" you are redirected to the official store through our /out gateway. That redirect does NOT transfer your personal data to the store: the store simply receives the visit, as with any link. We may earn a commission if you complete a purchase, at no extra cost to you. The purchase relationship (payment, shipping, warranty, returns) is exclusively between you and the store.",
      },
      {
        heading: "6. Cookies and similar technologies",
        body: "We use strictly necessary cookies only:\n• Session cookie (NextAuth) — keeps you signed in. Expires after 30 days or on sign-out.\n• Theme/language preference cookie, where applicable.\n\nWe do NOT use advertising cookies, cross-site tracking or third-party pixels. That is why we show no cookie-consent banner: essential cookies are exempt from consent in most jurisdictions. If this ever changes, we will request prior consent where the law requires it.",
      },
      {
        heading: "7. Who we share data with (processors)",
        body: "We do not sell or trade your data. To operate we use providers that process data on our behalf under their own protection commitments:\n• Google Cloud Platform (USA) — platform hosting and encrypted database.\n• Resend — transactional email delivery (sign-in links and price alerts).\n• Google, Microsoft and Facebook — only if you choose to sign in with them.\n\nThe system's internal technical telemetry (agent metrics and operational logs) contains no personal data of yours.\n\nWe may disclose data if a valid law or court order requires it, limited to the minimum required.",
      },
      {
        heading: "8. International transfers",
        body: "Our servers are operated by Google Cloud Platform in the United States. If you live outside the USA, your data is transferred there to provide the service. These transfers rely on the lawful mechanisms applicable to your region (for example, Standard Contractual Clauses and the EU–US Data Privacy Framework, of which Google is a participant).",
      },
      {
        heading: "9. Security",
        body: "• Encryption in transit (TLS/HTTPS) across the whole site and encryption at rest in the database.\n• No passwords: access is via OAuth providers or single-use email links, eliminating password-theft risk.\n• Internal access to data limited by least privilege, with keys managed in a secrets manager.\n• Zero-trust architecture between the system's internal components.\n\nNo system is infallible: if we detect a security breach affecting your data, we will notify you within the timeframes of the law applicable to your region.",
      },
      {
        heading: "10. Data retention",
        body: "• Account data: for as long as the account is active.\n• If you request account deletion: we erase your personal data within at most 30 days, except what the law obliges us to keep (and only for that legal period).\n• Sessions expire automatically after 30 days.\n• The per-visit derived country code is not linked to your identity if you have no account.",
      },
      {
        heading: "11. Your rights (all regions)",
        body: "Wherever you live, we grant you at minimum these rights over your data:\n• Access: know what data we hold about you and get a copy.\n• Rectification: correct inaccurate data.\n• Erasure: delete your account and data (\"right to be forgotten\").\n• Portability: receive your data in a structured, commonly used format.\n• Objection and restriction of processing, where applicable.\n• Withdraw consent at any time, without affecting prior lawfulness.\n• No discrimination for exercising these rights (CCPA).\n\nAlso: we do not sell or \"share\" personal data within the meaning of the CCPA/CPRA, so there is nothing to opt out of.\n\nTo exercise them: write to info@clicksandgo.com from your account email. We respond within 30 days (or any shorter period your law requires). You may also complain to your country's data protection authority (e.g. your EU Supervisory Authority, the ICO in the UK, the ANPD in Brazil, the AAIP in Argentina).",
      },
      {
        heading: "12. Children",
        body: "Clicks & Go is not directed at children under 16 and we do not knowingly collect data from minors. If a parent or guardian finds that a minor created an account, write to info@clicksandgo.com and we will delete it immediately.",
      },
      {
        heading: "13. \"Do Not Track\" and GPC signals",
        body: "Since we do not track users across sites nor sell data, the effect of Do Not Track or Global Privacy Control signals is already guaranteed by default for all visitors.",
      },
      {
        heading: "14. Changes to this policy",
        body: "We may update this policy. For significant changes we will notify you by email (if you have an account) or with a prominent notice on the site, with reasonable advance. The \"last updated\" date at the top always reflects the current version. Using the service after changes take effect implies acceptance, without prejudice to rights that cannot be waived under your local law.",
      },
    ],
  },
  pt: {
    title: "Política de Privacidade",
    updated: "Última atualização: 19 de julho de 2026",
    backLabel: "← Voltar ao início",
    sections: [
      {
        heading: "1. Alcance mundial e responsável pelo tratamento",
        body: "O Clicks & Go é uma plataforma de comparação de preços de tecnologia que opera mundialmente. Esta política se aplica a todas as pessoas que usam o serviço, em qualquer país.\n\nO responsável pelo tratamento dos dados pessoais é o operador do Clicks & Go. Contato de privacidade: info@clicksandgo.com.\n\nConforme o seu país de residência, você também é protegido por normas locais como o GDPR (União Europeia) e UK GDPR, a CCPA/CPRA (Califórnia, EUA), a LGPD (Brasil), a Lei 25.326 (Argentina), a PIPEDA (Canadá) ou equivalentes. Nada nesta política limita os direitos que essas normas garantem a você.",
      },
      {
        heading: "2. Dados que coletamos",
        body: "Coletamos apenas o necessário para operar o serviço:\n\nSe você criar uma conta:\n• Email (obrigatório: é seu identificador de conta)\n• Nome e foto de perfil (se o seu provedor de acesso — Google, Microsoft ou Facebook — os compartilhar)\n• Telefone e cidade (opcionais, se você preenchê-los no seu painel)\n• Idioma preferido e país preferido do catálogo\n• Seus favoritos e alertas de preço\n\nAutomaticamente durante a visita:\n• País aproximado, derivado do seu endereço IP. O IP é usado apenas em trânsito para essa derivação e NÃO é armazenado. Persistimos somente o código do país (ex. \"BR\"), para mostrar catálogo, moeda e ofertas da sua região.\n• Cookie de sessão (somente se você fizer login).\n\nNÃO coletamos: endereço postal, dados de pagamento ou cartões (as compras acontecem nas lojas, nunca no Clicks & Go), dados biométricos, nem categorias sensíveis de informação (saúde, religião, orientação, filiação política ou sindical).",
      },
      {
        heading: "3. Para que usamos os dados (finalidades e bases legais)",
        body: "• Autenticar sua sessão e manter sua conta — base legal: execução do contrato de serviço.\n• Mostrar catálogo, moeda e ofertas da sua região — base legal: legítimo interesse em oferecer um serviço relevante.\n• Enviar o alerta de preço que você mesmo configurou — base legal: execução do serviço solicitado.\n• Enviar um link de acesso (magic link) quando você pedir — base legal: execução do serviço.\n• Segurança e prevenção de fraude e abuso — base legal: legítimo interesse.\n\nNÃO usamos seus dados para: vendê-los ou alugá-los a terceiros, publicidade personalizada de terceiros, nem decisões automatizadas com efeitos jurídicos sobre você. As pontuações do site (deal score) avaliam produtos, nunca pessoas.",
      },
      {
        heading: "4. Login com Google, Microsoft ou Facebook (OAuth)",
        body: "Se você optar por entrar com Google, Microsoft ou Facebook, esse provedor nos transmite seu identificador de conta, seu email e — conforme o provedor — seu nome e foto de perfil, de acordo com a política de privacidade do próprio provedor. Armazenamos apenas esses dados mínimos. Não temos acesso aos seus contatos, arquivos, publicações nem a nenhum outro conteúdo dessas contas. Você pode revogar o acesso a qualquer momento nas configurações de segurança do seu provedor.",
      },
      {
        heading: "5. Links de afiliados",
        body: "O Clicks & Go participa de programas de afiliados (ex. Amazon Associates, Awin, CJ Affiliate, MercadoLibre). Ao clicar em \"Comprar\", você é redirecionado à loja oficial pelo nosso gateway /out. Esse redirecionamento NÃO transfere seus dados pessoais à loja: a loja apenas recebe a visita, como em qualquer link. Podemos receber uma comissão se você concluir uma compra, sem custo adicional para você. A relação de compra (pagamento, envio, garantia, devoluções) é exclusivamente entre você e a loja.",
      },
      {
        heading: "6. Cookies e tecnologias semelhantes",
        body: "Usamos apenas cookies estritamente necessários:\n• Cookie de sessão (NextAuth) — mantém você conectado. Expira em 30 dias ou ao sair.\n• Cookie de preferência de tema/idioma, quando aplicável.\n\nNÃO usamos cookies publicitários, rastreamento entre sites nem pixels de terceiros. Por isso não exibimos banner de consentimento de cookies: os essenciais são isentos de consentimento na maioria das legislações. Se isso mudar algum dia, pediremos consentimento prévio onde a lei exigir.",
      },
      {
        heading: "7. Com quem compartilhamos dados (operadores)",
        body: "Não vendemos nem cedemos seus dados. Para operar, usamos fornecedores que processam dados por nossa conta, sob seus próprios compromissos de proteção:\n• Google Cloud Platform (EUA) — hospedagem da plataforma e banco de dados criptografado.\n• Resend — envio de emails transacionais (links de acesso e alertas de preço).\n• Google, Microsoft e Facebook — somente se você optar por entrar com eles.\n\nA telemetria técnica interna do sistema (métricas de agentes e logs de operação) não contém seus dados pessoais.\n\nPodemos divulgar dados se uma lei ou ordem judicial válida exigir, limitando-nos ao mínimo necessário.",
      },
      {
        heading: "8. Transferências internacionais",
        body: "Nossos servidores são operados pelo Google Cloud Platform nos Estados Unidos. Se você reside fora dos EUA, seus dados são transferidos para lá para a prestação do serviço. Essas transferências se apoiam nos mecanismos legais aplicáveis à sua região (por exemplo, Cláusulas Contratuais Padrão e o EU–US Data Privacy Framework, do qual o Google participa).",
      },
      {
        heading: "9. Segurança",
        body: "• Criptografia em trânsito (TLS/HTTPS) em todo o site e criptografia em repouso no banco de dados.\n• Sem senhas: o acesso é por provedores OAuth ou links de uso único no email, eliminando o risco de roubo de senhas.\n• Acesso interno aos dados limitado pelo princípio do menor privilégio, com chaves em um gerenciador de segredos.\n• Arquitetura de confiança zero entre os componentes internos do sistema.\n\nNenhum sistema é infalível: se detectarmos uma violação de segurança que afete seus dados, notificaremos você nos prazos da lei aplicável à sua região.",
      },
      {
        heading: "10. Retenção de dados",
        body: "• Dados de conta: enquanto a conta estiver ativa.\n• Se você solicitar a exclusão da conta: apagamos seus dados pessoais em até 30 dias, exceto o que a lei nos obrigar a manter (e somente por esse prazo legal).\n• Sessões expiram automaticamente em 30 dias.\n• O código de país derivado por visita não é vinculado à sua identidade se você não tiver conta.",
      },
      {
        heading: "11. Seus direitos (todas as regiões)",
        body: "Onde quer que você more, garantimos no mínimo estes direitos sobre seus dados:\n• Acesso: saber quais dados temos sobre você e obter cópia.\n• Retificação: corrigir dados imprecisos.\n• Exclusão: eliminar sua conta e seus dados (\"direito ao esquecimento\").\n• Portabilidade: receber seus dados em formato estruturado de uso comum.\n• Oposição e limitação do tratamento, quando aplicável.\n• Retirar o consentimento a qualquer momento, sem afetar a licitude anterior.\n• Não sofrer discriminação por exercer esses direitos (CCPA).\n\nAlém disso: não vendemos nem \"compartilhamos\" dados pessoais no sentido da CCPA/CPRA — não há nada de que \"optar por sair\".\n\nPara exercê-los: escreva para info@clicksandgo.com a partir do email da sua conta. Respondemos em até 30 dias (ou no prazo menor que a sua lei exigir). Você também pode reclamar à autoridade de proteção de dados do seu país (ex.: sua Autoridade de Controle na UE, o ICO no Reino Unido, a ANPD no Brasil, a AAIP na Argentina).",
      },
      {
        heading: "12. Menores de idade",
        body: "O Clicks & Go não é direcionado a menores de 16 anos e não coletamos conscientemente dados de menores. Se um responsável identificar que um menor criou uma conta, escreva para info@clicksandgo.com e a excluiremos imediatamente.",
      },
      {
        heading: "13. Sinais \"Do Not Track\" e GPC",
        body: "Como não rastreamos usuários entre sites nem vendemos dados, o efeito dos sinais Do Not Track ou Global Privacy Control já está garantido por padrão para todos os visitantes.",
      },
      {
        heading: "14. Alterações nesta política",
        body: "Podemos atualizar esta política. Para mudanças significativas, notificaremos por email (se você tiver conta) ou com um aviso em destaque no site, com antecedência razoável. A data de \"última atualização\" no topo sempre reflete a versão vigente. O uso do serviço após a vigência das mudanças implica aceitação, sem prejuízo dos direitos irrenunciáveis segundo a sua lei local.",
      },
    ],
  },
};

export default async function PrivacidadPage({ params }: Props) {
  const { locale } = await params;
  const content = CONTENT[locale] ?? CONTENT.es;
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : esDict;

  return (
    <div className="min-h-screen bg-white pt-32 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-10">
          <Link
            href={`/${locale}`}
            className="text-xs text-[#9aa1ac] hover:text-blue-600 transition-colors font-semibold uppercase tracking-widest mb-6 inline-block"
          >
            {content.backLabel}
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-blue-600" />
            </div>
            <h1
              className="text-5xl font-bold text-[#0a0e14]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
            >
              {content.title}
            </h1>
          </div>
          <p className="text-[#9aa1ac] text-sm">{content.updated}</p>
        </div>

        {/* Contenido */}
        <div className="space-y-8">
          {content.sections.map((section) => (
            <div key={section.heading} className="bg-[#f5f6f8] border border-[#e6e8ec] rounded-2xl p-6">
              <h2
                className="text-lg font-bold text-[#0a0e14] mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {section.heading}
              </h2>
              <p className="text-[#414855] text-sm leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-[#e6e8ec] flex flex-wrap gap-4 text-xs text-[#9aa1ac]">
          <Link href={`/${locale}/terminos`} className="hover:text-blue-600 transition-colors font-semibold">
            {dict.footer?.termsLink || "Términos"}
          </Link>
          <Link href={`/${locale}`} className="hover:text-blue-600 transition-colors font-semibold">
            Clicks & Go
          </Link>
        </div>

      </div>
    </div>
  );
}
