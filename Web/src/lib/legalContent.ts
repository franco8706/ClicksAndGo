// =====================================================================
// ⚖️ CONTENIDO LEGAL (Privacidad / Términos / Cookies / Afiliados)
// Requerido para la aprobación en redes de afiliados (Amazon Associates,
// Awin, CJ, Mercado Libre) y cumplimiento FTC / RGPD / LGPD.
// Nota: contenido base de buena fe — ante disputas legales reales,
// debe revisarlo un profesional del derecho de cada jurisdicción.
// =====================================================================

export interface LegalSection {
  h: string;
  p: string[];
}

export interface LegalPage {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

type Locale = "es" | "en" | "pt";
export type LegalSlug = "privacy" | "terms" | "cookies" | "affiliates";

const UPDATED = "2026-07-01";

export const LEGAL_CONTENT: Record<LegalSlug, Record<Locale, LegalPage>> = {
  privacy: {
    es: {
      title: "Política de Privacidad",
      updated: UPDATED,
      intro:
        "En Clicks & Go respetamos tu privacidad. Esta política explica qué datos tratamos, con qué finalidad y cuáles son tus derechos.",
      sections: [
        {
          h: "Qué datos tratamos",
          p: [
            "No requerimos registro ni recopilamos datos personales identificables para usar el sitio.",
            "Procesamos de forma efímera tu dirección IP con el único fin de estimar tu país y mostrarte precios, moneda y noticias de tu región. No almacenamos tu IP en nuestras bases de datos.",
            "Guardamos una cookie técnica (cg_geo) con el código de tu país para recordar tu región entre visitas.",
          ],
        },
        {
          h: "Enlaces de afiliados",
          p: [
            "Al hacer clic en un enlace de compra, las redes de afiliados (Amazon Associates, Awin, CJ, Mercado Libre) pueden instalar sus propias cookies para atribuir la venta. Ese tratamiento se rige por las políticas de privacidad de cada red y tienda.",
          ],
        },
        {
          h: "Tus derechos (RGPD / LGPD)",
          p: [
            "Podés solicitar acceso, rectificación o eliminación de cualquier dato escribiendo a info@clicksandgo.com.",
            "Podés borrar la cookie de región desde la configuración de tu navegador en cualquier momento.",
          ],
        },
        {
          h: "Cambios en esta política",
          p: [
            "Publicaremos aquí cualquier cambio material, actualizando la fecha de revisión al inicio de la página.",
          ],
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      updated: UPDATED,
      intro:
        "At Clicks & Go we respect your privacy. This policy explains what data we process, for what purpose, and your rights.",
      sections: [
        {
          h: "What data we process",
          p: [
            "No sign-up is required and we do not collect personally identifiable data to use the site.",
            "We ephemerally process your IP address for the sole purpose of estimating your country to show regional prices, currency and news. We do not store your IP in our databases.",
            "We store one technical cookie (cg_geo) holding your country code to remember your region across visits.",
          ],
        },
        {
          h: "Affiliate links",
          p: [
            "When you click a buy link, affiliate networks (Amazon Associates, Awin, CJ, Mercado Libre) may set their own cookies to attribute the sale. That processing is governed by each network's and store's privacy policy.",
          ],
        },
        {
          h: "Your rights (GDPR / CCPA)",
          p: [
            "You may request access, rectification or deletion of any data by writing to info@clicksandgo.com.",
            "You can clear the region cookie from your browser settings at any time.",
          ],
        },
        {
          h: "Changes to this policy",
          p: [
            "We will publish any material change here, updating the revision date at the top of the page.",
          ],
        },
      ],
    },
    pt: {
      title: "Política de Privacidade",
      updated: UPDATED,
      intro:
        "No Clicks & Go respeitamos a sua privacidade. Esta política explica quais dados tratamos, com que finalidade e quais são os seus direitos.",
      sections: [
        {
          h: "Quais dados tratamos",
          p: [
            "Não exigimos cadastro nem coletamos dados pessoais identificáveis para usar o site.",
            "Processamos de forma efêmera o seu endereço IP com o único objetivo de estimar o seu país e mostrar preços, moeda e notícias da sua região. Não armazenamos o seu IP em nossos bancos de dados.",
            "Guardamos um cookie técnico (cg_geo) com o código do seu país para lembrar a sua região entre visitas.",
          ],
        },
        {
          h: "Links de afiliados",
          p: [
            "Ao clicar em um link de compra, as redes de afiliados (Amazon Associates, Awin, CJ, Mercado Livre) podem instalar seus próprios cookies para atribuir a venda. Esse tratamento é regido pelas políticas de privacidade de cada rede e loja.",
          ],
        },
        {
          h: "Seus direitos (LGPD)",
          p: [
            "Você pode solicitar acesso, retificação ou exclusão de qualquer dado escrevendo para info@clicksandgo.com.",
            "Você pode apagar o cookie de região nas configurações do seu navegador a qualquer momento.",
          ],
        },
        {
          h: "Alterações nesta política",
          p: [
            "Publicaremos aqui qualquer alteração relevante, atualizando a data de revisão no topo da página.",
          ],
        },
      ],
    },
  },

  terms: {
    es: {
      title: "Términos de Servicio",
      updated: UPDATED,
      intro:
        "Estos términos regulan el uso de Clicks & Go, un comparador de precios de laptops gratuito.",
      sections: [
        {
          h: "Naturaleza del servicio",
          p: [
            "Clicks & Go es un servicio de comparación de precios. No vendemos productos: te derivamos a tiendas oficiales y marketplaces verificados donde se concreta la compra.",
            "Los precios, la disponibilidad y las promociones son responsabilidad de cada tienda y pueden cambiar sin previo aviso. Hacemos el mejor esfuerzo por mantener la información actualizada, pero el precio final válido es siempre el mostrado por la tienda.",
          ],
        },
        {
          h: "Monetización por afiliados",
          p: [
            "Participamos en programas de afiliados. Si comprás a través de nuestros enlaces podemos recibir una comisión, sin costo adicional para vos.",
            "Nuestras puntuaciones y comparaciones se calculan con criterios técnicos (hardware, precio histórico, descuento real) y no dependen del monto de la comisión.",
          ],
        },
        {
          h: "Limitación de responsabilidad",
          p: [
            "No somos parte de la transacción entre vos y la tienda. Las garantías, envíos, devoluciones y reclamos se rigen por los términos de la tienda vendedora.",
          ],
        },
        {
          h: "Propiedad intelectual",
          p: [
            "Las marcas, logos e imágenes de productos pertenecen a sus respectivos dueños y se muestran únicamente con fines informativos de comparación.",
          ],
        },
      ],
    },
    en: {
      title: "Terms of Service",
      updated: UPDATED,
      intro:
        "These terms govern the use of Clicks & Go, a free laptop price-comparison service.",
      sections: [
        {
          h: "Nature of the service",
          p: [
            "Clicks & Go is a price-comparison service. We do not sell products: we refer you to verified official stores and marketplaces where the purchase takes place.",
            "Prices, availability and promotions are the responsibility of each store and may change without notice. We do our best to keep information current, but the valid final price is always the one shown by the store.",
          ],
        },
        {
          h: "Affiliate monetization",
          p: [
            "We participate in affiliate programs. If you buy through our links we may earn a commission, at no extra cost to you.",
            "Our scores and comparisons are computed on technical criteria (hardware, price history, real discount) and do not depend on commission amounts.",
          ],
        },
        {
          h: "Limitation of liability",
          p: [
            "We are not a party to the transaction between you and the store. Warranties, shipping, returns and claims are governed by the selling store's terms.",
          ],
        },
        {
          h: "Intellectual property",
          p: [
            "Product brands, logos and images belong to their respective owners and are displayed solely for comparison purposes.",
          ],
        },
      ],
    },
    pt: {
      title: "Termos de Serviço",
      updated: UPDATED,
      intro:
        "Estes termos regulam o uso do Clicks & Go, um comparador de preços de notebooks gratuito.",
      sections: [
        {
          h: "Natureza do serviço",
          p: [
            "O Clicks & Go é um serviço de comparação de preços. Não vendemos produtos: encaminhamos você para lojas oficiais e marketplaces verificados onde a compra é realizada.",
            "Preços, disponibilidade e promoções são responsabilidade de cada loja e podem mudar sem aviso prévio. Fazemos o possível para manter as informações atualizadas, mas o preço final válido é sempre o exibido pela loja.",
          ],
        },
        {
          h: "Monetização por afiliados",
          p: [
            "Participamos de programas de afiliados. Se você comprar através dos nossos links, podemos receber uma comissão, sem custo adicional para você.",
            "Nossas pontuações e comparações são calculadas com critérios técnicos (hardware, histórico de preços, desconto real) e não dependem do valor da comissão.",
          ],
        },
        {
          h: "Limitação de responsabilidade",
          p: [
            "Não somos parte da transação entre você e a loja. Garantias, envios, devoluções e reclamações são regidos pelos termos da loja vendedora.",
          ],
        },
        {
          h: "Propriedade intelectual",
          p: [
            "As marcas, logos e imagens de produtos pertencem aos seus respectivos donos e são exibidas apenas para fins informativos de comparação.",
          ],
        },
      ],
    },
  },

  cookies: {
    es: {
      title: "Política de Cookies",
      updated: UPDATED,
      intro: "Usamos la cantidad mínima de cookies necesaria para que el sitio funcione.",
      sections: [
        {
          h: "Cookies propias",
          p: [
            "cg_geo (técnica, 30 días): guarda el código de tu país para mostrarte precios y noticias de tu región. No contiene datos personales.",
          ],
        },
        {
          h: "Cookies de terceros",
          p: [
            "Clicks & Go no instala cookies publicitarias ni de tracking propias.",
            "Al hacer clic en un enlace de compra, la red de afiliados de destino (Amazon, Awin, CJ, Mercado Libre) puede instalar cookies de atribución en el sitio de la tienda, según sus propias políticas.",
          ],
        },
        {
          h: "Cómo gestionarlas",
          p: [
            "Podés bloquear o eliminar cookies desde la configuración de tu navegador. El sitio seguirá funcionando; solo perderá la memoria de tu región.",
          ],
        },
      ],
    },
    en: {
      title: "Cookie Policy",
      updated: UPDATED,
      intro: "We use the minimum number of cookies required for the site to work.",
      sections: [
        {
          h: "First-party cookies",
          p: [
            "cg_geo (technical, 30 days): stores your country code to show regional prices and news. It contains no personal data.",
          ],
        },
        {
          h: "Third-party cookies",
          p: [
            "Clicks & Go does not set its own advertising or tracking cookies.",
            "When you click a buy link, the destination affiliate network (Amazon, Awin, CJ, Mercado Libre) may set attribution cookies on the store's site, under their own policies.",
          ],
        },
        {
          h: "How to manage them",
          p: [
            "You can block or delete cookies from your browser settings. The site will keep working; it will simply forget your region.",
          ],
        },
      ],
    },
    pt: {
      title: "Política de Cookies",
      updated: UPDATED,
      intro: "Usamos a quantidade mínima de cookies necessária para o site funcionar.",
      sections: [
        {
          h: "Cookies próprios",
          p: [
            "cg_geo (técnico, 30 dias): guarda o código do seu país para mostrar preços e notícias da sua região. Não contém dados pessoais.",
          ],
        },
        {
          h: "Cookies de terceiros",
          p: [
            "O Clicks & Go não instala cookies publicitários nem de rastreamento próprios.",
            "Ao clicar em um link de compra, a rede de afiliados de destino (Amazon, Awin, CJ, Mercado Livre) pode instalar cookies de atribuição no site da loja, conforme suas próprias políticas.",
          ],
        },
        {
          h: "Como gerenciá-los",
          p: [
            "Você pode bloquear ou excluir cookies nas configurações do seu navegador. O site continuará funcionando; apenas esquecerá a sua região.",
          ],
        },
      ],
    },
  },

  affiliates: {
    es: {
      title: "Divulgación de Afiliados",
      updated: UPDATED,
      intro:
        "Transparencia total: así se financia Clicks & Go para que el servicio sea siempre gratuito.",
      sections: [
        {
          h: "Cómo ganamos dinero",
          p: [
            "Participamos en los programas de afiliados de Amazon Associates, Awin, CJ Affiliate y Mercado Libre, además de programas directos de marcas como HP, Dell, Lenovo y Asus.",
            "Cuando comprás a través de un enlace marcado como compra, la tienda puede pagarnos una comisión. Vos pagás exactamente el mismo precio.",
          ],
        },
        {
          h: "Independencia editorial",
          p: [
            "Las puntuaciones (deal score), comparaciones y el orden del catálogo se calculan con criterios técnicos: hardware, historial de precios y descuento real. El monto de la comisión no participa en ese cálculo.",
          ],
        },
        {
          h: "Aviso requerido por Amazon",
          p: [
            "En calidad de Afiliados de Amazon, obtenemos ingresos por las compras adscritas que cumplen los requisitos aplicables.",
          ],
        },
      ],
    },
    en: {
      title: "Affiliate Disclosure",
      updated: UPDATED,
      intro:
        "Full transparency: this is how Clicks & Go is funded so the service stays free.",
      sections: [
        {
          h: "How we make money",
          p: [
            "We participate in the affiliate programs of Amazon Associates, Awin, CJ Affiliate and Mercado Libre, plus direct brand programs such as HP, Dell, Lenovo and Asus.",
            "When you buy through a purchase link, the store may pay us a commission. You pay exactly the same price.",
          ],
        },
        {
          h: "Editorial independence",
          p: [
            "Scores (deal score), comparisons and catalog ordering are computed on technical criteria: hardware, price history and real discount. Commission amounts play no part in that calculation.",
          ],
        },
        {
          h: "Amazon required notice",
          p: [
            "As an Amazon Associate we earn from qualifying purchases.",
          ],
        },
      ],
    },
    pt: {
      title: "Divulgação de Afiliados",
      updated: UPDATED,
      intro:
        "Transparência total: é assim que o Clicks & Go se financia para que o serviço seja sempre gratuito.",
      sections: [
        {
          h: "Como ganhamos dinheiro",
          p: [
            "Participamos dos programas de afiliados da Amazon Associates, Awin, CJ Affiliate e Mercado Livre, além de programas diretos de marcas como HP, Dell, Lenovo e Asus.",
            "Quando você compra através de um link de compra, a loja pode nos pagar uma comissão. Você paga exatamente o mesmo preço.",
          ],
        },
        {
          h: "Independência editorial",
          p: [
            "As pontuações (deal score), comparações e a ordem do catálogo são calculadas com critérios técnicos: hardware, histórico de preços e desconto real. O valor da comissão não participa desse cálculo.",
          ],
        },
        {
          h: "Aviso exigido pela Amazon",
          p: [
            "Como Associados da Amazon, ganhamos com compras qualificadas.",
          ],
        },
      ],
    },
  },
};

export function getLegalPage(slug: string, locale: string): LegalPage | null {
  const page = LEGAL_CONTENT[slug as LegalSlug];
  if (!page) return null;
  const loc: Locale = locale === "en" ? "en" : locale === "pt" ? "pt" : "es";
  return page[loc];
}

export const LEGAL_SLUGS: LegalSlug[] = ["privacy", "terms", "cookies", "affiliates"];
