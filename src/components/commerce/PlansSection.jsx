import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../../lib/motion-tokens.js";
import { cycleLabel, formatPrice, subscribe } from "../../lib/billing-client.js";
import { navigate } from "../../lib/router.jsx";

// Planos vêm do servidor (`/api/billing/plans`); nenhum preço é definido no front-end.
export function usePlans() {
  const [state, setState] = useState({ loading: true, plans: [], error: null });
  useEffect(() => {
    fetch("/api/billing/plans").then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Planos indisponíveis.");
      setState({ loading: false, plans: data.plans || [], error: null });
    }).catch((error) => setState({ loading: false, plans: [], error }));
  }, []);
  return state;
}

export function PlanCard({ plan, account, featured = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = account?.access && account.accessReason !== "grant";
  const onClick = async () => {
    if (active) { navigate("/app"); return; }
    setBusy(true); setError("");
    try { await subscribe(plan.code, { signedIn: Boolean(account) }); }
    catch (cause) { setError(cause.message); setBusy(false); }
  };
  return <article className={`plan-card ${featured ? "is-featured" : ""}`}>
    <p className="sys-tag">PLAN://{plan.code.toUpperCase()}</p>
    <h3>{plan.name}</h3>
    {plan.description && <p className="plan-desc">{plan.description}</p>}
    <p className="plan-price"><b>{formatPrice(plan.priceCents, plan.currency)}</b> <span>{cycleLabel[plan.cycle]}</span></p>
    {plan.features.length > 0 && <ul className="plan-features">{plan.features.map((item) => <li key={item}><span aria-hidden="true">◆</span> {item}</li>)}</ul>}
    {plan.rules && <p className="plan-rules">{plan.rules}</p>}
    <p className="plan-pay">Cobrança recorrente no cartão de crédito, no ambiente seguro do Asaas.</p>
    <button type="button" className="button button-primary" onClick={onClick} disabled={busy} aria-busy={busy}>{active ? "Abrir biblioteca" : busy ? "Abrindo pagamento…" : "Assinar"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </article>;
}

export default function PlansSection({ account }) {
  const reduced = useReducedMotion();
  const { loading, plans, error } = usePlans();
  return <section className="landing-section plans-section" id="planos" aria-labelledby="planos-title">
    <div className="wrap">
      <div className="section-head">
        <p className="sys-tag">PRICING://PLANOS</p>
        <h2 id="planos-title">Escolha seu acesso</h2>
        <p className="section-lead">Valores e condições definidos pela administração da Biblioteca Total.</p>
      </div>
      <motion.div className="plan-grid" data-count={plans.length || 1} initial={reduced ? false : { opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth }}>
        {loading && <div className="plan-card plan-skeleton" aria-hidden="true"/>}
        {!loading && plans.map((plan, index) => <PlanCard key={plan.code} plan={plan} account={account} featured={plans.length === 1 || index === 0}/>)}
        {!loading && !plans.length && <article className="plan-card plan-empty">
          <p className="sys-tag">PRICING://EM_DEFINICAO</p>
          <h3>Planos em definição</h3>
          <p className="plan-desc">{error ? "A contratação ainda não está disponível neste ambiente." : "Nenhum plano está ativo no momento."} Você já pode criar sua conta e experimentar a demonstração.</p>
          <button type="button" className="button button-ghost" onClick={() => navigate("/cadastro")}>Criar conta</button>
        </article>}
      </motion.div>
    </div>
  </section>;
}
