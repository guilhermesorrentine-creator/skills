// /oferta estática do tráfego pago: HTML completo e leve (sem o bundle do React), com /oferta.js para funil,
// cookies e compra direta na Cakto. Texto original da Voxelia; números vêm do catálogo no build.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CSS = `*{box-sizing:border-box}body{margin:0;background:#0b1016;color:#e8eef3;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:#5be3ed}main{max-width:720px;margin:0 auto;padding:0 18px}section{padding:34px 0;border-bottom:1px solid #1c2733}
header{display:flex;align-items:center;justify-content:space-between;max-width:720px;margin:0 auto;padding:14px 18px}
.brand{font-weight:800;font-size:18px;color:#fff;text-decoration:none}.kicker{color:#5be3ed;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px}
h1{font-size:clamp(30px,8vw,46px);line-height:1.08;margin:0 0 14px;letter-spacing:-.02em}h2{font-size:clamp(22px,5.5vw,30px);line-height:1.15;margin:0 0 14px}
.lead{font-size:18px;color:#b8c6d1;margin:0 0 20px}.cta{display:block;text-align:center;background:#5be3ed;color:#061217;font-weight:800;font-size:18px;padding:17px 20px;border-radius:12px;text-decoration:none}
.cta[aria-busy=true]{opacity:.75}.fine{color:#8fa2b1;font-size:14px;text-align:center;margin:10px 0 0}.launch{display:inline-block;background:#3a2d0b;color:#ffd166;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px}
.ba{display:grid;gap:12px}.ba div{padding:16px;border-radius:12px;background:#111a24;border:1px solid #223242}.ba b{display:block;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
.before b{color:#ff9b9b}.ba .after{border-color:#2f8f74}.after b{color:#8ff0c6}ul.list{padding:0;margin:0;list-style:none;display:grid;gap:10px;text-align:left}
ul.list li{padding:12px 14px;border-radius:10px;background:#111a24}ul.list li strong{color:#fff}ol.steps{padding-left:20px;margin:0;display:grid;gap:10px}
.price{text-align:center}.price>strong{display:block;font-size:52px;color:#5be3ed;line-height:1}.no{color:#8fa2b1}.gap{margin-top:18px}details{padding:12px 0;border-top:1px solid #1c2733}
summary{cursor:pointer;font-weight:700}footer{max-width:720px;margin:0 auto;padding:24px 18px 110px;color:#8fa2b1;font-size:13px}footer nav{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px}
#consent{position:fixed;left:8px;right:8px;bottom:8px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:10px 12px;border-radius:12px;background:#111a24;border:1px solid #5be3ed;font-size:13px}
#consent[hidden]{display:none}#consent p{flex:1 1 240px;margin:0}#consent span{display:flex;gap:8px;flex:1 1 180px}#consent button{flex:1;padding:8px;border-radius:8px;border:1px solid #3a5160;background:#0b1016;color:#e8eef3;font:inherit;font-weight:700}`;

export function offerPage({ base, skills, repos, price, checkoutSlug, pixelId, seller }) {
  const money = `R$ ${price.replace(".", ",")}`;
  const checkout = /^[a-zA-Z0-9_-]{4,80}$/.test(checkoutSlug || "") ? `https://pay.cakto.com.br/${checkoutSlug}` : "";
  const sellerLine = [seller.name, seller.document && `CPF/CNPJ ${seller.document}`, seller.city].filter(Boolean).join(" · ");
  const cta = (label = `Quero o acervo · ${money}`) => `<a class="cta" href="${checkout ? esc(checkout) : "/comprar"}" data-buy>${esc(label)}</a>`;
  const launch = (cls) => `<span class="${cls}" data-launch>Preço de lançamento até 15/11 · depois R$ 59,90</span>`;
  const faq = [
    ["Preciso saber programar?", "Não. Você busca a tarefa, abre o guia em português e copia o texto para a sua IA."],
    ["Funciona com qual IA?", "Com a que você já usa: Claude, ChatGPT, Gemini e outras. A Voxelia não conecta sozinha na sua IA: você consulta e copia."],
    ["Tem mensalidade?", `Não. É pagamento único de ${money}, com acesso vitalício à Edição 1.`],
    ["As skills são exclusivas?", `Não. Vêm de ${repos} repositórios públicos, com fonte e autor creditados. Você paga pela organização, pela busca e pelos guias em português.`],
    ["Como recebo o acesso?", "Depois que o pagamento é confirmado, chega no e-mail que você usou na Cakto um link para criar a senha. Pelo Pix costuma levar poucos minutos."],
    ["E se não servir para mim?", "Você tem 15 dias de garantia. Peça o reembolso em Minha licença ou pelo suporte e o valor volta integral."],
  ];
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Voxelia: o roteiro certo para a sua IA</title>
<meta name="description" content="${esc(`${skills} skills com guias em português para usar na IA que você já tem. ${money}, pagamento único.`)}">
<meta name="robots" content="noindex, follow"><link rel="canonical" href="${base}/oferta"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="Voxelia: o pedido certo para a sua IA"><meta property="og:image" content="${base}/og.png"><meta name="theme-color" content="#0b1016">
<link rel="preconnect" href="https://pay.cakto.com.br"><style>${CSS}</style></head>
<body data-checkout="${esc(checkout)}" data-pixel="${esc(pixelId || "")}" data-price="${esc(price)}">
<header><a class="brand" href="/">Voxelia</a><a href="/entrar">Entrar</a></header>
<main>
<section>
<p class="kicker">Para quem usa IA no trabalho</p>
<h1>Sua IA entrega resposta genérica? Dê a ela o roteiro certo.</h1>
<p class="lead">A Voxelia é um acervo de ${esc(skills)} skills com guias em português. Você busca a tarefa, copia o guia e cola na IA que já usa, e ela passa a seguir um método em vez de improvisar. A maior parte do acervo é de programação e automação com IA; também há skills de proposta, e-mail, páginas e conteúdo para redes sociais.</p>
${cta()}
<p class="fine">Pagamento único · acesso vitalício · 15 dias de garantia</p><p class="fine">${launch("launch")}</p>
</section>
<section>
<h2>O mesmo pedido, outro resultado</h2>
<div class="ba"><div class="before"><b>Hoje</b>Segunda, 22h. Você pede uma proposta à IA e recebe "eleve seu negócio a outro nível". Reescreve tudo à mão, e o cliente lê duas linhas e some.</div>
<div class="after"><b>Com a Voxelia</b>Você abre a skill de proposta, cola o guia e a IA entrega problema do cliente, oferta, prazo, garantia e próximo passo. Você revisa e envia.</div></div>
</section>
<section>
<h2>Pra quem é</h2>
<ul class="list"><li><strong>Quem programa ou automatiza com IA</strong> (Claude Code, Cursor, agentes): a maior parte do acervo é para você.</li>
<li><strong>Freelancer e social media:</strong> skills de proposta, e-mail e conteúdo para redes sociais.</li>
<li><strong>Dono de pequeno negócio:</strong> páginas, apresentações e tarefas do dia a dia com mais estrutura.</li>
<li><strong>Quem já usa IA e se frustra:</strong> cansou de resposta genérica que não dá para usar.</li></ul>
</section>
<section>
<h2>Como funciona</h2>
<ol class="steps"><li><strong>Busque pelo objetivo:</strong> "revisar código", "proposta para cliente", "post para Instagram".</li>
<li><strong>Abra o guia em português:</strong> passo a passo, com a fonte da skill.</li>
<li><strong>Copie e cole na sua IA:</strong> Claude, ChatGPT, Gemini ou outra.</li></ol>
</section>
<section id="preco" class="price">
<h2>O que você recebe</h2>
<ul class="list"><li>${esc(skills)} skills organizadas por objetivo, de ${esc(repos)} repositórios públicos com fonte creditada</li>
<li>Guias em português para copiar e usar</li><li>Busca, favoritos e coleções</li><li>Acesso vitalício à Edição 1</li>
<li class="no">Não inclui conexão automática com a sua IA: você consulta e copia</li></ul>
<p class="gap">Pagamento único</p><strong>${esc(money)}</strong><p class="fine">${launch("launch")}</p>
<div class="gap">${cta("Quero o acervo agora")}</div><p class="fine">Pix ou cartão, no ambiente seguro da Cakto</p>
</section>
<section>
<h2>Depois de pagar</h2>
<ol class="steps"><li>Você paga na Cakto, por Pix ou cartão.</li><li>Chega no seu e-mail o link para criar a senha.</li><li>Você entra e busca a primeira skill.</li></ol>
</section>
<section>
<h2>15 dias para testar numa tarefa real</h2>
<p>Use numa proposta, num anúncio ou numa legenda de verdade. Se não servir, peça o reembolso em Minha licença ou pelo suporte dentro de 15 dias e o valor volta integral.</p>
</section>
<section>
<h2>Perguntas frequentes</h2>
${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
<div class="gap">${cta()}</div>
</section>
</main>
<footer><nav><a href="/termos">Termos de uso</a><a href="/privacidade">Privacidade</a><a href="/compra-e-reembolso">Compra e reembolso</a></nav>
<p>${esc(sellerLine || "Voxelia")}${seller.email ? ` · <a href="mailto:${esc(seller.email)}">${esc(seller.email)}</a>` : ""}</p>
<p>A Voxelia é um produto independente. Claude é marca da Anthropic e ChatGPT é marca da OpenAI; a Voxelia não é afiliada, patrocinada nem endossada por elas. As skills vêm de repositórios públicos, com fonte creditada.</p></footer>
<div id="consent" role="region" aria-label="Aviso de cookies" hidden><p>Podemos usar cookies do Meta para medir de qual anúncio você veio? <a href="/privacidade">Saiba mais</a></p><span><button type="button" data-consent="denied">Recusar</button><button type="button" data-consent="granted">Aceitar</button></span></div>
<script src="/oferta.js" defer></script>
</body></html>`;
}
