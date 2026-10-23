# Teste pago 1: 24 e 25/10/2026 (até R$ 100, cartão do dono)

O objetivo é descobrir qual gancho gera clique e compra; lucro não é a meta deste teste. O Meta Ads é ativado pelo dono, e eu não publico nem pago nada.

## Estrutura (Gerenciador de Anúncios → Criar)

| Campanha | Conjunto | Anúncios | Verba/dia | Destino |
|---|---|---|---|---|
| `voxelia-teste1-pro` | Brasil · 22–45 · IA | A, B, C | R$ 35 | /conecta |
| `voxelia-teste1-vitalicio` | Brasil · 22–45 · IA | D | R$ 15 | /comprar |

Total: R$ 50/dia × 2 dias = R$ 100. Encerre as duas campanhas às 23h59 de 25/10.

**Configuração das duas campanhas**
- **Objetivo:** Tráfego. Otimização: visualizações da página de destino. Use Vendas só depois que o Pixel tiver eventos.
- **Orçamento:** no conjunto (ABO), diário, início em 24/10 às 0h e término em 25/10 às 23h59.
- **Público:** Brasil, 22 a 45 anos, todos os gêneros. Interesses: ChatGPT, inteligência artificial, OpenAI, marketing digital e empreendedorismo. Ative o Advantage+ público.
- **Posicionamentos:** manuais. Instagram Reels, Stories e Feed; Facebook Reels.
- **Identidade:** página Voxelia e @voxelia.ia.
- **Formato:** vídeo 9:16 (arquivos em `marketing/anuncios/`), com legendas já no vídeo.
- **Botão:** "Saiba mais".

## Links (cole no campo "URL do site")

- A: `https://skills-five-snowy.vercel.app/conecta?utm_source=meta&utm_medium=paid&utm_campaign=teste1&utm_content=A`
- B: `https://skills-five-snowy.vercel.app/conecta?utm_source=meta&utm_medium=paid&utm_campaign=teste1&utm_content=B`
- C: `https://skills-five-snowy.vercel.app/conecta?utm_source=meta&utm_medium=paid&utm_campaign=teste1&utm_content=C`
- D: `https://skills-five-snowy.vercel.app/comprar?edicao=edicao-1&utm_source=meta&utm_medium=paid&utm_campaign=teste1&utm_content=D`

Cada letra aparece separada na aba **Funil** do Admin (origem `meta · teste1 · A`).

## Textos

### A: tokens desperdiçados (`reel-ad-a-tokens.mp4`)
- **Texto principal:** Você explica tudo de novo a cada conversa e a IA ainda devolve resposta genérica. Conecte a Voxelia no Claude ou no ChatGPT: ela consulta a skill certa e para de gastar tokens adivinhando.
- **Título:** Pare de pagar a IA para adivinhar
- **Descrição:** 12x de R$ 49,90 · 15 dias de garantia

### B: resposta genérica, antes e depois (`reel-ad-b-generica.mp4`)
- **Texto principal:** "Eleve seu negócio a outro nível." Se a sua IA escreve assim, ela não precisa de prompt maior, precisa da skill certa. A Voxelia conecta 2 mil skills, com guia em português, no Claude e no ChatGPT.
- **Título:** Como sair do texto genérico
- **Descrição:** 12x de R$ 49,90 · 15 dias de garantia

### C: superpoderes (`reel-ad-c-bomba.mp4`)
- **Texto principal:** Veja como dar bomba para a sua IA. Você conecta uma vez e ela passa a usar 2 mil skills para texto, vídeo, design, código e vendas. É como dar superpoderes a ela.
- **Título:** Dê superpoderes para a sua IA
- **Descrição:** 12x de R$ 49,90 · 15 dias de garantia

### D: o Claude fez este vídeo (`reel-ad-d-claude.mp4`)
- **Texto principal:** Este vídeo foi feito inteiro pelo Claude, com uma skill. Na Voxelia são 2 mil skills assim, cada uma com passo a passo em português. Acesso vitalício, pagamento único.
- **Título:** 2 mil skills com guia em português
- **Descrição:** R$ 97,90 · acesso vitalício

## Como ler o resultado (25/10 à noite)

| Métrica | Onde | Bom sinal |
|---|---|---|
| CTR do link | Gerenciador | ≥ 1% |
| Custo por visualização da página | Gerenciador | ≤ R$ 0,80 |
| buy_click ÷ view | Admin → Funil | ≥ 5% |
| checkout ÷ buy_page | Admin → Funil | ≥ 30% |
| Venda | Admin → Pedidos | qualquer uma |

- **Corte em 24 h:** se um anúncio custa por clique 2x ou mais que o melhor, pause-o. O Meta já tende a fazer isso dentro do conjunto Pro.
- **Vencedor:** o anúncio com menor custo por buy_click ganha a verba do próximo teste.
- **Sem venda:** dois dias e R$ 100 são pouco para concluir sobre venda. Mantenha o limite de R$ 300 acumulados antes de rever a oferta.

## Antes de ativar (dono)

1. Coloque o ID do Pixel e o token CAPI na Vercel (`VITE_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN`) e faça redeploy. Sem isso o teste ainda funciona, porque o funil próprio mede tudo, mas o Meta otimiza às cegas.
2. Coloque o link da bio do Instagram em `/links`.
3. Cadastre o cartão na conta de anúncios e defina o limite de gastos da conta em R$ 100.
