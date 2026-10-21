# Gerador dos Reels por repositório

Cópia de trabalho em `D:\dev\voxelia-reel-explainer` (lá ficam `assets/` com fontes, sprites e trilha).

1. Escreva `reels/<repo>.json`: `repo`, `char` (software, empreendedorismo, conteudo, ciencia), `accent` e as frases (`say`, `show` opcional, `key`, `scene`, `p`).
2. `node gen.mjs reels/<repo>.json` gera a narração (Kokoro, voz Alex B) e `out/<repo>/index.html`.
3. Confira quadros com `npx hyperframes snapshot --timeout 30000` e renderize com `npx hyperframes render -q delivery`.

Cenas disponíveis: hook, varal, conselho, multidao (+), cfo, plano, apps, transform, terminal, fases, flop, ganchos, semana, humanizar, aprovar, orbita, contador, lab, citacoes, grafico, voxelia, cta.
Fatos só do README ou do guia do repositório.
