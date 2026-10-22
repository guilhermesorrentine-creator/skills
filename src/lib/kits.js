// Kits por profissão (/kit/<slug>): a mesma Voxelia, apresentada pela rotina de quem compra.
// Só repositórios reais do acervo; contagens vêm de public/data/repos.json. Quem compra recebe tudo.
export const KITS = [
  {
    slug: "criadores", category: "conteudo", name: "Criadores de conteúdo",
    promise: "A equipe de IA de um criador de conteúdo: roteiro, vídeo, voz e legenda, prontos no Claude.",
    before: "Domingo, 23h. Ideia anotada no celular, roteiro pela metade, legenda sem gancho e o vídeo de amanhã ainda nem gravado.",
    after: "Você pede o Reel pela ideia, recebe três ganchos com nota, o roteiro, a legenda e até o vídeo montado. Seu tempo vai para gravar e postar.",
    tasks: ["Roteiro de Reel com ganchos testados", "Legenda e carrossel prontos", "Plano da semana do Instagram e do YouTube", "Vídeo curto gerado a partir de um tema", "Voz e dublagem", "Edição de vídeo conversando com o Claude", "Animações e motion graphics", "Texto sem cara de IA"],
    repos: ["instagram-agent-skill", "youtube-agent-skill", "hyperframes", "remotion", "OpenMontage", "studio", "claude-video", "VoiceStudio", "MoneyPrinterTurbo", "motionmaxxing", "brag", "anatomy", "awesome-design-md"],
  },
  {
    slug: "empreendedores", category: "empreendedorismo", name: "Empreendedores",
    promise: "Os especialistas que todo negócio pequeno precisa, dentro do Claude: conselho, financeiro, vendas e marketing.",
    before: "Segunda, 8h. Planilha de custos desatualizada, lista de clientes vazia e a sensação de que você é o marketing, o vendedor e o financeiro ao mesmo tempo.",
    after: "Você testa a ideia com 100 compradores virtuais, recebe a margem real e o ponto de equilíbrio, monta a lista de leads e deixa um vendedor de IA trabalhando.",
    tasks: ["Testar a ideia antes de gastar", "Margem de lucro e ponto de equilíbrio", "Preço e oferta que vendem", "Lista de empresas do Google Maps para prospectar", "Vendedor autônomo de IA", "Plano de lançamento de 30 dias", "Vídeo de lançamento do seu site", "Conteúdo para o Instagram do negócio"],
    repos: ["founder-skill", "harvey", "google-maps-scraper-kit", "master-skills", "instagram-agent-skill", "brag", "arena-skill", "Concat", "claude-video"],
  },
  {
    slug: "programadores", category: "software", name: "Programadores",
    promise: "O Claude Code configurado como um time sênior: método, memória, segurança e centenas de skills prontas.",
    before: "Quinta, 22h. O agente esqueceu o contexto de novo, o PR voltou pela terceira vez e você colando arquivo no chat.",
    after: "Você instala um método de desenvolvimento, memória entre sessões e auditoria de segurança, e o agente passa a trabalhar como um time.",
    tasks: ["Metodologia completa para agentes de código", "Memória persistente entre sessões", "Auditoria de segurança do projeto", "Qualquer programa vira linha de comando para o agente", "Plugins oficiais do Claude Code", "Skills de Android", "Menos tokens gastos por sessão", "Vários modelos num endereço só"],
    repos: ["superpowers", "ECC", "ruflo", "claude-mem", "security-audit-skill", "CLI-Anything", "claude-plugins-official", "android-skills", "headroom", "OmniRoute", "codex-plugin-cc", "one-skill-to-rule-them-all"],
  },
  {
    slug: "pesquisadores", category: "ciencia", name: "Pesquisadores e estudantes",
    promise: "Um assistente de pesquisa com 177 skills científicas: dados, literatura, figuras e escrita com fontes.",
    before: "Madrugada de prazo. Vinte PDFs abertos, dados sem tratar, figura do artigo ainda no Excel e a revisão de literatura no zero.",
    after: "Você pede a revisão com cada afirmação ligada à fonte, a análise dos dados e a figura pronta para publicação. Seu tempo vai para pensar.",
    tasks: ["Revisão de literatura com fontes", "Análise de dados e estatística", "Figuras prontas para publicação", "Bioinformática e genômica", "Química e triagem de moléculas", "Transcrição de aulas e vídeos", "Figuras que explicam conceitos", "Várias respostas competindo pela melhor"],
    repos: ["scientific-agent-skills", "claude-video", "anatomy", "arena-skill"],
  },
];
