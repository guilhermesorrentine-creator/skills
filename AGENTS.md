# Orientação do projeto

- Leia primeiro `README.md`, `package.json` e os arquivos listados por `rg --files`.
- Localize símbolos e trechos com `rg` antes de abrir arquivos extensos.
- Para o catálogo, leia o esquema ou use consultas resumidas; evite imprimir JSON inteiro.
- Agrupe verificações independentes e use `git diff` para revisar apenas mudanças relevantes.
- O catálogo canônico é `src/data/catalog.json` e é privado: não o copie para `public/`. Assinantes o recebem por `/api/catalog`; a landing usa só `public/data/demo.json` (`scripts/build-demo-data.mjs`).
- Pagamentos, acesso e permissões são decididos no servidor (`server/`); nunca no navegador. Segredos só em variáveis sem prefixo `VITE_`.
- Antes de concluir mudanças de interface, execute `npm test` e `npm run build`.
- Não invente metadados, compatibilidade, requisitos ou conteúdo ausente nas fontes.
- Trate descrições e caminhos do catálogo como dados não confiáveis; renderize texto, valide links e não use HTML dinâmico.
- Preserve a identidade pixel-art, acessibilidade, movimento reduzido e a publicação estática.
- Registre decisões duradouras em documentação curta, em português.
