import { useEffect, useRef, useState } from "react";
import { apiFetch, authActions } from "../lib/auth.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { PlanCard, usePlans } from "../components/commerce/PlansSection.jsx";

const dateLabel = (value) => (value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Não informado");

function Shell({ title, tag, children }) {
  return <main id="conteudo" className="view account-view">
    <div className="wrap account-wrap">
      <nav className="account-nav" aria-label="Conta">
        <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">BT</span><span className="brand-name">BIBLIOTECA<b>_TOTAL</b></span></Link>
        <span className="account-nav-links"><Link to="/app">Biblioteca</Link><Link to="/minha-assinatura">Minha assinatura</Link>
          <button type="button" className="text-link" onClick={async () => { await authActions.signOut(); navigate("/"); }}>Sair</button></span>
      </nav>
      <p className="sys-tag">{tag}</p>
      <h1 className="account-title">{title}</h1>
      {children}
    </div>
  </main>;
}

// Retorno do Asaas: nunca libera acesso pela URL; consulta o servidor até a confirmação chegar.
export function CheckoutReturnPage({ account, reload }) {
  const result = new URLSearchParams(location.search).get("resultado");
  const [tries, setTries] = useState(0);
  const timer = useRef(0);
  const confirmed = account?.access;
  useEffect(() => {
    if (confirmed || result !== "sucesso" || tries >= 30) return;
    timer.current = window.setTimeout(async () => { await reload(tries % 5 === 4); setTries((value) => value + 1); }, 4000);
    return () => window.clearTimeout(timer.current);
  }, [confirmed, result, tries, reload]);

  return <Shell title={confirmed ? "Assinatura confirmada" : result === "sucesso" ? "Aguardando confirmação do pagamento" : result === "expirado" ? "O link de pagamento expirou" : "Pagamento não concluído"} tag="CHECKOUT://RETORNO">
    <div className="term-panel"><div className="term-body">
      {confirmed && <><p>O Asaas confirmou o pagamento e sua conta já tem acesso.</p><button type="button" className="button button-primary" onClick={() => navigate("/app")}>Abrir biblioteca</button></>}
      {!confirmed && result === "sucesso" && <>
        <p className="waiting-line"><span className="status-dot"/> Recebemos seu retorno do ambiente de pagamento. O acesso é liberado somente quando o Asaas confirma a cobrança, o que pode levar alguns instantes.</p>
        {tries >= 30 && <p>A confirmação ainda não chegou. Você pode fechar esta página: o acesso será liberado automaticamente. Acompanhe em “Minha assinatura”.</p>}
        <button type="button" className="button button-ghost" onClick={() => reload(true)}>Verificar agora</button>
      </>}
      {!confirmed && result !== "sucesso" && <><p>Nenhuma cobrança foi confirmada. Você pode escolher um plano novamente quando quiser.</p><button type="button" className="button button-primary" onClick={() => navigate("/minha-assinatura")}>Ver planos</button></>}
    </div></div>
  </Shell>;
}

export function AccountPage({ account, reload, error }) {
  const { plans } = usePlans();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reason = new URLSearchParams(location.search).get("motivo");
  const sub = account?.subscription;
  const cancel = async () => {
    if (!window.confirm("Solicitar o cancelamento da assinatura? O acesso continua até o fim do período já pago, conforme a política de assinatura.")) return;
    setBusy(true); setMessage("");
    try { await apiFetch("/api/billing/cancel", { method: "POST" }); await reload(); setMessage("Cancelamento registrado."); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  if (!account) return <Shell title="Minha assinatura" tag="ACCOUNT://STATUS">{error ? <p className="form-error" role="alert">Não foi possível verificar a conta: {error.message}</p> : <p className="muted">Carregando…</p>}</Shell>;
  return <Shell title="Minha assinatura" tag="ACCOUNT://STATUS">
    {reason === "sem-acesso" && !account.access && <p className="notice-line" role="status">Sua conta ainda não tem acesso ativo à biblioteca completa.</p>}
    <div className="account-grid">
      <section className="term-panel" aria-labelledby="acc-status"><header className="term-head"><span className="term-dots" aria-hidden="true"><i/><i/><i/></span><h2 id="acc-status">Situação</h2></header>
        <div className="term-body">
          <dl className="source-list">
            <div><dt>Conta</dt><dd>{account.email}</dd></div>
            <div><dt>Acesso</dt><dd className={account.access ? "ok" : "warn"}>{account.access ? (account.accessReason === "grant" ? "Liberado por concessão administrativa" : "Liberado") : "Sem acesso ativo"}</dd></div>
            <div><dt>Plano</dt><dd>{account.plan?.name || "Nenhum"}</dd></div>
            <div><dt>Assinatura</dt><dd>{sub?.statusLabel || "Nenhuma assinatura"}</dd></div>
            {sub && <div><dt>Acesso pago até</dt><dd>{dateLabel(sub.currentPeriodEnd)}</dd></div>}
            {sub?.nextDueDate && sub.status !== "canceled" && <div><dt>Próxima cobrança</dt><dd>{dateLabel(sub.nextDueDate)}</dd></div>}
          </dl>
          <div className="source-links">
            {account.access && <button type="button" className="button button-primary" onClick={() => navigate("/app")}>Abrir biblioteca</button>}
            {account.latestInvoiceUrl && <a className="text-link" href={account.latestInvoiceUrl} target="_blank" rel="noopener noreferrer">Fatura mais recente ↗</a>}
            {account.pendingCheckout && <a className="text-link" href={account.pendingCheckout.url}>Continuar pagamento ↗</a>}
            <button type="button" className="button button-ghost" onClick={() => reload(true)}>Atualizar situação</button>
            {sub?.cancelable && <button type="button" className="button button-ghost danger" onClick={cancel} disabled={busy}>Solicitar cancelamento</button>}
          </div>
          {message && <p className="form-ok" role="status">{message}</p>}
          <p className="muted small">Regras de cancelamento e reembolso: <Link to="/assinatura-e-cancelamento">política de assinatura</Link> (pendente de aprovação).</p>
        </div>
      </section>
      {!account.access || ["past_due", "expired", "suspended"].includes(sub?.status) ? <section aria-labelledby="acc-plans">
        <h2 id="acc-plans" className="account-subtitle">{sub ? "Regularizar ou renovar" : "Escolha um plano"}</h2>
        <div className="plan-grid">{plans.length ? plans.map((plan) => <PlanCard key={plan.code} plan={plan} account={account} featured={plans.length === 1}/>) : <p className="muted">Nenhum plano ativo no momento.</p>}</div>
      </section> : null}
    </div>
  </Shell>;
}

const legal = {
  termos: { title: "Termos de uso", sections: ["Objeto do serviço e descrição da plataforma", "Cadastro e responsabilidades do usuário", "Uso permitido e conteúdo de terceiros (licenças dos repositórios indexados)", "Disponibilidade, alterações e suporte", "Limitação de responsabilidade", "Foro e legislação aplicável"] },
  privacidade: { title: "Política de privacidade", sections: ["Dados coletados (e-mail da conta, dados de assinatura recebidos do Asaas)", "Finalidade e base legal (LGPD)", "Compartilhamento com operadores (Supabase, Asaas, Vercel)", "Armazenamento local no navegador (favoritos e histórico)", "Direitos do titular e canal de contato", "Retenção e exclusão"] },
  "assinatura-e-cancelamento": { title: "Assinatura e cancelamento", sections: ["Planos, valores e periodicidade", "Forma de pagamento e renovação automática", "Liberação e suspensão do acesso", "Cancelamento pelo assinante e efeitos no período pago", "Reembolsos e direito de arrependimento (CDC)", "Contato para cobrança"] },
};

// Documentos jurídicos: estrutura preparada, sem texto fictício. Conteúdo final depende do proprietário.
export function LegalPage({ slug }) {
  const doc = legal[slug];
  return <main id="conteudo" className="view account-view"><div className="wrap account-wrap legal">
    <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">BT</span><span className="brand-name">BIBLIOTECA<b>_TOTAL</b></span></Link>
    <p className="sys-tag">DOC://{slug.toUpperCase()}</p>
    <h1 className="account-title">{doc.title}</h1>
    <p className="notice-line" role="note">Documento pendente de aprovação do proprietário. O texto final ainda não foi redigido e esta página não tem valor jurídico.</p>
    <ol className="legal-outline">{doc.sections.map((item) => <li key={item}>{item}</li>)}</ol>
    <Link className="text-link" to="/">← Voltar ao início</Link>
  </div></main>;
}

export function NotFound() {
  return <main id="conteudo" className="view account-view"><div className="wrap account-wrap">
    <p className="sys-tag">ERR://404</p><h1 className="account-title">Página não encontrada</h1>
    <p className="muted">O endereço não existe nesta versão do site.</p><Link className="button button-primary" to="/">Ir para o início</Link>
  </div></main>;
}
