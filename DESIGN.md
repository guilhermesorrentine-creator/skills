# Design system — Biblioteca Total 4.0 (Cyberpunk Holographic Experience)

Estrutura no formato DESIGN.md (Stitch / awesome-design-md): visão geral, cores, tipografia, layout, profundidade, formas, componentes, movimento, responsividade e regras.

## Visão geral

Biblioteca digital de ficção científica: terminal futurista + SaaS premium, iluminada em roxo elétrico e rosa neon. O elemento-assinatura é a **biblioteca holográfica 3D** do hero; o resto da página é mais quieto para que ela seja o único "momento" (uma coisa acesa por vez). Catálogo e busca continuam sendo a tarefa principal: o visitante pesquisa sem esperar animação.

## Cores (`src/styles/tokens.css`)

| Papel | Token | Valor |
|---|---|---|
| Fundo | `--bg-primary` / `--bg-secondary` / `--bg-tertiary` | `#090612` / `#110A19` / `#1A1028` |
| Superfície | `--surface-primary` / `--surface-elevated` / `--surface-holographic` | `#1B1129` / `#281638` / `rgba(41,19,58,.72)` |
| Acento | `--neon-purple` / `--neon-purple-light` | `#D94CF5` / `#E88DFF` |
| Acento | `--neon-pink` / `--neon-pink-strong` | `#FF7CB9` / `#FF4FA5` |
| Texto | `--text-primary` / `--text-secondary` / `--text-muted` | `#FFF0FB` / `#D1BADF` / `#A48EB5` |
| Borda | `--border-default` / `--border-strong` / `--border-active` | roxo a 24% / 42% / 85% |
| Categoria | `--cat-software` / `--cat-empreendedorismo` / `--cat-conteudo` / `--cat-ciencia` | `#B98CFF` / `#FF7CB9` / `#FF9DE0` / `#7EF0FF` |

- Rosa = ação, foco e seleção; roxo = estrutura luminosa. Dourado/coral da v2 foram removidos.
- `[data-category]` define `--cat`; a cor de categoria sempre acompanha um rótulo textual.
- Glow só em hover, foco, seleção e no hero; superfícies em repouso não brilham.

## Tipografia

- **JetBrains Mono Variable** (`--font-mono`): títulos, rótulos, botões, números, caminhos e comandos.
- **Inter Variable** (`--font-sans`): parágrafos e descrições longas.
- Fontes auto-hospedadas via `@fontsource-variable/*` (a CSP permite apenas `font-src 'self'`).
- Etiquetas de sistema (`[ SYSTEM ONLINE ]`, `CATEGORY://SOFTWARE`, `SEARCH_PROTOCOL://…`) são decorativas, curtas, em 10–11 px; nunca substituem um rótulo acessível.

## Layout

- Largura máxima `--page-width: 1240px`; gutter `clamp(16px, 4vw, 40px)`; escala de 4 px (`--space-*`).
- Home: hero (texto + busca à esquerda, cena 3D à direita) → categorias → catálogo (destaques + console + mosaico) → repositórios → como usar (passos, prompt, Anatomy) → rodapé.
- Página de skill/repositório: rota por hash, grade 1.6fr + 1fr com painéis de terminal.

## Profundidade e superfícies

Três camadas de fundo (`AuroraBackground`): ambiente em gradiente, auroras desfocadas com deriva lenta, grade mascarada + 18 partículas (6 no celular, nenhuma com movimento reduzido). Apenas CSS com `transform`/`opacity`, `contain: strict`. Cartões usam gradiente de borda (`--gradient-edge`), sombra profunda e reflexo que segue o cursor via variáveis `--mx/--my` escritas direto no elemento.

## Formas

Raios `--radius-sm 8` / `--radius-md 14` / `--radius-lg 22` / `--radius-pill`. Alvos de toque ≥ 40 px.

## Componentes

- **Hero 3D** (`hero/FloatingSkillLibrary.jsx`): CSS 3D com perspectiva real; 12 skills reais (3 por área, `pickHeroSkills`) em 3 planos de profundidade (`SLOTS`). Inclinação pelo cursor com `useSpring` (sem re-render), flutuação CSS, reorganização animada ao escolher categoria ou buscar (resultados vão para a frente, demais esmaecem). Carregado em chunk separado (`lazy`), pausado fora da tela, modo leve (7 cartões, sem inclinação/flutuação) em telas ≤ 720 px, `hardwareConcurrency ≤ 4` ou `saveData`. Three.js foi descartado: o ganho não justificaria ~150 kB.
- **Personagens** (`categories/CyberpunkCharacter.jsx`): sprites originais em grade de pixels SVG (`shape-rendering: crispEdges`), corpo espelhado + camada de acessório (notebook, holograma de gráfico, câmera, molécula). Estados: repouso (passo de 1 px em `steps`), piscar de luzes, hover (sobe), selecionado (anel ampliado, glow e piscar acelerado).
- **Busca** (`catalog/SearchBox.jsx`): combobox ARIA com sugestões de skills, repositórios, categorias e objetivos; setas, Enter, Esc. **Paleta** (`CommandPalette.jsx`) abre com Ctrl/Cmd + K em qualquer rota.
- **Mosaico** (`catalog/SkillMosaic.jsx`): grade de 4 colunas com padrão determinístico de 16 cartões (`L 2×2`, `W 2×1`, `M 1×2`, `S 1×1`) que preenche 6 linhas sem buracos usando auto-placement comum — a ordem visual é a ordem do DOM e do teclado. 2 colunas ≤ 1100 px, 1 coluna ≤ 600 px. O tamanho segue a posição no ranking: com busca, o melhor resultado é o cartão grande. Carregamento incremental de 48 em 48.
- **Destaques** (`FeaturedSkills.jsx` + `lib/featured.js`): sem busca, IDs editoriais configurados com reserva determinística; com busca, os 5 melhores do ranking. Nunca rotulados como "populares".
- **Página de terminal** (`details/*`): cabeçalho, descrição, finalidade (só o que o catálogo sustenta), prompt copiável, informações ausentes, origem com links validados e skills relacionadas por critérios locais declarados.
- **Navegação** (`layout/FloatingNavbar.jsx`): barra suspensa com blur, indicador ativo animado (`layoutId`), menu compacto ≤ 960 px.
- **Comparação**: bandeja fixa com contador; painel lado a lado no desktop, empilhado no celular.

## Personagens em ação (4.0)

Cada personagem tem uma ação própria por quadros (`steps()`), em grupos SVG do próprio sprite (`src/styles/characters.css`): o hacker recolhe os braços e digita (mãos em dois quadros) com um terminal holográfico de linhas digitadas; a estrategista ergue o braço em aceno e o gráfico surge com barras crescendo e gravata acesa; a criadora ergue a câmera, o REC pisca, a lente focaliza e marcadores de vídeo aparecem; a pesquisadora aponta para a projeção, a molécula gira em três quadros e partículas sobem. Ativação: mouse, foco por teclado ou toque (2,4 s) via `useCharacterActivation`; só o personagem ativo anima. Com movimento reduzido a pose de ação aparece parada.

## Skill Explorer e landing (4.0)

`InteractiveSkillExplorer` substitui a máquina isométrica: painel de aplicativo com categorias (personagem + contagem real), lista de amostra animada com layout e prévia da skill, marcador holográfico com `layoutId`. Na landing, as seções entram com `whileInView`, o hero 3D desloca e esmaece com a rolagem (`useScroll`, sem sequestrar a rolagem), o explorador surge com recorte de terminal e os planos com destaque. Telas de conta e administração usam os mesmos tokens com menos movimento.

## Movimento (`src/lib/motion-tokens.js`)

Regras adaptadas das skills *motionmaxxing* e *Anatomy*:
- Entradas desaceleram (`easing.smooth`), duração base 0.42 s, feedback 0.18 s; sem quique (o spring `bouncy` não é usado).
- Elementos chegam se movendo (translação curta), não crescendo do zero; uma coisa acesa por vez.
- Sequência do hero: etiqueta → título → descrição → busca → contadores → cena 3D, em ≤ 0,9 s; a busca funciona desde o primeiro frame.
- Movimento contínuo para fora da tela (IntersectionObserver) e sob `prefers-reduced-motion` (estado final preservado, sem flutuação, partículas ou layout animation).
- Ponteiro e reflexos escrevem em motion values/variáveis CSS, nunca em estado React por frame.

## Responsividade

Verificado em 390 e 1440 px sem rolagem horizontal (capturas com `anatomy/scripts/capture.mjs`). Pontos de quebra: 1100, 960, 900, 600, 560 px. No celular a busca vem antes da cena 3D, que fica reduzida.

## Regras

- Fazer: dados só do catálogo; texto simples (sem HTML dinâmico); links do GitHub validados por `safeGitHubUrl`; foco visível com `:focus-visible`; rótulos em todos os botões de ícone.
- Não fazer: inventar requisitos, compatibilidade, popularidade ou notas; usar `dangerouslySetInnerHTML`; brilho em todas as superfícies; animações que atrasem a pesquisa.
