import { LANGS, setLang, useT } from "../../i18n/index.js";

// Seletor discreto de idioma: a escolha fica salva e prevalece sobre o idioma do navegador.
export default function LanguageSelect({ className = "" }) {
  const { lang, t } = useT();
  return <label className={`lang-select ${className}`}>
    <span aria-hidden="true">🌐</span><span className="sr-only">{t("lang.label")}</span>
    <select value={lang} onChange={(event) => setLang(event.target.value)}>
      {LANGS.map((item) => <option key={item.id} value={item.id} lang={item.id}>{item.label}</option>)}
    </select>
  </label>;
}
