import { useEffect } from "react";
import { setConsent, useConsent } from "../../lib/consent.js";
import { pageView, pixelConfigured } from "../../lib/meta-pixel.js";
import { Link, usePathname } from "../../lib/router.jsx";

// Aviso de cookies (LGPD): aceitar e recusar com o mesmo peso; sem resposta, nada é carregado.
// Sem Pixel configurado não há cookie de marketing, então não há aviso.
// Também registra a visualização de página no Pixel a cada troca de rota, se houver consentimento.
export default function ConsentBanner() {
  const consent = useConsent();
  const path = usePathname();
  useEffect(() => { if (consent === "granted") pageView(); }, [consent, path]);
  if (consent || !pixelConfigured) return null;
  // Na /oferta (tráfego pago) o aviso é uma faixa curta, para não cobrir o formulário de compra no celular.
  if (path === "/oferta") return <section className="consent consent-compact" role="region" aria-label="Aviso de cookies">
    <p>Podemos usar cookies do Meta para medir de qual anúncio você veio? <Link to="/privacidade" className="link">Saiba mais</Link></p>
    <div className="consent-actions">
      <button type="button" className="btn btn-secondary" onClick={() => setConsent("denied")}>Recusar</button>
      <button type="button" className="btn btn-secondary" onClick={() => setConsent("granted")}>Aceitar</button>
    </div>
  </section>;
  return <section className="consent" role="region" aria-label="Aviso de cookies">
    <div className="consent-copy">
      <strong>Podemos medir de qual anúncio você veio?</strong>
      <p>Com a sua permissão, usamos cookies do Meta para saber quais anúncios trazem quem se interessa pela Voxelia e gastar menos com os que não funcionam. Se recusar, o site funciona do mesmo jeito. <Link to="/privacidade" className="link">Saiba mais</Link>.</p>
    </div>
    <div className="consent-actions">
      <button type="button" className="btn btn-secondary" onClick={() => setConsent("denied")}>Recusar</button>
      <button type="button" className="btn btn-secondary" onClick={() => setConsent("granted")}>Aceitar</button>
    </div>
  </section>;
}
