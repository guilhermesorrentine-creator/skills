import { useEffect, useRef, useState } from "react";
import { authActions, useAuth } from "../lib/auth.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { formatPrice, OFFER_PRICE, purchase } from "../lib/billing-client.js";
import { categoryLabel, typeLabel } from "../lib/resources.js";
import { Brand } from "../components/site/SiteNav.jsx";
import { seller, sellerLine } from "../lib/seller.js";

// Navegação das páginas simples: com sessão, Voxelia/Sair; sem sessão, Entrar/Criar conta.
function Shell({ title, eyebrow, children }) {
  const { user, devMode } = useAuth();
  return <main id="conteudo" className="simple">
    <div className="simple-wrap">
      <nav className="simple-nav" aria-label="Conta"><Brand/>{user || devMode
        ? <span className="row"><Link className="link" to="/app">Voxelia</Link><button type="button" className="link" onClick={async () => { await authActions.signOut(); navigate("/"); }}>Sair</button></span>
        : <span className="row"><Link className="btn btn-ghost btn-sm" to="/entrar">Entrar</Link><Link className="btn btn-primary btn-sm" to="/cadastro">Criar conta</Link></span>}</nav>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children}
    </div>
  </main>;
}

// Retorno do pagamento: nunca libera acesso pela URL; consulta o servidor até a confirmação chegar.
// Pedido e chave da compra sem cadastro: da URL de retorno ou, se faltar, do navegador que iniciou a compra.
export function claimFrom(search) {
  const params = new URLSearchParams(search);
  if (params.get("sessao") && params.get("chave")) return { session: params.get("sessao"), key: params.get("chave") };
  if (params.get("pedido") && params.get("chave")) return { order: params.get("pedido"), key: params.get("chave") };
  try { const saved = JSON.parse(localStorage.getItem("vx-claim") || "null"); return saved?.key && (saved.order || saved.session) ? saved : null; } catch { return null; }
}

// Compra sem cadastro: consulta o servidor até o pagamento confirmar e oferece o link para criar a senha.
function GuestReturn({ claim }) {
  const [state, setState] = useState({ status: "pending" });
  const [tries, setTries] = useState(0);
  // Uma consulta por vez, até pagar: cada resposta "paga" gera um link de senha novo e invalida o anterior,
  // então duas consultas simultâneas mostravam um link já vencido. O laço depende só da chave, não do objeto.
  const claimKey = JSON.stringify(claim);
  useEffect(() => {
    let stopped = false;
    (async () => {
      for (let attempt = 0; attempt < 60 && !stopped; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt ? 3000 : 300));
        if (stopped) return;
        try {
          const response = await fetch(claim.session ? "/api/subscription/claim" : "/api/checkout/claim", { method: "POST", headers: { "content-type": "application/json" }, body: claimKey });
          const data = await response.json();
          if (stopped) return;
          if (!response.ok) { setState({ status: "error", message: data.message }); return; }
          setState(data);
          if (data.status === "paid") return;
        } catch { /* tenta de novo */ }
        setTries(attempt + 1);
      }
    })();
    return () => { stopped = true; };
  }, [claimKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.status === "paid") try { localStorage.removeItem("vx-claim"); } catch { /* ok */ } }, [state.status]);
  const paid = state.status === "paid";
  return <Shell eyebrow="Pagamento" title={paid ? "Pagamento confirmado!" : state.status === "error" ? "Link de retorno inválido" : "Confirmando seu pagamento…"}>
    <div className="panel stack">
      {paid && state.url && <><p>{claim.session ? "Sua mensalidade foi confirmada e o acesso está ativo." : "Seu acesso vitalício está ativo."} Falta só criar sua senha:</p><a className="btn btn-primary" href={state.url}>Criar minha senha e entrar</a></>}
      {paid && state.login && <><p>Seu acesso está ativo. Entre com seu e-mail e senha.</p><Link className="btn btn-primary" to="/entrar?next=/app">Entrar na Voxelia</Link></>}
      {state.status === "error" && <p>{state.message}</p>}
      {!paid && state.status !== "error" && <><p className="waiting"><span className="spinner" aria-hidden="true"/> Aguardando a confirmação do pagamento. Não feche esta página.</p>
        {tries >= 60 && <p>A confirmação ainda não chegou. Guarde este endereço e volte a ele daqui a pouco: o acesso é liberado assim que o pagamento confirmar.</p>}</>}
    </div>
  </Shell>;
}

export function CheckoutReturnPage({ account, reload }) {
  const claim = account?.access ? null : claimFrom(location.search);
  if (claim) return <GuestReturn claim={claim}/>;
  return <SignedReturn account={account} reload={reload}/>;
}

function SignedReturn({ account, reload }) {
  const params = new URLSearchParams(location.search);
  const result = params.get("resultado");
  const [tries, setTries] = useState(0);
  const timer = useRef(0);
  const confirmed = params.get("tipo") === "mensal" ? account?.subscription?.active : account?.access;
  useEffect(() => {
    if (confirmed || result !== "sucesso" || tries >= 40) return;
    timer.current = window.setTimeout(async () => { await reload(); setTries((v) => v + 1); }, 3000);
    return () => window.clearTimeout(timer.current);
  }, [confirmed, result, tries, reload]);
  return <Shell eyebrow="Pagamento" title={confirmed ? "Pagamento confirmado" : result === "sucesso" ? "Aguardando confirmação do pagamento" : result === "expirado" ? "O link de pagamento expirou" : "Pagamento não concluído"}>
    <div className="panel stack">
      {confirmed && <><p>O pagamento foi confirmado. Seu acesso está ativo.</p><button type="button" className="btn btn-primary" onClick={() => navigate("/app")}>Entrar na Voxelia</button></>}
      {!confirmed && result === "sucesso" && <><p className="waiting"><span className="spinner" aria-hidden="true"/> Recebemos seu retorno. O acesso é liberado somente quando a plataforma de pagamento confirma a compra.</p>
        {tries >= 40 && <p>A confirmação ainda não chegou. Você pode fechar esta página: o acesso será liberado automaticamente quando o pagamento for confirmado.</p>}
        <button type="button" className="btn btn-secondary" onClick={() => reload()}>Verificar agora</button></>}
      {!confirmed && result !== "sucesso" && <><p>Nenhum pagamento foi confirmado. Você pode tentar de novo quando quiser.</p><button type="button" className="btn btn-primary" onClick={() => navigate("/acesso-pendente")}>Voltar à compra</button></>}
    </div>
  </Shell>;
}

// Conta sem licença: mostra pedido pendente ou a oferta da edição à venda.
export function AccessPendingPage({ account, error, reload }) {
  const [editions, setEditions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [buyError, setBuyError] = useState("");
  useEffect(() => { fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEditions(d.editions || [])).catch(() => setEditions([])); }, []);
  const edition = editions?.[0];
  const buy = async () => { setBusy(true); setBuyError(""); try { await purchase(edition.code, { signedIn: true }); } catch (e) { setBuyError(e.message); setBusy(false); } };
  return <Shell eyebrow="Acesso" title={account?.pendingOrder ? "Pagamento em andamento" : "Escolha seu acesso à Voxelia"}>
    {error && <p className="form-error" role="alert">Não foi possível verificar sua conta: {error.message} <button type="button" className="link" onClick={() => reload()}>Tentar de novo</button></p>}
    {account?.license && !account.access && <p className="notice">Situação da licença: {account.license.statusLabel}. Fale com o suporte se precisar.</p>}
    {account?.pendingOrder && <div className="panel stack"><p>Você iniciou um pagamento que ainda não foi confirmado.</p><a className="btn btn-primary" href={account.pendingOrder.url}>Continuar pagamento</a><button type="button" className="btn btn-secondary" onClick={() => reload()}>Já paguei — verificar</button></div>}
    {!account?.pendingOrder && <div className="panel stack">
      <p className="eyebrow">Acervo vitalício</p>
      {editions == null ? <p className="muted">Carregando…</p> : edition ? <>
        <p className="eyebrow">{edition.name}</p>
        <p className="l-price"><b>{formatPrice(edition.priceCents)}</b><span>pagamento único</span></p>
        <p className="muted">Acesso vitalício ao acervo. Sem mensalidade. Pix ou cartão pela Cakto; a conexão automática com IA não está incluída.</p>
        <button type="button" className="btn btn-secondary" onClick={buy} disabled={busy}>{busy ? "Abrindo pagamento…" : "Comprar acervo vitalício"}</button>
      </> : <p>As vendas ainda não foram abertas. Assim que a edição estiver disponível, você poderá comprar por aqui.</p>}
      {buyError && <p className="form-error" role="alert">{buyError}</p>}
    </div>}
  </Shell>;
}

// Visualização pública de coleção compartilhada: só títulos; não abre conteúdo pago.
export function SharedCollectionPage({ token }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const meta = document.createElement("meta"); meta.name = "robots"; meta.content = "noindex, nofollow"; document.head.append(meta);
    fetch(`/api/shared?token=${encodeURIComponent(token)}`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); setState({ data: d }); }).catch((e) => setState({ error: e }));
    return () => meta.remove();
  }, [token]);
  return <Shell eyebrow="Coleção compartilhada" title={state.data?.name || (state.error ? "Link indisponível" : "Carregando…")}>
    {state.error && <p className="muted">{state.error.message}</p>}
    {state.data && <>{state.data.description && <p className="muted">{state.data.description}</p>}
      <ol className="col-items">{state.data.items.map((item) => <li key={item.id} className="col-item"><div className="col-item-main"><b>{item.title}</b><span className="muted small">{typeLabel[item.type]} · {categoryLabel[item.category]}</span></div></li>)}</ol>
      <p className="small muted">Para abrir os recursos é preciso ter acesso à Voxelia. <Link className="link" to="/">Conheça</Link></p></>}
  </Shell>;
}

// Textos jurídicos. Os dados de quem vende vêm do ambiente (src/lib/seller.js).
const UPDATED = "28 de outubro de 2026";
const who = () => sellerLine() || "dados em cadastro";
const contact = () => seller.email || "o e-mail de suporte indicado no rodapé";
const legal = {
  termos: { title: "Termos de uso", sections: () => [
    ["1. Quem somos", `A Voxelia é uma plataforma de Agent Skills organizadas em português. Responsável: ${who()}. Ao criar uma conta ou comprar, você concorda com estes termos.`],
    ["2. O que é o serviço", "A Voxelia organiza Agent Skills e outros recursos de repositórios públicos para o Claude, o ChatGPT e outros agentes de IA, com busca por objetivo e guias passo a passo em português. As skills não são exclusivas: vêm de projetos públicos, sempre com a fonte e o autor creditados. O que vendemos é a curadoria, a organização, a busca e os guias."],
    ["3. Conta", "Você é responsável pelo e-mail informado e pela senha da sua conta. A licença é pessoal: não compartilhe o acesso nem o link de conexão com a IA."],
    ["4. Licença vitalícia", "A compra avulsa do acervo dá acesso por tempo indeterminado aos recursos daquela edição, enquanto a Voxelia estiver em operação. Não inclui conexão direta com IA. Edições futuras podem trazer recursos extras mediante upgrade opcional."],
    ["5. Assinaturas e compras anteriores", "A assinatura mensal não está aberta para novas vendas. Quem já possui assinatura ou comprou o Pro anual mantém os direitos informados na contratação e pode consultar e gerenciar sua assinatura em Minha licença. Os aplicativos de IA são de terceiros e podem ter custos próprios."],
    ["6. Conteúdo de terceiros", "Cada skill segue a licença do repositório de origem, informada junto ao recurso. Antes de usar em produção, confira a licença e revise o que o agente vai executar. A Voxelia não se responsabiliza pelo funcionamento de ferramentas de terceiros."],
    ["7. Disponibilidade e suporte", `Trabalhamos para manter a plataforma no ar, mas podem ocorrer interrupções para manutenção. Suporte por ${contact()}.`],
    ["8. Uso proibido", "É proibido revender o acesso, copiar o acervo em massa, burlar a cobrança ou usar a plataforma para fins ilegais. Nesses casos a licença pode ser revogada."],
    ["9. Responsabilidade", "Os guias têm caráter educativo. Resultados dependem do seu uso e das ferramentas escolhidas. Nada nestes termos limita direitos garantidos pelo Código de Defesa do Consumidor."],
    ["10. Lei e foro", "Aplica-se a lei brasileira. Fica eleito o foro do domicílio do consumidor."],
  ] },
  privacidade: { title: "Política de privacidade", sections: () => [
    ["1. Controlador", `Controlador dos dados tratados na Voxelia, nos termos da LGPD (Lei 13.709/2018): ${who()}. Contato do encarregado: ${contact()}.`],
    ["2. Dados que coletamos", "E-mail e senha da conta; dados do comprador e do pagamento informados pela Cakto ou pelo Asaas em compras anteriores; favoritos, histórico e coleções que você cria; um identificador anônimo de navegação com a origem da visita (campanha e anúncio), sem dado pessoal."],
    ["3. Para que usamos", "Executar o contrato (liberar e manter o acesso, processar pagamento, reembolso e suporte), cumprir obrigações legais e fiscais e, com o seu consentimento, medir anúncios."],
    ["4. Com quem compartilhamos", "Operadores que nos ajudam a prestar o serviço: Supabase (conta e banco de dados), Cakto (novos pagamentos), Asaas (compras e assinaturas anteriores), Vercel (hospedagem), Resend (e-mails) e Meta (medição de anúncios: no site, só com consentimento; na página de pagamento da Cakto, conforme o item 5). Não vendemos seus dados."],
    ["5. Cookies e Meta", "No site da Voxelia, o Pixel e a API de Conversões do Meta só são usados se você aceitar os cookies de marketing. Você pode mudar a escolha a qualquer momento em Preferências de cookies, no rodapé. Na página de pagamento, operada pela Cakto, o Pixel do Meta da Voxelia registra o início do pagamento e a compra (com e-mail e telefone criptografados) para medir quais anúncios trazem vendas; esse ambiente segue também a política de privacidade da Cakto."],
    ["6. Seus direitos", `Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados e revogar consentimentos, escrevendo para ${contact()}. Respondemos em até 15 dias.`],
    ["7. Retenção", "Mantemos os dados enquanto a conta existir. Dados de pagamento e notas são guardados pelo prazo exigido pela lei fiscal. Coleções compartilhadas por link só ficam públicas enquanto você mantiver o compartilhamento."],
    ["8. Segurança", "Usamos conexão criptografada, senhas protegidas pelo provedor de autenticação e acesso restrito ao banco de dados. Os dados do cartão são digitados no ambiente da Cakto ou, em compras anteriores, do Asaas, e não passam pelos nossos servidores."],
  ] },
  "compra-e-reembolso": { title: "Compra e reembolso", sections: () => [
    ["1. Preços e pagamento", `A oferta atual do acervo vitalício custa ${OFFER_PRICE} em pagamento único por Pix ou cartão, processado pela Cakto. Não inclui conexão automática com IA. Compras e assinaturas anteriores processadas pelo Asaas mantêm suas condições contratadas.`],
    ["2. Liberação do acesso", "O acesso é liberado assim que o pagamento é confirmado: na hora no Pix e em instantes no cartão. Depois da confirmação você cria a senha na própria página, sem esperar e-mail."],
    ["3. Garantia de 15 dias", "Você pode pedir reembolso em até 15 dias da compra vitalícia ou da primeira mensalidade de uma assinatura anterior, sem justificar, em Minha licença ou pelo suporte."],
    ["4. Como o reembolso é feito", "O valor volta pelo mesmo meio de pagamento. Compras pela Cakto são solicitadas em Minha licença ou pelo suporte e processadas na Cakto; o acesso é atualizado após a confirmação do estorno. No cartão, o estorno aparece na fatura. Para assinaturas anteriores, o reembolso da primeira mensalidade também cancela novas cobranças."],
    ["5. Cancelamento e direitos anteriores", "A assinatura pode ser cancelada em Minha licença a qualquer momento. O acesso continua até o fim do período pago e não há novas cobranças. Compras anuais anteriores continuam com os direitos informados na data da compra."],
    ["6. Contestação", "Se você contestar a cobrança no banco ou no cartão, o acesso pode ficar em análise até a decisão. Antes disso, fale com a gente: resolvemos mais rápido."],
    ["7. Contato", `Dúvidas sobre cobrança: ${contact()}. Vendedor: ${who()}.`],
  ] },
};

export function LegalPage({ slug }) {
  const doc = legal[slug];
  return <Shell eyebrow="Documento" title={doc.title}>
    <p className="muted small">Atualizado em {UPDATED}.</p>
    <div className="legal-text">{doc.sections().map(([h, p]) => <section key={h}><h2>{h}</h2><p>{p}</p></section>)}</div>
    <Link className="link" to="/">← Voltar ao início</Link>
  </Shell>;
}

export function NotFound({ inApp = false }) {
  const body = <div className="empty"><h3>Página não encontrada.</h3><p>O endereço não existe nesta versão.</p><Link className="btn btn-secondary btn-sm" to={inApp ? "/app" : "/"}>Voltar</Link></div>;
  return inApp ? <div className="page">{body}</div> : <Shell title="Página não encontrada">{body}</Shell>;
}
