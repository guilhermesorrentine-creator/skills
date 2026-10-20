# Design system — Biblioteca Total

## Direção

Biblioteca técnica com linguagem de instrumento de bancada e arcade discreto. O catálogo e a busca são o foco; pixel art e Anatomy explicam a identidade sem competir com as tarefas.

## Tokens

- Fundo: `#0B0C0F`; superfície: `#14161B`; superfície elevada: `#191B21`.
- Texto principal: `#EEE7D9`; texto secundário: `#AAA69D`.
- Acentos: coral `#E7795C`, dourado `#E7B65D`, verde `#899B63`, azul `#8AACC3`.
- Borda: `#383B42`; escala espacial baseada em 4 px.
- Leitura em sans-serif do sistema; rótulos, caminhos e comandos em `Consolas`/monospace.

## Componentes e uso

- Busca destacada no hero, com largura confortável e foco visível.
- Chips de intenção e categoria; filtros combináveis por categoria e repositório.
- Fichas de skill mostram origem, caminho, razão de correspondência e ações.
- Coral marca ação e seleção; dourado indica referência ou estado, nunca o único sinal.
- Personagens originais mantêm pixels nítidos e acompanham conteúdo explicativo.
- Painéis de detalhe usam diálogo semântico, Escape, foco gerenciado e layout adaptável.

## Movimento e acessibilidade

- Preferir `transform` e `opacity`, com duração curta para feedback.
- Respeitar `prefers-reduced-motion`; toda ação permanece utilizável sem animação.
- Alvos de toque têm ao menos 40 px, controles possuem rótulos e `:focus-visible` é visível.
- Em celular, usar uma coluna e filtros que possam quebrar linha sem rolagem horizontal.

## Conteúdo e confiança

Metadados vêm do catálogo. Não inferir instalação, suporte de agente, qualidade, requisitos ou limitações. Descrições são texto simples. O conteúdo integral é aberto na origem quando não está disponível localmente.
