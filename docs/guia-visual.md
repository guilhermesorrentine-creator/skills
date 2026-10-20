# Guia visual

## Paleta

| Uso | Cor |
|---|---|
| Fundo carvão | `#0B0C0F` |
| Painel escuro | `#14161B` |
| Painel elevado | `#191B21` |
| Texto creme | `#EEE7D9` |
| Texto secundário | `#AAA69D` |
| Coral queimado | `#E7795C` |
| Dourado | `#E7B65D` |
| Verde de estado | `#899B63` |
| Linha | `#383B42` |

## Tipografia e escala

- Títulos, comandos e rótulos: `Consolas`, `Courier New`, monospace.
- Leitura: `Segoe UI`, `Arial`, sans-serif.
- Título responsivo: 2–3.5 rem; título de seção: 1.5 rem; corpo: 1 rem; rótulo: 0.75 rem.
- Manter texto de leitura em creme e descrições em cinza claro com contraste alto.

## Espaço e componentes

- Escala base de 4 px; intervalos comuns de 8, 12, 16, 24 e 32 px.
- Cartões e painéis com borda de 1 px, fundo escuro e acento coral/dourado.
- Comandos em bloco monoespaçado; botão de cópia grande o suficiente para toque.
- Barra de progresso segmentada para indicar as quatro áreas.
- Layout principal com coluna única em celular; sem texto sobre sprites.

## Personagens

- Usar personagens originais entregues como sprite PNG com transparência.
- Aplicar `image-rendering: pixelated`; sem suavização, filtros de desfoque ou distorção.
- Mostrar o elenco em escala consistente, com margens e fundos que não ocultem silhuetas.
- Função e área aparecem em texto, nunca apenas pela cor ou pelo desenho.

## Movimento

- Tokens centralizados em `src/lib/motion-tokens.js`.
- Limitar animação a feedback de controles, mudança de estado e entrada curta de conteúdo.
- Usar `transform`/`opacity`, e desligar movimento decorativo com movimento reduzido.
- Ações continuam funcionais sem animação.
