# Guia visual — Biblioteca Total 2.1

## Composição

Base carvão azulado com superfícies de grafite e profundidade controlada. O dourado orienta a busca e os botões principais; coral, dourado, verde e azul diferenciam as quatro áreas. O hero combina texto editorial e elenco pixelado, com busca em destaque e contadores legíveis. A moldura da arte usa grid e iluminação sutis.

Os valores de cor, tipografia, componentes e movimento estão em [`DESIGN.md`](../DESIGN.md) e `src/premium.css`. `src/styles.css` e `src/library-v2.css` guardam os estilos anteriores; a camada premium é carregada por último para evoluir o visual sem mudar a lógica do catálogo.

## Cards e controles

- Cards de skill: categoria, origem, título, descrição, razão de correspondência, caminho e ações em níveis separados. O acento da categoria aparece no badge e no traço superior.
- Cards de repositório: categoria, número de ordem, contagem em destaque, resumo e guia de origem.
- Toolbar e filtros: superfície elevada, agrupamentos visíveis, áreas de toque e foco de teclado.
- Detalhes: diálogo com rolagem própria, foco gerenciado, contraste alto e ações de copiar e abrir a fonte.
- Anatomy: cinco posições (`Todas` + quatro áreas), controles no cartão, gaveta ativa elevada e leitura textual da seleção.

## Movimento e responsividade

Entradas do hero seguem uma sequência curta. Seções e resultados surgem quando entram no viewport; hover, cópia, favoritos e comparação respondem com elevação, cor ou brilho contido. Usar somente `transform` e `opacity` para deslocamentos. Em movimento reduzido, remover animação decorativa, conservar os estados e manter a navegação.

No celular, priorizar busca, cartões em uma coluna, filtros acessíveis, botões de 40 px ou mais e diálogo que ocupa a base da tela. Evitar rolagem horizontal e texto sobre os personagens.

## Fonte e confiança

O catálogo permanece a fonte de nomes, descrições, contagens e caminhos. Exibir textos como dados e validar links. Não inferir compatibilidade, instalação ou qualidade das skills a partir da aparência.
