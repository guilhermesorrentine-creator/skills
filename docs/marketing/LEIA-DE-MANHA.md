# Resumo da noite (22/10/2026)

## O que exige você, na ordem (cerca de 20 minutos)

1. **Ligar o pagamento real**: hoje o site vende em modo de teste. Passo a passo na seção 4 de `estrategia-150-vendas.md`: chave de produção do Asaas, webhook e 2 variáveis na Vercel.
2. **Revisar e aprovar o PR #7**, com a compra sem cadastro, os kits por profissão e a página da bio: https://github.com/guilhermesorrentine-creator/skills/pull/7. Antes do merge, vale uma compra de teste no preview.
3. **Trocar o link da bio do Instagram** para `https://skills-five-snowy.vercel.app/links` (depois do merge).
4. **Decidir o preço de entrada** (recomendação: testar R$ 47 contra R$ 97,90 nos anúncios) e **o contato de suporte** (WhatsApp ou e-mail).
5. **Preencher os dados do vendedor** nos rascunhos de `docs/legal/` (eles tiram o aviso "sem valor jurídico" das páginas).
6. **Aprovar os Reels da semana 2** (abaixo) para eu agendar.

## O que ficou pronto

| Entrega | Onde |
|---|---|
| Compra sem cadastro: e-mail → Pix → criar senha na própria página (resolve o limite de 2 e-mails por hora do Supabase) | PR #7 |
| 4 páginas de venda por profissão no modelo mais validado do nicho | PR #7 · `/kit/criadores`, `/empreendedores`, `/programadores`, `/pesquisadores` |
| Página para a bio: compra em um toque, kits e Reels | PR #7 · `/links` |
| Áreas da landing levando aos kits | PR #7 |
| Pesquisa de concorrentes na Biblioteca de Anúncios | `docs/marketing/concorrentes-meta-ads.md` |
| Diagnóstico de 9 furos, decisões e plano de 45 dias com metas semanais | `docs/marketing/estrategia-150-vendas.md` |
| Textos de anúncio por kit e variações de gancho | `docs/marketing/criativos-modelo-validado.md` |
| 4 vídeos de anúncio (um por kit), 26 a 29 s | `marketing/criativos/` |
| 4 Reels da semana 2 (Harvey, Superpowers, Google Maps Scraper Kit, HyperFrames), com CTA para o link da bio | `marketing/reels-repos/` |
| Rascunhos de termos, privacidade e reembolso | `docs/legal/` |

## A descoberta mais importante

O anúncio mais copiado do nosso nicho vende **pacotes de skills do Claude por profissão** ("Claude Jurídico PRO… não é pack de prompts"), com ~130 anúncios ativos, checkout direto e preço de **R$ 27 a R$ 97**. O concorrente mais parecido conosco (Avora, +500 skills) cobra **R$ 47**. Já temos mais conteúdo do que todos eles. Faltavam três coisas: falar com uma profissão, comprar em poucos toques e o pagamento real ligado. As duas primeiras estão no PR #7; a terceira depende de você.

## Sugestão de agenda dos Reels da semana 2

Mantendo 1 Reel a cada 2 dias, depois dos que já estão agendados (até 5/11):

| Data | Reel |
|---|---|
| sáb 7/11, 9h | Harvey |
| seg 9/11, 9h | Superpowers |
| qua 11/11, 9h | Google Maps Scraper Kit |
| sex 13/11, 9h | HyperFrames |

Os 4 Reels já agendados (30/10 a 5/11) mandam para o "comentário fixado". Funciona, mas o link do comentário não é clicável. Se quiser, troco por versões com "link na bio" antes de saírem.

## Ser recomendado pelas IAs (ChatGPT, Claude, Perplexity, Gemini)

Não existe cadastro direto nos chats. As IAs recomendam o que conseguem **ler** e o que está **citado em lugares confiáveis**.

**Já feito (PR #7):**
- 42 páginas públicas com HTML pré-renderizado: os robôs agora leem o texto, que antes era um `#root` vazio.
- `/llms.txt` com o resumo da Voxelia.
- Dados estruturados: produto, preço, perguntas frequentes e fonte de cada repositório.
- `robots.txt` liberando GPTBot, ClaudeBot e PerplexityBot.

**Depende de você (contas suas):**
1. **Bing Webmaster Tools** (a busca do ChatGPT usa o Bing): adicionar o site e enviar o `sitemap.xml`.
2. **Google Search Console** (Gemini e AI Overviews): idem.
3. **Domínio próprio** (.com.br): IAs e buscadores confiam mais em domínio próprio do que em `*.vercel.app`. Quando ele entrar, eu troco todas as URLs.
4. **Citações externas**: um post no LinkedIn e respostas em comunidades (Reddit r/ClaudeAI, grupos BR de IA), apontando as páginas `/r/<repo>` como guias em português. Posso redigir os textos.
