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
  return <section className="consent" role="region" aria-label="Aviso de cookies">
    <p>Usamos cookies essenciais para o site funcionar e, com a sua permissão, cookies de marketing do Meta para medir nossos anúncios. <Link to="/privacidade" className="link">Saiba mais</Link>.</p>
    <div className="consent-actions">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConsent("denied")}>Recusar</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConsent("granted")}>Aceitar</button>
    </div>
  </section>;
}
