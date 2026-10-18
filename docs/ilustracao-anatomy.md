# Ilustração Anatomy — seletor de skills

**Tamanho:** Figure. Uma máquina curta, com uma guia seletora que percorre quatro gavetas; o deslocamento representa a troca da área ativa no catálogo.

## Conceito

Um instrumento de bancada para selecionar um índice: base pesada, corpo de leitura, dois trilhos, carrinho, régua, gavetas de cartões, janela de leitura e um botão de seleção. O carrinho indica a área que a pessoa escolheu; a legenda fora do desenho informa a quantidade real de skills carregadas naquela área.

## Lista de peças

- Base: sombra de contato, quatro pés, quatro anéis de fixação, quatro parafusos, placa inferior, borda frontal, face lateral, placa superior, chanfro e canal de perímetro.
- Estrutura: coluna esquerda, coluna direita, travessa superior, travessa inferior, duas guias, dois batentes, dois suportes de trilho e régua graduada.
- Mecanismo: carrinho, placa frontal do carrinho, dois mancais, dois retentores, indicador, quatro lâminas de cartão, quatro recortes de cartão e oito linhas impressas.
- Leitura: moldura da janela, vidro, visor, trilho de estado, três segmentos de status, linha de valor e marca de área ativa.
- Controles: eixo, botão de seleção, anel do botão, seis ranhuras do botão, pino de índice e dois pontos de fixação do painel.
- Cabos e apoio: dois passa-fios, terminais e dois ressaltos de apoio.

O desenho tem mais de 40 partes SVG ordenadas por profundidade. Elementos repetidos permanecem em suas peças físicas (régua, parafusos, cartões); não há linhas soltas nem rótulos externos flutuantes.

## Interação

Os botões das quatro áreas controlam a mesma posição do carrinho. O visor e a legenda adjacente informam a área selecionada e sua contagem de skills. A interação funciona por toque, teclado e foco visível. A animação usa apenas transformações e respeita `prefers-reduced-motion`; com movimento reduzido, o carrinho muda diretamente de posição.
