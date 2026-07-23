import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import esDict from "@/dictionaries/es.json";
import enDict from "@/dictionaries/en.json";
import ptDict from "@/dictionaries/pt.json";
import itDict from "@/dictionaries/it.json";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    es: "Términos y Condiciones | Clicks & Go",
    en: "Terms & Conditions | Clicks & Go",
    pt: "Termos e Condições | Clicks & Go",
    it: "Termini e Condizioni | Clicks & Go",
  };
  return { title: titles[locale] ?? titles.es };
}

// ─────────────────────────────────────────────────────────────────────────────
// Términos de alcance MUNDIAL: la plataforma opera globalmente. Los derechos
// irrenunciables del consumidor de cada país prevalecen siempre sobre lo aquí
// pactado — estos términos no los limitan.
// ─────────────────────────────────────────────────────────────────────────────
const CONTENT: Record<string, {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
  backLabel: string;
}> = {
  es: {
    title: "Términos y Condiciones",
    updated: "Última actualización: 19 de julio de 2026",
    backLabel: "← Volver al inicio",
    sections: [
      {
        heading: "1. Quiénes somos y aceptación",
        body: "Clicks & Go es una plataforma de comparación de precios de productos de tecnología (laptops, monitores, periféricos, impresoras y otros) que opera a nivel mundial. Al acceder o usar el sitio usted acepta estos Términos. Si no está de acuerdo, no use el servicio.\n\nEstos Términos no limitan ni sustituyen los derechos irrenunciables que le reconozca la legislación de consumo de su país de residencia: ante cualquier conflicto, esos derechos prevalecen.",
      },
      {
        heading: "2. Qué hacemos (y qué no)",
        body: "Clicks & Go compara precios y ofertas publicadas por tiendas y marketplaces de terceros, y enlaza hacia ellos.\n\nQué NO somos:\n• No somos una tienda: no vendemos productos, no procesamos pagos, no gestionamos envíos.\n• No somos parte de su contrato de compra: cuando compra, el contrato es entre usted y la tienda de destino.\n• No somos representantes ni agentes de las tiendas o marcas listadas.",
      },
      {
        heading: "3. Enlaces de afiliados (divulgación)",
        body: "Participamos en programas de afiliación (por ejemplo Amazon Associates, Awin, CJ Affiliate, MercadoLibre). Cuando usted hace clic en \"Comprar\" y completa una compra en la tienda de destino, podemos recibir una comisión, sin costo adicional para usted.\n\nCompromisos:\n• La comisión no altera el precio que usted paga.\n• La existencia o el monto de una comisión no altera las puntuaciones (deal score) ni el orden de los resultados, que se calculan con criterios técnicos de precio y características del producto.\n• Cada botón de compra está acompañado de un aviso de enlace de afiliado.\n\nComo participante del programa de Amazon Associates, Clicks & Go puede percibir ingresos por las compras que cumplan los requisitos del programa.",
      },
      {
        heading: "4. Precios, disponibilidad y exactitud",
        body: "Los precios, descuentos, disponibilidad y características que mostramos provienen de las tiendas y pueden cambiar sin previo aviso. Hacemos un esfuerzo continuo y automatizado por mantener la información actualizada, pero:\n• El precio final y las condiciones válidas son SIEMPRE los que muestre la tienda al momento de la compra.\n• Un error de precio, conversión de moneda o disponibilidad en Clicks & Go no genera derecho a exigir ese precio.\n• Las conversiones de moneda son estimaciones informativas basadas en tipos de cambio de referencia.\n\nSi detecta un error, agradecemos el aviso a info@clicks-and-go.com.",
      },
      {
        heading: "5. Cuenta de usuario",
        body: "Puede navegar sin cuenta. Para usar favoritos y alertas de precio necesita crear una cuenta con Google, Microsoft, Facebook o mediante enlace de acceso por email.\n\nUsted se compromete a:\n• Proporcionar información veraz y mantenerla actualizada.\n• No crear cuentas para terceros sin su autorización, ni cuentas automatizadas.\n• Mantener el control de su email y de sus proveedores de acceso: toda actividad realizada desde su sesión se considera suya.\n\nPuede eliminar su cuenta en cualquier momento desde su panel o escribiendo a info@clicks-and-go.com (ver Política de Privacidad para plazos de borrado).",
      },
      {
        heading: "6. Alertas de precio y comunicaciones",
        body: "Las alertas de precio son un servicio opcional que usted configura: le enviamos un email cuando un producto alcanza el precio objetivo que definió. No son comunicaciones publicitarias de terceros. Puede desactivarlas en cualquier momento desde su panel. La entrega de un email de alerta depende de servicios de terceros y no garantizamos que el precio siga vigente al momento de leerla.",
      },
      {
        heading: "7. Uso aceptable",
        body: "Se compromete a NO:\n• Realizar scraping masivo, ingeniería inversa o acceso automatizado no autorizado al sitio o sus APIs.\n• Interferir con la operación del servicio (sobrecarga deliberada, elusión de límites, inyección de código).\n• Usar el servicio para actividades ilícitas o para generar fraude de afiliación (clics o compras artificiales).\n• Revender, sublicenciar o explotar comercialmente el contenido del sitio sin autorización escrita.\n\nPodemos suspender o cerrar cuentas que violen estas reglas, notificándole el motivo salvo impedimento legal.",
      },
      {
        heading: "8. Propiedad intelectual",
        body: "El sitio, su diseño, su software, sus textos propios y sus puntuaciones son propiedad de Clicks & Go o de sus licenciantes.\n\nLas marcas, logotipos, nombres de productos e imágenes de fabricantes y tiendas pertenecen a sus respectivos titulares; se usan con fines identificativos y de comparación, sin implicar patrocinio ni afiliación societaria con Clicks & Go.\n\nUsted puede compartir enlaces al sitio libremente.",
      },
      {
        heading: "9. Compras en tiendas de terceros",
        body: "Toda compra iniciada desde nuestros enlaces se rige por los términos, precios, políticas de envío, garantía y devoluciones de la tienda de destino. Los reclamos de compra (pagos, entregas, productos defectuosos, reembolsos) deben dirigirse a la tienda. Sin perjuicio de ello, sus derechos de consumidor frente a la tienda son los de la legislación de su país.",
      },
      {
        heading: "10. Disponibilidad del servicio",
        body: "El servicio se ofrece \"tal cual\" y \"según disponibilidad\". No garantizamos operación ininterrumpida ni libre de errores: puede haber mantenimientos, interrupciones de infraestructura o cambios de funcionalidad. Nos reservamos el derecho de modificar o descontinuar funciones, avisando con antelación razonable los cambios sustanciales.",
      },
      {
        heading: "11. Limitación de responsabilidad",
        body: "En la máxima medida permitida por la ley aplicable en su país:\n• Clicks & Go no responde por daños indirectos, lucro cesante o pérdida de datos derivados del uso del sitio.\n• No respondemos por el contenido, precios, stock ni conducta de las tiendas de terceros.\n• Nuestra responsabilidad total acumulada frente a usted no excederá el monto que usted nos haya pagado por usar el servicio (el servicio es gratuito, por lo que en la práctica: cero), salvo dolo o culpa grave.\n\nNada de lo anterior excluye ni limita responsabilidades que la ley de su país no permita excluir (por ejemplo, daños por dolo, o derechos irrenunciables del consumidor).",
      },
      {
        heading: "12. Indemnidad",
        body: "Usted mantendrá indemne a Clicks & Go frente a reclamos de terceros derivados de su uso del servicio en violación de estos Términos o de la ley, en la medida en que la legislación de su país permita este tipo de cláusulas.",
      },
      {
        heading: "13. Ley aplicable y jurisdicción",
        body: "Clicks & Go opera a nivel mundial. Estos Términos se interpretan de acuerdo con principios generales de derecho contractual internacional y, supletoriamente, la ley del domicilio del operador de la plataforma.\n\nSi usted es consumidor, conserva siempre la protección de las normas imperativas de su país de residencia y el derecho a reclamar ante los tribunales o autoridades de consumo de su propio país, cuando su legislación así lo disponga.\n\nAntes de cualquier acción formal, le proponemos intentar una resolución amistosa escribiendo a info@clicks-and-go.com.",
      },
      {
        heading: "14. Cambios y contacto",
        body: "Podemos actualizar estos Términos. Los cambios sustanciales se anunciarán por email (si tiene cuenta) o mediante aviso destacado en el sitio, con antelación razonable. La versión vigente es siempre la publicada en esta página, con su fecha de actualización.\n\nContacto: info@clicks-and-go.com",
      },
    ],
  },
  en: {
    title: "Terms & Conditions",
    updated: "Last updated: July 19, 2026",
    backLabel: "← Back to home",
    sections: [
      {
        heading: "1. Who we are and acceptance",
        body: "Clicks & Go is a technology price-comparison platform (laptops, monitors, peripherals, printers and more) operating worldwide. By accessing or using the site you accept these Terms. If you do not agree, do not use the service.\n\nThese Terms do not limit or replace the non-waivable rights granted to you by the consumer laws of your country of residence: in case of conflict, those rights prevail.",
      },
      {
        heading: "2. What we do (and what we don't)",
        body: "Clicks & Go compares prices and deals published by third-party stores and marketplaces, and links to them.\n\nWhat we are NOT:\n• We are not a store: we do not sell products, process payments or handle shipping.\n• We are not a party to your purchase: when you buy, the contract is between you and the destination store.\n• We are not representatives or agents of the stores or brands listed.",
      },
      {
        heading: "3. Affiliate links (disclosure)",
        body: "We participate in affiliate programs (e.g. Amazon Associates, Awin, CJ Affiliate, MercadoLibre). When you click \"Buy\" and complete a purchase at the destination store, we may earn a commission, at no extra cost to you.\n\nOur commitments:\n• The commission does not change the price you pay.\n• The existence or size of a commission does not alter scores (deal score) or result ranking, which are computed from technical price and product criteria.\n• Every buy button is accompanied by an affiliate-link notice.\n\nAs an Amazon Associate, Clicks & Go earns from qualifying purchases.",
      },
      {
        heading: "4. Prices, availability and accuracy",
        body: "Prices, discounts, availability and specifications shown come from the stores and may change without notice. We make a continuous, automated effort to keep information current, but:\n• The final price and valid conditions are ALWAYS those displayed by the store at the time of purchase.\n• A price, currency-conversion or availability error on Clicks & Go creates no right to demand that price.\n• Currency conversions are informational estimates based on reference exchange rates.\n\nIf you spot an error, we appreciate a note to info@clicks-and-go.com.",
      },
      {
        heading: "5. User accounts",
        body: "You can browse without an account. Favorites and price alerts require an account via Google, Microsoft, Facebook or an email sign-in link.\n\nYou agree to:\n• Provide truthful information and keep it current.\n• Not create accounts for third parties without authorization, nor automated accounts.\n• Keep control of your email and sign-in providers: all activity from your session is considered yours.\n\nYou can delete your account at any time from your dashboard or by writing to info@clicks-and-go.com (see the Privacy Policy for deletion timelines).",
      },
      {
        heading: "6. Price alerts and communications",
        body: "Price alerts are an optional service you configure: we email you when a product reaches your target price. They are not third-party advertising. You can disable them anytime from your dashboard. Alert delivery depends on third-party services and we do not guarantee the price is still valid when you read it.",
      },
      {
        heading: "7. Acceptable use",
        body: "You agree NOT to:\n• Perform bulk scraping, reverse engineering or unauthorized automated access to the site or its APIs.\n• Interfere with the service's operation (deliberate overload, limit evasion, code injection).\n• Use the service for unlawful activities or affiliate fraud (artificial clicks or purchases).\n• Resell, sublicense or commercially exploit the site's content without written authorization.\n\nWe may suspend or close accounts violating these rules, notifying you of the reason unless legally prevented.",
      },
      {
        heading: "8. Intellectual property",
        body: "The site, its design, software, original texts and scores are the property of Clicks & Go or its licensors.\n\nTrademarks, logos, product names and images of manufacturers and stores belong to their respective owners; they are used for identification and comparison purposes and do not imply sponsorship or corporate affiliation with Clicks & Go.\n\nYou may freely share links to the site.",
      },
      {
        heading: "9. Purchases at third-party stores",
        body: "Every purchase initiated from our links is governed by the destination store's terms, prices, shipping, warranty and return policies. Purchase claims (payments, deliveries, defective products, refunds) must be addressed to the store. Notwithstanding this, your consumer rights against the store are those of your country's laws.",
      },
      {
        heading: "10. Service availability",
        body: "The service is provided \"as is\" and \"as available\". We do not guarantee uninterrupted or error-free operation: there may be maintenance, infrastructure outages or feature changes. We reserve the right to modify or discontinue features, giving reasonable notice of substantial changes.",
      },
      {
        heading: "11. Limitation of liability",
        body: "To the maximum extent permitted by the law applicable in your country:\n• Clicks & Go is not liable for indirect damages, lost profits or data loss arising from use of the site.\n• We are not liable for the content, prices, stock or conduct of third-party stores.\n• Our total aggregate liability to you will not exceed the amount you paid us to use the service (the service is free, so in practice: zero), except in cases of willful misconduct or gross negligence.\n\nNothing above excludes or limits liability that the law of your country does not allow to be excluded (for example, willful misconduct, or non-waivable consumer rights).",
      },
      {
        heading: "12. Indemnity",
        body: "You will hold Clicks & Go harmless from third-party claims arising from your use of the service in violation of these Terms or the law, to the extent your country's legislation allows such clauses.",
      },
      {
        heading: "13. Governing law and jurisdiction",
        body: "Clicks & Go operates worldwide. These Terms are construed under general principles of international contract law and, supplementarily, the law of the platform operator's domicile.\n\nIf you are a consumer, you always keep the protection of the mandatory rules of your country of residence and the right to bring claims before the courts or consumer authorities of your own country, where your legislation so provides.\n\nBefore any formal action, we invite you to attempt an amicable resolution by writing to info@clicks-and-go.com.",
      },
      {
        heading: "14. Changes and contact",
        body: "We may update these Terms. Substantial changes will be announced by email (if you have an account) or via a prominent site notice, with reasonable advance. The current version is always the one published on this page, with its update date.\n\nContact: info@clicks-and-go.com",
      },
    ],
  },
  pt: {
    title: "Termos e Condições",
    updated: "Última atualização: 19 de julho de 2026",
    backLabel: "← Voltar ao início",
    sections: [
      {
        heading: "1. Quem somos e aceitação",
        body: "O Clicks & Go é uma plataforma de comparação de preços de tecnologia (laptops, monitores, periféricos, impressoras e mais) que opera mundialmente. Ao acessar ou usar o site, você aceita estes Termos. Se não concordar, não use o serviço.\n\nEstes Termos não limitam nem substituem os direitos irrenunciáveis garantidos pelas leis de consumo do seu país de residência: em caso de conflito, esses direitos prevalecem.",
      },
      {
        heading: "2. O que fazemos (e o que não fazemos)",
        body: "O Clicks & Go compara preços e ofertas publicados por lojas e marketplaces de terceiros, e direciona para eles.\n\nO que NÃO somos:\n• Não somos uma loja: não vendemos produtos, não processamos pagamentos, não gerenciamos envios.\n• Não somos parte do seu contrato de compra: ao comprar, o contrato é entre você e a loja de destino.\n• Não somos representantes nem agentes das lojas ou marcas listadas.",
      },
      {
        heading: "3. Links de afiliados (divulgação)",
        body: "Participamos de programas de afiliados (ex. Amazon Associates, Awin, CJ Affiliate, MercadoLibre). Quando você clica em \"Comprar\" e conclui uma compra na loja de destino, podemos receber uma comissão, sem custo adicional para você.\n\nCompromissos:\n• A comissão não altera o preço que você paga.\n• A existência ou o valor de uma comissão não altera as pontuações (deal score) nem a ordem dos resultados, calculados com critérios técnicos de preço e características do produto.\n• Cada botão de compra é acompanhado de um aviso de link de afiliado.\n\nComo participante do programa Amazon Associates, o Clicks & Go pode receber por compras qualificadas.",
      },
      {
        heading: "4. Preços, disponibilidade e exatidão",
        body: "Preços, descontos, disponibilidade e especificações exibidos vêm das lojas e podem mudar sem aviso. Fazemos um esforço contínuo e automatizado para manter as informações atualizadas, mas:\n• O preço final e as condições válidas são SEMPRE os exibidos pela loja no momento da compra.\n• Um erro de preço, conversão de moeda ou disponibilidade no Clicks & Go não gera direito de exigir esse preço.\n• Conversões de moeda são estimativas informativas baseadas em taxas de câmbio de referência.\n\nSe encontrar um erro, agradecemos o aviso em info@clicks-and-go.com.",
      },
      {
        heading: "5. Conta de usuário",
        body: "Você pode navegar sem conta. Favoritos e alertas de preço exigem conta via Google, Microsoft, Facebook ou link de acesso por email.\n\nVocê se compromete a:\n• Fornecer informações verdadeiras e mantê-las atualizadas.\n• Não criar contas para terceiros sem autorização, nem contas automatizadas.\n• Manter o controle do seu email e provedores de acesso: toda atividade da sua sessão é considerada sua.\n\nVocê pode excluir sua conta a qualquer momento no seu painel ou escrevendo para info@clicks-and-go.com (veja a Política de Privacidade para prazos de exclusão).",
      },
      {
        heading: "6. Alertas de preço e comunicações",
        body: "Os alertas de preço são um serviço opcional que você configura: enviamos um email quando um produto atinge o preço-alvo definido. Não são publicidade de terceiros. Você pode desativá-los a qualquer momento no seu painel. A entrega do email depende de serviços de terceiros e não garantimos que o preço continue válido quando você o ler.",
      },
      {
        heading: "7. Uso aceitável",
        body: "Você concorda em NÃO:\n• Fazer scraping em massa, engenharia reversa ou acesso automatizado não autorizado ao site ou às suas APIs.\n• Interferir na operação do serviço (sobrecarga deliberada, evasão de limites, injeção de código).\n• Usar o serviço para atividades ilícitas ou fraude de afiliação (cliques ou compras artificiais).\n• Revender, sublicenciar ou explorar comercialmente o conteúdo do site sem autorização por escrito.\n\nPodemos suspender ou encerrar contas que violem estas regras, notificando o motivo, salvo impedimento legal.",
      },
      {
        heading: "8. Propriedade intelectual",
        body: "O site, seu design, software, textos próprios e pontuações são propriedade do Clicks & Go ou de seus licenciantes.\n\nMarcas, logotipos, nomes de produtos e imagens de fabricantes e lojas pertencem aos seus respectivos titulares; são usados para identificação e comparação, sem implicar patrocínio ou afiliação societária com o Clicks & Go.\n\nVocê pode compartilhar links do site livremente.",
      },
      {
        heading: "9. Compras em lojas de terceiros",
        body: "Toda compra iniciada pelos nossos links é regida pelos termos, preços, políticas de envio, garantia e devolução da loja de destino. Reclamações de compra (pagamentos, entregas, produtos com defeito, reembolsos) devem ser dirigidas à loja. Sem prejuízo disso, seus direitos de consumidor perante a loja são os da legislação do seu país.",
      },
      {
        heading: "10. Disponibilidade do serviço",
        body: "O serviço é oferecido \"como está\" e \"conforme disponível\". Não garantimos operação ininterrupta nem livre de erros: pode haver manutenções, interrupções de infraestrutura ou mudanças de funcionalidades. Reservamo-nos o direito de modificar ou descontinuar recursos, avisando com antecedência razoável sobre mudanças substanciais.",
      },
      {
        heading: "11. Limitação de responsabilidade",
        body: "Na máxima medida permitida pela lei aplicável no seu país:\n• O Clicks & Go não responde por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso do site.\n• Não respondemos pelo conteúdo, preços, estoque nem conduta das lojas de terceiros.\n• Nossa responsabilidade total acumulada perante você não excederá o valor que você nos pagou para usar o serviço (o serviço é gratuito, então na prática: zero), salvo dolo ou culpa grave.\n\nNada disso exclui ou limita responsabilidades que a lei do seu país não permita excluir (por exemplo, dolo, ou direitos irrenunciáveis do consumidor).",
      },
      {
        heading: "12. Indenização",
        body: "Você manterá o Clicks & Go indene de reclamações de terceiros decorrentes do seu uso do serviço em violação destes Termos ou da lei, na medida em que a legislação do seu país permita esse tipo de cláusula.",
      },
      {
        heading: "13. Lei aplicável e jurisdição",
        body: "O Clicks & Go opera mundialmente. Estes Termos são interpretados segundo princípios gerais de direito contratual internacional e, supletivamente, pela lei do domicílio do operador da plataforma.\n\nSe você é consumidor, mantém sempre a proteção das normas imperativas do seu país de residência e o direito de reclamar perante os tribunais ou autoridades de consumo do seu próprio país, quando a sua legislação assim dispuser.\n\nAntes de qualquer ação formal, propomos tentar uma resolução amigável escrevendo para info@clicks-and-go.com.",
      },
      {
        heading: "14. Alterações e contato",
        body: "Podemos atualizar estes Termos. Mudanças substanciais serão anunciadas por email (se você tiver conta) ou por aviso em destaque no site, com antecedência razoável. A versão vigente é sempre a publicada nesta página, com sua data de atualização.\n\nContato: info@clicks-and-go.com",
      },
    ],
  },
  it: {
    title: "Termini e Condizioni",
    updated: "Ultimo aggiornamento: 23 luglio 2026",
    backLabel: "← Torna alla home",
    sections: [
      {
        heading: "1. Chi siamo e accettazione",
        body: "Clicks & Go è una piattaforma di comparazione prezzi di prodotti tecnologici (laptop, monitor, periferiche, stampanti e altro) che opera a livello mondiale. Accedendo o utilizzando il sito, lei accetta questi Termini. Se non è d'accordo, non utilizzi il servizio.\n\nQuesti Termini non limitano né sostituiscono i diritti non rinunciabili riconosciuti dalla legislazione sui consumatori del suo paese di residenza: in caso di conflitto, tali diritti prevalgono.",
      },
      {
        heading: "2. Cosa facciamo (e cosa non facciamo)",
        body: "Clicks & Go confronta prezzi e offerte pubblicati da negozi e marketplace di terze parti, e rimanda a essi.\n\nCosa NON siamo:\n• Non siamo un negozio: non vendiamo prodotti, non elaboriamo pagamenti, non gestiamo spedizioni.\n• Non siamo parte del suo contratto di acquisto: quando acquista, il contratto è tra lei e il negozio di destinazione.\n• Non siamo rappresentanti né agenti dei negozi o marchi elencati.",
      },
      {
        heading: "3. Link di affiliazione (divulgazione)",
        body: "Partecipiamo a programmi di affiliazione (ad esempio Amazon Associates, Awin, CJ Affiliate, MercadoLibre). Quando lei clicca su \"Acquista\" e completa un acquisto nel negozio di destinazione, potremmo ricevere una commissione, senza costi aggiuntivi per lei.\n\nI nostri impegni:\n• La commissione non modifica il prezzo che lei paga.\n• L'esistenza o l'importo di una commissione non altera i punteggi (deal score) né l'ordine dei risultati, calcolati secondo criteri tecnici di prezzo e caratteristiche del prodotto.\n• Ogni pulsante di acquisto è accompagnato da un avviso di link di affiliazione.\n\nIn qualità di partecipante al programma Amazon Associates, Clicks & Go può percepire compensi dagli acquisti idonei.",
      },
      {
        heading: "4. Prezzi, disponibilità ed esattezza",
        body: "Prezzi, sconti, disponibilità e caratteristiche mostrati provengono dai negozi e possono cambiare senza preavviso. Facciamo uno sforzo continuo e automatizzato per mantenere le informazioni aggiornate, ma:\n• Il prezzo finale e le condizioni valide sono SEMPRE quelli mostrati dal negozio al momento dell'acquisto.\n• Un errore di prezzo, conversione valutaria o disponibilità su Clicks & Go non genera il diritto di pretendere quel prezzo.\n• Le conversioni valutarie sono stime informative basate su tassi di cambio di riferimento.\n\nSe rileva un errore, gradiamo una segnalazione a info@clicks-and-go.com.",
      },
      {
        heading: "5. Account utente",
        body: "Può navigare senza account. Per usare preferiti e avvisi di prezzo serve un account tramite Google, Microsoft, Facebook o un link di accesso via email.\n\nLei si impegna a:\n• Fornire informazioni veritiere e mantenerle aggiornate.\n• Non creare account per terzi senza autorizzazione, né account automatizzati.\n• Mantenere il controllo della sua email e dei suoi provider di accesso: ogni attività svolta dalla sua sessione è considerata sua.\n\nPuò eliminare il suo account in qualsiasi momento dal suo pannello o scrivendo a info@clicks-and-go.com (vedi l'Informativa sulla Privacy per i tempi di cancellazione).",
      },
      {
        heading: "6. Avvisi di prezzo e comunicazioni",
        body: "Gli avvisi di prezzo sono un servizio facoltativo che lei configura: le inviamo un'email quando un prodotto raggiunge il prezzo obiettivo da lei definito. Non sono comunicazioni pubblicitarie di terzi. Può disattivarli in qualsiasi momento dal suo pannello. La consegna di un'email di avviso dipende da servizi di terze parti e non garantiamo che il prezzo sia ancora valido al momento della lettura.",
      },
      {
        heading: "7. Uso accettabile",
        body: "Lei si impegna a NON:\n• Effettuare scraping massivo, reverse engineering o accesso automatizzato non autorizzato al sito o alle sue API.\n• Interferire con il funzionamento del servizio (sovraccarico deliberato, elusione dei limiti, iniezione di codice).\n• Usare il servizio per attività illecite o per generare frodi di affiliazione (clic o acquisti artificiali).\n• Rivendere, sublicenziare o sfruttare commercialmente i contenuti del sito senza autorizzazione scritta.\n\nPossiamo sospendere o chiudere account che violino queste regole, comunicandole il motivo salvo impedimento legale.",
      },
      {
        heading: "8. Proprietà intellettuale",
        body: "Il sito, il suo design, il software, i testi originali e i punteggi sono di proprietà di Clicks & Go o dei suoi licenzianti.\n\nMarchi, loghi, nomi di prodotti e immagini di produttori e negozi appartengono ai rispettivi titolari; sono usati a fini identificativi e di comparazione, senza implicare sponsorizzazione o affiliazione societaria con Clicks & Go.\n\nPuò condividere liberamente link al sito.",
      },
      {
        heading: "9. Acquisti presso negozi di terze parti",
        body: "Ogni acquisto avviato dai nostri link è disciplinato dai termini, prezzi, politiche di spedizione, garanzia e resi del negozio di destinazione. I reclami relativi all'acquisto (pagamenti, consegne, prodotti difettosi, rimborsi) devono essere indirizzati al negozio. Ciò non toglie che i suoi diritti di consumatore nei confronti del negozio siano quelli della legislazione del suo paese.",
      },
      {
        heading: "10. Disponibilità del servizio",
        body: "Il servizio è offerto \"così com'è\" e \"secondo disponibilità\". Non garantiamo un funzionamento ininterrotto o privo di errori: potrebbero verificarsi manutenzioni, interruzioni dell'infrastruttura o modifiche di funzionalità. Ci riserviamo il diritto di modificare o interrompere funzionalità, avvisando con ragionevole anticipo per i cambiamenti sostanziali.",
      },
      {
        heading: "11. Limitazione di responsabilità",
        body: "Nella misura massima consentita dalla legge applicabile nel suo paese:\n• Clicks & Go non risponde per danni indiretti, mancato guadagno o perdita di dati derivanti dall'uso del sito.\n• Non rispondiamo per il contenuto, i prezzi, le scorte né la condotta dei negozi di terze parti.\n• La nostra responsabilità totale complessiva nei suoi confronti non supererà l'importo che lei ci ha pagato per usare il servizio (il servizio è gratuito, quindi in pratica: zero), salvo dolo o colpa grave.\n\nNulla di quanto sopra esclude o limita responsabilità che la legge del suo paese non consente di escludere (ad esempio, dolo, o diritti irrinunciabili del consumatore).",
      },
      {
        heading: "12. Manleva",
        body: "Lei terrà indenne Clicks & Go da reclami di terzi derivanti dal suo uso del servizio in violazione di questi Termini o della legge, nella misura in cui la legislazione del suo paese consenta questo tipo di clausole.",
      },
      {
        heading: "13. Legge applicabile e giurisdizione",
        body: "Clicks & Go opera a livello mondiale. Questi Termini sono interpretati secondo principi generali di diritto contrattuale internazionale e, in via suppletiva, secondo la legge del domicilio dell'operatore della piattaforma.\n\nSe lei è un consumatore, mantiene sempre la protezione delle norme imperative del suo paese di residenza e il diritto di agire dinanzi ai tribunali o alle autorità di tutela dei consumatori del proprio paese, quando la sua legislazione lo preveda.\n\nPrima di qualsiasi azione formale, le proponiamo di tentare una risoluzione amichevole scrivendo a info@clicks-and-go.com.",
      },
      {
        heading: "14. Modifiche e contatto",
        body: "Potremmo aggiornare questi Termini. Le modifiche sostanziali saranno annunciate via email (se ha un account) o tramite avviso in evidenza sul sito, con ragionevole anticipo. La versione vigente è sempre quella pubblicata in questa pagina, con la relativa data di aggiornamento.\n\nContatto: info@clicks-and-go.com",
      },
    ],
  },
};

export default async function TerminosPage({ params }: Props) {
  const { locale } = await params;
  const content = CONTENT[locale] ?? CONTENT.es;
  const dict = locale === "en" ? enDict : locale === "pt" ? ptDict : locale === "it" ? itDict : esDict;

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
              <FileText size={20} className="text-blue-600" />
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
          <Link href={`/${locale}/privacidad`} className="hover:text-blue-600 transition-colors font-semibold">
            {dict.footer?.privacyLink || "Privacidad"}
          </Link>
          <Link href={`/${locale}`} className="hover:text-blue-600 transition-colors font-semibold">
            Clicks & Go
          </Link>
        </div>

      </div>
    </div>
  );
}
