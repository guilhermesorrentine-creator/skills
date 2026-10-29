import { useEffect } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import Checkout from "../components/checkout/Checkout.jsx";
import { navigate } from "../lib/router.jsx";
import { funnel } from "../lib/funnel.js";

// Compra avulsa do acervo vitalício.
const COPY = {
  lifetime: {
    title: "Garanta seu acesso",
    points: ["2 mil skills organizadas por objetivo", "Guias passo a passo em português", "15 dias de garantia"],
  },
};

// Compra de uma edição (/comprar?edicao=…): texto curto do produto e o checkout.
export default function BuyPage({ signedIn }) {
  const code = new URLSearchParams(location.search).get("edicao") || "edicao-1";
  useEffect(() => { funnel("buy_page"); }, []);
  useEffect(() => {
    if (code === "edicao-1") location.replace("/oferta?comprar=1");
  }, [code]);
  if (code === "edicao-1") return null;
  return <main id="conteudo" className="auth-view">
    <div className="auth-card buy-card">
      <Brand/>
      <Checkout codes={[code]} signedIn={signedIn} intro={(edition) => {
        const copy = COPY.lifetime;
        return <><h1>{copy.title}</h1><ul className="buy-points">{copy.points.map((p) => <li key={p}>{p}</li>)}</ul></>;
      }}/>
      <button type="button" className="link small" onClick={() => navigate("/")}>← Conhecer a Voxelia</button>
    </div>
  </main>;
}
