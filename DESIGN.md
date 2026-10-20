# Design system — Biblioteca Total 4.0

Formato DESIGN.md: visão geral, cores, tipografia, layout, componentes, movimento, responsividade e regras.

## Visão geral

Minimalista, clara, amigável e tecnológica. A personalidade vem dos quatro personagens pixel-art, das demonstrações interativas e das microinterações, não de brilhos ou bordas neon. A landing tem mais movimento; o sistema interno prioriza produtividade.

## Cores (`src/styles/tokens.css`)

| Papel | Token | Valor |
|---|---|---|
| Fundo | `--bg` | `#F7F6F2` |
| Fundo secundário | `--bg-soft` | `#ECE5FA` |
| Principal | `--primary` / `--primary-hover` / `--primary-soft` | `#7445C7` / `#6136AE` / `#EFE8FB` |
| Texto | `--text` / `--text-2` / `--text-3` | `#23212B` / `#55525F` / `#6E6A78` |
| Superfícies | `--surface` | `#FFFFFF` |
| Linhas | `--line` / `--line-strong` | `#E4E0D8` / `#D2CCC2` |
| Áreas (tinta/fundo) | `--tint-*` / `--ink-*` | Software lilás, Empreendedorismo pêssego, Conteúdo rosa, Ciência verde |

As cores de área sempre acompanham um rótulo textual e não competem com o roxo. Texto secundário mantém contraste AA sobre branco e sobre `--bg`.

## Tipografia

- **Plus Jakarta Sans** (títulos, `--font-display`), com tracking negativo nos títulos grandes.
- **Inter** (interface e leitura, `--font-sans`).
- **JetBrains Mono** só para pequenos indicadores técnicos (fontes, caminhos, contadores).
- Todas auto-hospedadas via `@fontsource-variable/*` (CSP `font-src 'self'`).

## Layout

Largura máxima 1200 px, gutter `clamp(16px, 4vw, 40px)`, escala de 4 px. Landing: hero centrado com a cena interativa abaixo do texto; seções com cabeçalho (eyebrow + título) e grade de cards. Sistema: menu lateral de 240 px + barra superior com busca.

## Componentes

- **Botões** arredondados: primário roxo, secundário branco com borda, ghost.
- **Card de resultado** (`.r-card`): branco, borda fina, sombra suave; nome, resumo, tipo, área, fonte e ações rápidas (favoritar, salvar em coleção, comparar).
- **Card de destaque** (`.f-card`): fundo pastel da área, para coleções e seleções editoriais.
- **Hero** (`pages/landing/HeroScene.jsx`): janela central com a interface real (busca, abas de categoria, cards com skills do `demo.json`) e os quatro personagens ao redor. Hover/foco = prévia; clique/toque = fixa a categoria; troca imediata, sem esperar animações.
- **Personagens** (`components/categories/CyberpunkCharacter.jsx` + `styles/characters.css`): sprites SVG em grade de pixels, poses por quadros (`steps()`) e objetos próprios — terminal digitado, gráfico com barras, câmera com REC e foco, molécula girando com partículas. Estados: repouso, interação, selecionado e retorno.
- **Página do recurso**: cabeçalho com ações; seções aparecem só quando há conteúdo (conteúdo/guia com sumário, instruções copiáveis, como utilizar, relacionados).
- **Markdown seguro** (`lib/markdown-parse.js`): títulos, listas, citações, código e links HTTPS; nunca HTML bruto.

## Movimento (`src/lib/motion-tokens.js`)

- Entradas curtas (0,36 s) que desaceleram; títulos e cards revelados com `whileInView`.
- Parallax sutil só em elementos decorativos do hero (`useScroll` + `useTransform`).
- Mudanças de estado com `layoutId` e `AnimatePresence`; nada de scroll hijacking.
- `prefers-reduced-motion`: animações contínuas desligadas, poses de ação estáticas, conteúdo intacto.

## Responsividade

Testado em 360, 390, 768, 1024 e 1440 px sem rolagem horizontal. ≤1080 px: menu da landing vira painel; ≤960 px: menu lateral do sistema vira gaveta; ≤900 px: personagens em duas colunas acima e abaixo da janela.

## Regras

- Fazer: dados reais; rótulos em ícones; foco visível; estados vazios que orientam a ação.
- Não fazer: depoimentos, contadores de urgência, preços não aprovados, instruções genéricas apresentadas como documentação oficial, brilho neon.
