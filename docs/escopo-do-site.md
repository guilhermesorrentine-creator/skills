# Escopo do site — Arsenal IA

## Objetivo

Publicar um guia navegável e responsivo da biblioteca local de repositórios e Agent Skills. O repositório `guilhermesorrentine-creator/skills` será a fonte editável; Vercel poderá publicar a aplicação estática a partir dele.

## Inventário de conteúdo

- Base local conferida em 18/10/2026: 37 repositórios, 2.281 skills e quatro áreas (`software`, `empreendedorismo`, `conteúdo` e `ciência`).
- Seis repositórios não tinham definições `SKILL.md` no inventário; devem aparecer como repositórios com ferramentas ou conteúdo, sem inventar skills.
- Fonte geral: `biblioteca-total.catalog.json`, gerado a partir dos clones locais e dos seus README/arquivos `SKILL.md`.
- Referência complementar solicitada: `ciencia/scientific-agent-skills/docs/skills.md`. Ela cataloga 177 skills científicas e serve para conferir a seção de Ciência; não descreve sozinha as outras áreas.
- `src/data/catalog.json` é a fonte canônica, validada antes de dev/build e servida apenas por `/api/catalog` a quem tem acesso. A demonstração pública usa `public/data/demo.json`.
- O JSON publicado deve excluir caminhos absolutos locais. Exibir nome, descrição, caminho relativo no repositório e link GitHub somente quando esses campos estiverem presentes e válidos.

## Estrutura e comportamento

1. Página inicial com resumo da biblioteca, busca em destaque e quatro áreas.
2. Busca nas skills e nos repositórios, em abas distintas, com ranking local, acentos normalizados, sinônimos PT/EN, erros simples de digitação e razão de correspondência.
3. Filtros combináveis por categoria e repositório, ordenação por relevância/nome, filtros na URL, favoritos e histórico locais.
4. Ficha individual de skill com metadados reais, prompt genérico copiável, caminho e link de origem. O catálogo não inclui o texto integral; a ficha informa essa ausência e aponta ao GitHub.
5. Guia por repositório com quantidade e exemplos genéricos, sem inventar compatibilidade, pré-requisitos ou comandos slash.
6. Comparação de até três skills usando os metadados disponíveis, sem notas de qualidade.
7. Dados-fonte e interface separados para edição no GitHub pelo celular. Vercel recebe build estático sem backend nem segredos.

## Direção visual

- Usar a linguagem de terminal/arcade do PDF e padrões de organização observados em Habblaud: personagens pixel-art, estados legíveis, painéis de produto, comandos, passos numerados, abas e acordeões.
- Criar uma identidade própria. Não usar marca, textos ou ilustrações de Habblaud.
- Personagens originais em sprites próprios. Preservar os pixels e transparência; não carregar sprites de terceiros.
- Figura interativa Anatomy de tamanho **Figure**: um seletor de skills em forma de instrumento físico. A lista de peças e o comportamento ficam em `ilustracao-anatomy.md` antes da geometria.
- Tokens compartilhados ficam em `src/lib/motion-tokens.js`; transições são curtas, pareadas, usam transform/opacity e respeitam `prefers-reduced-motion`.
- Busca e controles mantêm foco visível, nomes acessíveis e alvos de toque de pelo menos 40 px.

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
