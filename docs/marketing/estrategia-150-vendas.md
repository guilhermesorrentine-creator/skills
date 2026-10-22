# Estratégia: 150 vendas em 45 dias (22/10 a 5/12/2026)

Meta: 150 vendas × R$ 97,90 ≈ **R$ 14.685**. São **3,3 vendas por dia**, todos os dias.

## 1. Furos encontrados (do mais grave ao menos grave)

| # | Furo | Efeito | Situação |
|---|---|---|---|
| 1 | **Pagamento em modo de teste.** A Vercel não tem `ASAAS_ALLOW_PRODUCTION=true`, e o código só usa o Asaas real com `ASAAS_ENV=production` **e** essa variável. | **Nenhuma venda real é possível hoje.** | Depende de você: chave de produção do Asaas + 2 variáveis na Vercel (passo a passo na seção 4). |
| 2 | **Cadastro com confirmação de e-mail antes de pagar**, e o Supabase sem SMTP próprio envia **2 e-mails por hora**. | A partir do 3º interessado da hora, a compra trava antes do pagamento. Mesmo com o e-mail chegando, a pessoa sai do site. | **Resolvido no PR #7** (compra sem cadastro: e-mail → Pix → criar senha na própria página). |
| 3 | **Link em comentário e em legenda não é clicável no Instagram.** Os Reels mandam para o "comentário fixado". | Quase todo interessado se perde entre o vídeo e o site. | CTA trocado para "link na bio" nos próximos Reels; página `/links` criada para a bio. Automação de direct (comentário → link) é o próximo nível (seção 3). |
| 4 | **Produto genérico** ("2 mil skills") contra um mercado que vende **por profissão** ("Claude Jurídico PRO", "Claude Civil PRO": ~130 anúncios ativos com o mesmo modelo). | Anúncio genérico converte pior; ninguém se reconhece. | **Resolvido no PR #7**: 4 páginas por profissão (`/kit/criadores`, `/empreendedores`, `/programadores`, `/pesquisadores`). |
| 5 | **Preço no teto do mercado.** Concorrentes: R$ 27 (entrada), R$ 47 (Avora, +500 skills), R$ 67/97 (completo). Nós: R$ 97,90 único. | Em tráfego frio, ticket alto sem prova derruba a conversão. | Decisão sua (seção 2). |
| 6 | **Sinais de confiança faltando**: termos e privacidade marcados como "sem valor jurídico", "Suporte: contato em definição", "Dados legais do vendedor: pendentes". | Quem chega pelo anúncio desconfia no checkout. O Meta também pode reprovar anúncios sem política de reembolso. | Precisa dos dados do vendedor (MEI/CPF) e de um contato de suporte (WhatsApp ou e-mail). |
| 7 | **Pixel e API de Conversões desligados** em produção (`VITE_META_PIXEL_ID`, `META_CAPI_TOKEN` ausentes; migração `20261021190000_meta_conversions.sql` não confirmada). | Quando o tráfego pago começar, o Meta não aprende quem compra. | Ligar antes do primeiro real gasto em anúncio. |
| 8 | **Conta nova no Instagram**: alcance orgânico pequeno nas primeiras semanas. | Orgânico sozinho dificilmente faz 150 vendas em 45 dias. | Ver canais da seção 3. |
| 9 | **Garantia de 15 dias** contra 30 dias do concorrente mais copiado. | Pequena desvantagem de percepção. | Opcional: subir para 30 dias (custo baixo, produto digital). |

## 2. Decisões que só você pode tomar (recomendação primeiro)

1. **Ligar o Asaas em produção** (obrigatório, hoje).
2. **Preço**: recomendo testar duas ofertas nos anúncios, sem mexer no que já foi anunciado:
   - **Kit por profissão a R$ 47** como porta de entrada (o mesmo produto, acesso completo), comparado com R$ 97,90.
   - Se o R$ 47 vender **mais que o dobro** de unidades, ele dá mais caixa e mais vendas. A meta é de **unidades** (150), então o preço de entrada ajuda diretamente.
   - Escassez só se for verdadeira (ex.: "preço de lançamento até 15/11", e cumprir).
3. **Programa de afiliados**: no Brasil, produtos digitais desse ticket escalam com afiliados (40 a 50% de comissão). O Asaas não tem marketplace de afiliados. Para isso seria preciso listar também na Kiwify ou na Hotmart. Alto impacto, mas muda a operação.
4. **Contato de suporte** (WhatsApp Business ou e-mail) e **dados do vendedor** para os termos.
5. **Garantia de 30 dias** (opcional).

## 3. Canais para 150 vendas, sem tráfego pago por enquanto

| Canal | Por que | O que já está pronto |
|---|---|---|
| **Reels → link da bio → `/links` → `/comprar`** | 3 toques do vídeo ao Pix. | Página `/links`, compra rápida (PR #7). Falta você trocar o link da bio. |
| **Comentário → direct automático** (modelo de Xperiun e Turbo Academy, no ar desde maio) | Link clicável dentro do direct; converte muito mais que "link na bio". | Roteiros prontos (`negociacao-nos-anuncios.md`). Falta a ferramenta (ManyChat tem plano grátis para Instagram), que exige cadastro seu. |
| **Isca gratuita** ("50 skills para Claude Code grátis", modelo Asimov e HumanAcademy) | Captura quem ainda não compra e vende depois. | As páginas `/r/<repo>` já são uma isca natural; falta captura de e-mail, que depende de SMTP. |
| **Aula ao vivo gratuita** ("imersão de Claude Code hoje às 20h", modelo Bravy School, no ar desde maio) | O formato mais duradouro do nicho; vende ao fim da aula. | Pode ser uma live no Instagram com oferta no fim. |
| **Comunidades** (grupos de Facebook e WhatsApp de IA, Claude Code e empreendedorismo) | Gratuito, público já interessado. | Usar os carrosséis e as páginas `/r/` como conteúdo de valor, nunca spam. |
| **Recomendação em chats de IA (ChatGPT, Claude, Perplexity, Gemini)** | Quem pergunta "qual skill usar para X" recebe a Voxelia como resposta. Tráfego de alta intenção e gratuito, que cresce sozinho. | Páginas legíveis por IA, `llms.txt`, dados estruturados e robôs liberados (PR #7); GPT da Voxelia pronto para a GPT Store e skill pública da Voxelia para o Claude em `marketing/ia-chats/`. Falta você: publicar o GPT, criar o repositório público da skill no GitHub, Bing Webmaster e Google Search Console. |
| **Tráfego pago (depois, com você)** | É o que realmente escala para 3 vendas por dia. | Criativos no modelo validado em `criativos-modelo-validado.md`; estrutura de campanhas em `plano-instagram-e-anuncios.md`. |

## 4. Passo a passo para ligar o pagamento real (5 minutos)

1. No Asaas (conta 7322046-9): **Integrações → Chave de API → Gerar chave** de produção. Copie.
2. Ainda no Asaas, **Integrações → Webhooks**: URL `https://skills-five-snowy.vercel.app/api/webhooks/asaas`, com eventos de **Checkout** e **Cobranças** e um token à sua escolha.
3. Na Vercel (projeto *skills*, ambiente **Production**):
   - `ASAAS_API_KEY` = chave de produção;
   - `ASAAS_ENV` = `production`;
   - `ASAAS_ALLOW_PRODUCTION` = `true`;
   - `ASAAS_WEBHOOK_TOKEN` = o token do passo 2.
4. **Redeploy** e uma compra de teste de verdade (Pix de R$ 97,90, depois reembolso pelo Asaas).

## 5. Metas por semana

| Semana | Datas | Vendas na semana | Acumulado | Foco |
|---|---|---|---|---|
| 1 | 22–28/10 | 5 | 5 | Pagamento real ligado, PR #7 no ar, bio → `/links`, automação de direct |
| 2 | 29/10–4/11 | 15 | 20 | Reels por repositório + primeira live gratuita + comunidades |
| 3 | 5–11/11 | 25 | 45 | Começo do tráfego pago com os criativos validados (teste R$ 47 × R$ 97,90) |
| 4 | 12–18/11 | 30 | 75 | Escalar o criativo e o preço vencedores |
| 5 | 19–25/11 | 35 | 110 | Black Friday (real, com prazo cumprido) |
| 6–7 | 26/11–5/12 | 40 | 150 | Remarketing + lives semanais |

**Indicadores diários:** visitas a `/comprar`, checkouts iniciados, vendas pagas no Asaas e taxa visita → venda (meta: acima de 2% em tráfego frio e acima de 8% vindo do direct).
