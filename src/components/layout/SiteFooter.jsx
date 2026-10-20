export default function SiteFooter({ counts }) {
  return <footer className="site-footer">
    <div className="wrap footer-grid">
      <div>
        <a className="brand" href="#topo"><span className="brand-mark" aria-hidden="true">BT</span><span className="brand-name">BIBLIOTECA<b>_TOTAL</b></span></a>
        <p>Índice estático de Agent Skills com origem verificável. Favoritos e histórico ficam apenas neste navegador.</p>
      </div>
      <dl className="footer-stats">
        <div><dt>Repositórios</dt><dd>{counts.repos}</dd></div>
        <div><dt>Skills</dt><dd>{counts.skills.toLocaleString("pt-BR")}</dd></div>
        <div><dt>Categorias</dt><dd>4</dd></div>
      </dl>
      <div className="footer-links">
        <a href="https://github.com/guilhermesorrentine-creator/skills" target="_blank" rel="noopener noreferrer">Código no GitHub ↗</a>
        <a href="#como-usar">Como usar</a>
        <span className="footer-sys">SYS://BIBLIOTECA_TOTAL v3.0</span>
      </div>
    </div>
  </footer>;
}
