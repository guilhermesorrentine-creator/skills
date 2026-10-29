# Voxelia 4.0

Plataforma comercial (antes chamada Biblioteca Total) que organiza 37 repositórios e 2.281 Agent Skills em quatro áreas, com guias passo a passo, busca por objetivo e coleções. As chaves internas (`biblioteca-total:*` no navegador, nome do pacote) mantêm o nome antigo para não perder dados já salvos.

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

O projeto completo está neste repositório. No celular, abra `guilhermesorrentine-creator/skills` pelo app ou navegador do GitHub, navegue até o arquivo, toque em editar e salve a alteração como commit. O catálogo está em `src/data/catalog.json`; a busca e ranking em `src/lib/search.js`; persistência local e URL em `src/lib/local-state.js`; as páginas ficam em `src/pages/` (landing, sistema em `src/pages/app/`, administração); o design está em `DESIGN.md` e `src/styles/`; os personagens pixel-art são SVG em `src/components/categories/CyberpunkCharacter.jsx`; os destaques editoriais ficam em `src/lib/featured.js`.

Para uma experiência melhor, conecte este repositório à Vercel uma vez. Escolha Vite, mantenha a raiz do projeto como `/`, comando de build `npm run build` e diretório de saída `dist`. Depois disso, cada commit no ramo principal atualiza a página publicada; commits em outros ramos podem gerar previews. O endereço público é criado pela Vercel na configuração da conta.

## Importar uma atualização do catálogo

O único catálogo fonte é `src/data/catalog.json`. Ele é validado antes de `dev` e `build` (`npm run validate:catalog`) e **não** é publicado em `public/`: assinantes o recebem por `/api/catalog`. A landing usa `public/data/demo.json`, gerado por `scripts/build-demo-data.mjs`.

Para importar uma atualização a partir de um catálogo local, use:

```sh
node scripts/import-catalog.mjs --input <caminho-do-catalogo.json>
```

O importador remove o campo `local_dir`, substitui caminhos de usuário/rede e interrompe a publicação se detectar padrões de credenciais conhecidos. A sincronização também valida nomes, IDs, categorias, caminhos, links e contagens. Revise as alterações e a origem antes de fazer commit.

## Plataforma comercial (4.0)

Landing pública em `/` e sistema em `/app` para quem tem acesso. Contas no Supabase Auth; a nova oferta é o acervo vitalício por R$ 39,90 em pagamento único pela Cakto, sem conexão automática com IA. Compras e assinaturas anteriores pelo Asaas preservam seus direitos. A integração Cakto está preparada localmente e documentada em [`docs/cakto-vitalicio.md`](docs/cakto-vitalicio.md); a assinatura anterior está descrita em [`docs/assinatura-mensal.md`](docs/assinatura-mensal.md). Além das Agent Skills, a plataforma suporta subagentes, workflows, ferramentas, referências e guias cadastrados em `/admin`, coleções pessoais com link de visualização, favoritos e histórico na conta.

Backend em `server/`, publicado por uma única Vercel Function (`api/index.js` + rewrite de `/api/*`); migrações em `supabase/migrations/`. Arquitetura, modelo comercial, webhooks, administração, homologação e recuperação: [`docs/comercial-asaas.md`](docs/comercial-asaas.md). Variáveis: [`.env.example`](.env.example).

No menu do sistema, **Conectar minha IA** abre `/app/conectar-ia`: quem tem Pro ativo gera o link pessoal; quem precisa de upgrade ou renovação vê a opção em Minha licença. O tutorial distingue Claude de ChatGPT: a criação de conexão MCP personalizada no ChatGPT exige um workspace Business ou Enterprise/Edu com permissão e ocorre na web, não no aplicativo de computador.

Sem Supabase, é possível ver o sistema localmente com `BT_DEV_BYPASS=1` em `.env.development.local` (ignorado na Vercel e em produção).

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
