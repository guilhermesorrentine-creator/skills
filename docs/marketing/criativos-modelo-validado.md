# Criativos no modelo validado (prontos para teste)

Base: o modelo "Claude [Profissão] PRO… não é pack de prompts", com ~130 anúncios ativos (ver `concorrentes-meta-ads.md`). Adaptado à verdade da Voxelia: ferramentas abertas com fonte creditada, guias em português, garantia de 15 dias. Nada de depoimento, número de clientes ou escassez inventados.

Vídeos (9:16, narração Alex B, legendas): `marketing/criativos/reel-kit-<profissão>.mp4`. Cada um tem duas versões de final: **orgânico** ("toque no link da bio") e **anúncio** (o botão "Saiba mais" do próprio anúncio leva a `/kit/<profissão>`). O vídeo atual serve aos dois; no anúncio, o texto principal reforça o botão.

Destino de cada anúncio: `https://skills-five-snowy.vercel.app/kit/<profissão>?utm_source=meta&utm_medium=paid&utm_campaign=kit-<profissão>`

## Criadores de conteúdo

**Texto principal**
```
Domingo, 23h. Ideia no celular, roteiro pela metade, legenda sem gancho e o vídeo de amanhã nem gravado.

A Voxelia não é pack de prompts: é a equipe de IA de um criador de conteúdo, dentro do Claude.
✓ 3 ganchos com nota antes de você gravar
✓ Roteiro, legenda e carrossel prontos
✓ Vídeo curto montado a partir de uma ideia
✓ Voz, edição e animações

312 skills de criação + acesso às 2.281 da Voxelia, com passo a passo em português.
Pagamento único · acesso imediato · 15 dias de garantia.
```
**Título:** Sua equipe de IA para criar conteúdo · **Descrição:** Pagamento único. Garantia de 15 dias. · **Botão:** Saiba mais

## Empreendedores

**Texto principal**
```
Você é o marketing, o vendedor e o financeiro do seu negócio. Tudo ao mesmo tempo.

A Voxelia não é pack de prompts: são especialistas de IA que trabalham pra você no Claude.
✓ Teste a ideia com 100 compradores virtuais antes de gastar
✓ Margem real e ponto de equilíbrio calculados
✓ Lista de clientes direto do Google Maps
✓ Um vendedor de IA fazendo a prospecção

Ferramentas abertas, explicadas passo a passo em português.
Pagamento único · acesso imediato · 15 dias de garantia.
```
**Título:** Os especialistas que o seu negócio não pode contratar · **Botão:** Saiba mais

## Programadores

**Texto principal**
```
O agente esqueceu o contexto de novo e o PR voltou pela terceira vez?

A Voxelia não é pack de prompts: é o Claude Code configurado como um time sênior.
✓ Metodologia completa para agentes de código
✓ Memória entre sessões
✓ Auditoria de segurança
✓ Menos tokens por sessão

1.769 skills de software com fonte creditada e guia em português.
Pagamento único · acesso imediato · 15 dias de garantia.
```
**Título:** Claude Code trabalhando como um time · **Botão:** Saiba mais

## Pesquisadores e estudantes

**Texto principal**
```
Madrugada de prazo, vinte PDFs abertos e a revisão de literatura no zero?

A Voxelia não é pack de prompts: é um assistente de pesquisa com 177 skills científicas.
✓ Revisão de literatura com cada afirmação ligada à fonte
✓ Análise de dados e figuras prontas para publicação
✓ Genômica, química e ensaios clínicos

Para pesquisa, não para decisão clínica. Guia passo a passo em português.
Pagamento único · acesso imediato · 15 dias de garantia.
```
**Título:** Seu assistente de pesquisa no Claude · **Botão:** Saiba mais

## Variações de gancho para testar (3 por criativo, mesmo vídeo)

1. **Dor da rotina** (padrão acima).
2. **Quebra de crença:** "Usar só o ChatGPT? Isso até a sua avó faz."
3. **Preço contra perda:** "Quanto custa mais um mês fazendo na mão o que um agente faz em minutos?"

Regra de corte: abaixo de 0,8% de CTR no link depois de R$ 25 gastos, pausar a variação.

## Orgânico: o que muda nos próximos Reels

- **CTA:** "toque no link da bio" (o link de comentário não é clicável). A bio deve apontar para `/links`.
- **Comentário → direct**, quando houver a ferramenta: palavra-chave por Reel (ex.: NEGÓCIO, VIDEO, CLAUDE), com resposta automática levando à página `/r/<repo>` ou `/kit/<profissão>`.
- **Live semanal gratuita** ("imersão de Claude Code hoje às 20h", o modelo mais duradouro do nicho): 40 minutos mostrando 3 ferramentas do acervo instaladas ao vivo, oferta no fim com `/comprar`.
