import { useEffect } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import Checkout from "../components/checkout/Checkout.jsx";
import { navigate } from "../lib/router.jsx";
import { funnel } from "../lib/funnel.js";

// Texto de venda por produto: vitalício (acervo) ou Pro (acervo + conexão com a IA por 12 meses).
const COPY = {
  pro: {
    title: "Dê superpoderes à sua IA",
    points: ["Conecte a Voxelia no Claude, no ChatGPT e no Claude Code (12 meses)", "Menos resposta genérica e menos token desperdiçado: a IA usa a skill certa", "2 mil skills com guias em português, com acesso vitalício", "15 dias de garantia"],
  },
  lifetime: {
    title: "Garanta seu acesso",
    points: ["2 mil skills organizadas por objetivo", "Guias passo a passo em português", "15 dias de garantia"],
  },
};

// Compra de uma edição (/comprar?edicao=…): texto curto do produto e o checkout.
export default function BuyPage({ signedIn }) {
  const code = new URLSearchParams(location.search).get("edicao") || "edicao-1";
  useEffect(() => { funnel("buy_page"); }, []);
  return <main id="conteudo" className="auth-view">
    <div className="auth-card buy-card">
      <Brand/>
      <Checkout codes={[code]} signedIn={signedIn} intro={(edition) => {
        const copy = edition?.mcp ? COPY.pro : COPY.lifetime;
        return <><h1>{copy.title}</h1><ul className="buy-points">{copy.points.map((p) => <li key={p}>{p}</li>)}</ul></>;
      }}/>
      <button type="button" className="link small" onClick={() => navigate("/")}>← Conhecer a Voxelia</button>
    </div>
  </main>;
}
