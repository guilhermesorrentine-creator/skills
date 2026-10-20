# Biblioteca Total 3.0

Guia navegável para 37 repositórios e 2.281 Agent Skills em quatro áreas. A página é estática, responsiva e não usa backend. O catálogo publicado remove caminhos locais; os textos das skills são renderizados como texto simples.

## Executar localmente

Requer Node.js 20.19+ ou 22.12+.

```sh
npm install
npm run dev
```

Para validar as regras do catálogo e gerar a publicação estática:

```sh
npm run build
```

O resultado fica em `dist/`.

## Editar pelo celular

O projeto completo está neste repositório. No celular, abra `guilhermesorrentine-creator/skills` pelo app ou navegador do GitHub, navegue até o arquivo, toque em editar e salve a alteração como commit. O catálogo está em `src/data/catalog.json`; a busca e ranking em `src/lib/search.js`; persistência local e URL em `src/lib/local-state.js`; os componentes ficam em `src/components/` (hero 3D, categorias, catálogo, páginas de detalhe); o design está em `DESIGN.md` e `src/styles/`; os personagens pixel-art são SVG em `src/components/categories/CyberpunkCharacter.jsx`; os destaques editoriais ficam em `src/lib/featured.js`.

Para uma experiência melhor, conecte este repositório à Vercel uma vez. Escolha Vite, mantenha a raiz do projeto como `/`, comando de build `npm run build` e diretório de saída `dist`. Depois disso, cada commit no ramo principal atualiza a página publicada; commits em outros ramos podem gerar previews. O endereço público é criado pela Vercel na configuração da conta.

## Importar uma atualização do catálogo

O único catálogo fonte é `src/data/catalog.json`. `public/data/catalog.json` é uma cópia derivada, validada e gerada antes de `dev` e `build`; não a edite diretamente. Para atualizá-la à mão, use `npm run sync:catalog`.

Para importar uma atualização a partir de um catálogo local, use:

```sh
node scripts/import-catalog.mjs --input <caminho-do-catalogo.json>
```

O importador remove o campo `local_dir`, substitui caminhos de usuário/rede e interrompe a publicação se detectar padrões de credenciais conhecidos. A sincronização também valida nomes, IDs, categorias, caminhos, links e contagens. Revise as alterações e a origem antes de fazer commit.

## Fontes e direção visual

- O escopo, áreas e critérios estão em [`docs/escopo-do-site.md`](docs/escopo-do-site.md).
- A paleta, tipografia, componentes e comportamento responsivo estão em [`docs/guia-visual.md`](docs/guia-visual.md).
- O sistema visual atualizado está em [`DESIGN.md`](DESIGN.md).
- A ilustração Anatomy está descrita em [`docs/ilustracao-anatomy.md`](docs/ilustracao-anatomy.md).
- A invocação e a licença de `/megacave` estão em [`docs/megacave.md`](docs/megacave.md).
- As práticas enxutas do agente estão em [`AGENTS.md`](AGENTS.md).
- O catálogo de 177 skills científicas em `ciencia/scientific-agent-skills/docs/skills.md` foi usado como referência suplementar para a área de Ciência.
- A página adapta padrões de organização e interação da referência visual fornecida, sem reutilizar marca, textos ou personagens de terceiros.

## Segurança e privacidade

Não adicione tokens, arquivos `.env`, caminhos pessoais, cópias privadas de repositórios ou dados de conta. O site usa somente arquivos estáticos e dependências declaradas em `package.json`. Verifique `git diff` antes de publicar mudanças feitas pelo celular.
