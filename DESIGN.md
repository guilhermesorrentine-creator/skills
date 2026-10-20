# Design system — Biblioteca Total 2.1

## Direção

Um acervo técnico com atmosfera de instrumento luminoso: tipografia editorial, superfícies de grafite azulado, iluminação quente e detalhes de pixel art. A busca permanece a ação principal. A ilustração Anatomy funciona como seletor de áreas; os personagens dão identidade ao hero sem substituir a informação.

## Cor

| Papel | Token | Valor |
|---|---|---|
| Fundo profundo | `--bg` | `#090D14` |
| Superfície | `--surface` | `#111923` |
| Superfície elevada | `--surface-raised` | `#192431` |
| Texto | `--paper` | `#F6F2E9` |
| Texto secundário | `--muted` | `#B7C0C9` |
| Dourado de ação | `--gold` | `#EFBD79` |
| Coral de Software | `--coral` | `#F18B72` |
| Verde de Conteúdo/estado | `--green` | `#95D0AF` |
| Azul de Ciência | `--blue` | `#87BFDF` |
| Linha | `--line` | `#354354` |

Empreendedorismo usa dourado. Categoria usa um acento consistente no tile, badge e card; o texto da categoria acompanha a cor, portanto a informação não depende só dela. Gradientes são discretos e reforçam a hierarquia, sem alterar a legibilidade do catálogo.

## Hierarquia e componentes

- Títulos em fonte de sistema com peso alto, entrelinha compacta e tracking negativo. Leitura em fonte de sistema; caminhos, comandos e pequenos rótulos em monoespaçada.
- Hero com título, busca iluminada, três contadores em superfícies próprias e personagens originais em moldura com grid leve. Sprites mantêm pixels nítidos.
- Toolbar em painel elevado; controles com agrupamento, tamanho de toque e foco visível.
- Cards com borda colorida por categoria, brilho limitado ao canto, descrição legível, caminho em superfície interna e ações separadas por linha. Repositórios apresentam contagem como elemento editorial.
- Detalhes e comparação em painéis elevados com origens e campos documentados. Nenhum metadado é inventado.
- Layout mobile tem uma coluna de cards, busca larga, filtros em duas colunas quando cabem e diálogo em formato de folha a partir da base.

## Movimento

Tokens de duração e easing ficam em `src/lib/motion-tokens.js`; regras visuais em `src/premium.css`. Título, subtítulo, busca, contadores e arte entram em sequência. Um `IntersectionObserver` revela seções e cards ao aparecerem na tela. Hover eleva cards e botões; seleção, cópia e comparação têm feedback curto. O diálogo abre com opacidade e leve deslocamento; o overlay suaviza o fechamento. No Anatomy, cinco posições distintas e as gavetas respondem aos controles do próprio instrumento.

Animações usam `transform` e `opacity`. `prefers-reduced-motion` remove entradas e deslocamentos decorativos, preservando estados e posições corretos. Pesquisa e filtros não dependem de animação para responder.
