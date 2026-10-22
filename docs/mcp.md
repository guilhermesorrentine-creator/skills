# MCP da Voxelia (conexão com IAs)

Incluído na compra, sem mensalidade. Quem tem licença ativa gera em **Minha licença** um link pessoal
`/api/mcp/<id>.<versão>.<assinatura>` e cola no Claude (conector personalizado), no ChatGPT (conector em
modo desenvolvedor) ou no Claude Code (`claude mcp add --transport http voxelia <link>`).

- Código: `server/mcp.js` (JSON-RPC sobre HTTP "streamable", sem sessão, respostas JSON).
- Ferramentas: `buscar_skills`, `detalhar_recurso`, `listar_repositorios` (só leitura, mesma busca do app).
- Autenticação: assinatura HMAC com `CLAIM_SECRET` (ou a chave de serviço). A versão do link fica em
  `app_metadata.mcp_v` do usuário no Supabase; "Gerar um novo" incrementa e invalida o anterior. Sem migração.
- A licença é conferida a cada chamada de ferramenta: estorno ou revogação encerram o acesso na hora.
- O catálogo continua privado: nada sai sem token válido de comprador.
- Custo: a IA que raciocina é a do cliente; nós só respondemos buscas (funções da Vercel + leitura do catálogo).
