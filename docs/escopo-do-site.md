# Escopo do site — Biblioteca Total

## Objetivo

Publicar um guia navegável e responsivo da biblioteca local de repositórios e Agent Skills. O repositório `guilhermesorrentine-creator/skills` será a fonte editável; Vercel poderá publicar a aplicação estática a partir dele.

## Inventário de conteúdo

- Base local conferida em 18/10/2026: 37 repositórios, 2.281 skills e quatro áreas (`software`, `empreendedorismo`, `conteúdo` e `ciência`).
- Seis repositórios não tinham definições `SKILL.md` no inventário; devem aparecer como repositórios com ferramentas ou conteúdo, sem inventar skills.
- Fonte geral: `biblioteca-total.catalog.json`, gerado a partir dos clones locais e dos seus README/arquivos `SKILL.md`.
- Referência complementar solicitada: `ciencia/scientific-agent-skills/docs/skills.md`. Ela cataloga 177 skills científicas e serve para conferir a seção de Ciência; não descreve sozinha as outras áreas.
- O JSON publicado deve excluir caminhos absolutos locais. Exibir nome, descrição, caminho relativo no repositório e link GitHub somente quando esses campos estiverem presentes e válidos.

## Estrutura e comportamento

1. Página inicial com resumo da biblioteca, quatro áreas e acesso ao índice.
2. Busca por repositório, skill e assunto; filtros por área.
3. Guia por repositório com propósito, quantidade de skills, caminho para começar, limitações registradas, exemplos de prompt e link para a fonte.
4. Catálogo em linhas inspirado na página 12 da referência enviada: nome da skill/comando, resumo, uso recomendado e botão de cópia com feedback acessível. Não apresentar nomes de skills como comandos slash.
5. Prompts em português com placeholders. Comandos de ativação derivados de `ativar-skills.ps1`, usando placeholders para caminhos locais.
6. HTML/CSS/JS e dados-fonte mantidos em arquivos separados para edição no GitHub pelo celular. Vercel recebe um build estático sem backend nem segredos.

## Direção visual

- Usar a linguagem de terminal/arcade do PDF e padrões de organização observados em Habblaud: personagens pixel-art, estados legíveis, painéis de produto, comandos, passos numerados, abas e acordeões.
- Criar uma identidade própria. Não usar marca, textos ou ilustrações de Habblaud.
- Personagens originais em sprites próprios. Preservar os pixels e transparência; não carregar sprites de terceiros.
- Figura interativa Anatomy de tamanho **Figure**: um seletor de skills em forma de instrumento físico. A lista de peças e o comportamento ficam em `ilustracao-anatomy.md` antes da geometria.
- Movimento segue `motion-foundations`/`motion-patterns`: tokens compartilhados, apenas transform/opacity, entrada e saída pareadas, suporte a `prefers-reduced-motion` e controles que preservam teclado e foco.

## Segurança e publicação

- Tratar descrições e prompts do catálogo como conteúdo externo: inserir como texto, nunca como HTML executável.
- Sem analytics, chamadas de API, tokens, credenciais ou conteúdo de configuração local no site.
- Revisar links externos, dependências, scripts de build, arquivos públicos e saída do build antes do push.
- O push ao GitHub foi solicitado pelo proprietário. A implantação no Vercel fica pronta para conexão ao repositório; credenciais e configuração da conta permanecem no painel do proprietário.

## Critérios de aceite

- Build estático concluído para Vercel.
- Todos os 37 repositórios aparecem, inclusive os seis sem skills; a soma do catálogo permanece 2.281.
- Busca, filtros, links, navegação por seções, acordeões e cópia funcionam por toque e teclado.
- Conferir visualmente desktop e largura de celular; respeitar movimento reduzido.
- Nenhum caminho local ou segredo aparece nos arquivos publicados.
- README explica edição pelo celular e conexão à Vercel.
