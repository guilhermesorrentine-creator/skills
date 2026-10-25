# MCP da Voxelia (conexão com IAs)

Incluído na assinatura mensal enquanto houver período pago e preservado para compras anuais anteriores durante o prazo contratado. Quem tem direito ativo gera em **Minha licença** um link pessoal
`/api/mcp/<id>.<versão>.<assinatura>` e cola no Claude (conector personalizado), no ChatGPT (conector em
modo desenvolvedor) ou no Claude Code (`claude mcp add --transport http voxelia <link>`).

- Código: `server/mcp.js` (JSON-RPC sobre HTTP "streamable", sem sessão, respostas JSON).
- Ferramentas: `buscar_skills`, `detalhar_recurso`, `listar_repositorios` (só leitura, mesma busca do app).
- Autenticação: assinatura HMAC com `CLAIM_SECRET` (ou a chave de serviço). A versão do link fica em
  `app_metadata.mcp_v` do usuário no Supabase; "Gerar um novo" incrementa e invalida o anterior. Sem migração.
- O direito é conferido a cada chamada de ferramenta: assinatura vencida, estorno ou revogação encerram o acesso; o cancelamento conserva o período já pago.
- O catálogo continua privado: nada sai sem token válido de comprador.
- Custo: a IA que raciocina é a do cliente; nós só respondemos buscas (funções da Vercel + leitura do catálogo).
