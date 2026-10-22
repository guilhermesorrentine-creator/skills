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

// Versões en/es dos textos de venda; nomes de repositório e contagens não mudam.
const KIT_I18N = {
  criadores: {
    en: {
      name: "Content creators",
      promise: "A content creator's AI team: script, video, voice and captions, ready in Claude.",
      before: "Sunday, 11 p.m. Idea jotted on your phone, script half done, caption with no hook and tomorrow's video not even recorded.",
      after: "You ask for the Reel from the idea and get three scored hooks, the script, the caption and even the edited video. Your time goes into recording and posting.",
      tasks: ["Reel scripts with tested hooks", "Captions and carousels ready to post", "Weekly Instagram and YouTube plan", "Short video generated from a topic", "Voice and dubbing", "Video editing by talking to Claude", "Animations and motion graphics", "Writing that doesn't sound like AI"],
    },
    es: {
      name: "Creadores de contenido",
      promise: "El equipo de IA de un creador de contenido: guion, video, voz y subtítulos, listos en Claude.",
      before: "Domingo, 23 h. Idea anotada en el celular, guion a medias, texto sin gancho y el video de mañana ni siquiera grabado.",
      after: "Pides el Reel a partir de la idea y recibes tres ganchos con nota, el guion, el texto y hasta el video montado. Tu tiempo va a grabar y publicar.",
      tasks: ["Guion de Reel con ganchos probados", "Texto y carrusel listos", "Plan semanal de Instagram y YouTube", "Video corto generado a partir de un tema", "Voz y doblaje", "Edición de video conversando con Claude", "Animaciones y motion graphics", "Textos sin cara de IA"],
    },
  },
  empreendedores: {
    en: {
      name: "Founders",
      promise: "The specialists every small business needs, inside Claude: board, finance, sales and marketing.",
      before: "Monday, 8 a.m. Outdated cost spreadsheet, empty customer list and the feeling that you're the marketing, sales and finance team all at once.",
      after: "You test the idea with 100 virtual buyers, get your real margin and break-even point, build your lead list and leave an AI salesperson working.",
      tasks: ["Test the idea before spending", "Profit margin and break-even point", "Pricing and offers that sell", "Google Maps business lists for prospecting", "Autonomous AI salesperson", "30-day launch plan", "Launch video for your website", "Content for your business Instagram"],
    },
    es: {
      name: "Emprendedores",
      promise: "Los especialistas que todo pequeño negocio necesita, dentro de Claude: consejo, finanzas, ventas y marketing.",
      before: "Lunes, 8 h. Planilla de costos desactualizada, lista de clientes vacía y la sensación de que eres el marketing, el vendedor y las finanzas al mismo tiempo.",
      after: "Pruebas la idea con 100 compradores virtuales, recibes el margen real y el punto de equilibrio, armas la lista de leads y dejas un vendedor de IA trabajando.",
      tasks: ["Probar la idea antes de gastar", "Margen de ganancia y punto de equilibrio", "Precio y oferta que venden", "Lista de empresas de Google Maps para prospectar", "Vendedor autónomo de IA", "Plan de lanzamiento de 30 días", "Video de lanzamiento de tu sitio", "Contenido para el Instagram del negocio"],
    },
  },
  programadores: {
    en: {
      name: "Developers",
      promise: "Claude Code set up like a senior team: method, memory, security and hundreds of ready-made skills.",
      before: "Thursday, 10 p.m. The agent lost context again, the PR came back for the third time and you're pasting files into the chat.",
      after: "You install a development method, cross-session memory and a security audit, and the agent starts working like a team.",
      tasks: ["Complete methodology for coding agents", "Persistent memory across sessions", "Project security audit", "Any program becomes a CLI for the agent", "Official Claude Code plugins", "Android skills", "Fewer tokens spent per session", "Several models behind one endpoint"],
    },
    es: {
      name: "Programadores",
      promise: "Claude Code configurado como un equipo sénior: método, memoria, seguridad y cientos de skills listas.",
      before: "Jueves, 22 h. El agente olvidó el contexto otra vez, el PR volvió por tercera vez y estás pegando archivos en el chat.",
      after: "Instalas un método de desarrollo, memoria entre sesiones y auditoría de seguridad, y el agente empieza a trabajar como un equipo.",
      tasks: ["Metodología completa para agentes de código", "Memoria persistente entre sesiones", "Auditoría de seguridad del proyecto", "Cualquier programa se vuelve línea de comandos para el agente", "Plugins oficiales de Claude Code", "Skills de Android", "Menos tokens gastados por sesión", "Varios modelos en una sola dirección"],
    },
  },
  pesquisadores: {
    en: {
      name: "Researchers and students",
      promise: "A research assistant with 177 scientific skills: data, literature, figures and writing with sources.",
      before: "Deadline night. Twenty PDFs open, raw data, the paper's figure still in Excel and the literature review at zero.",
      after: "You ask for the review with every claim linked to its source, the data analysis and a publication-ready figure. Your time goes into thinking.",
      tasks: ["Literature review with sources", "Data analysis and statistics", "Publication-ready figures", "Bioinformatics and genomics", "Chemistry and molecule screening", "Transcribing lectures and videos", "Figures that explain concepts", "Several answers competing for the best"],
    },
    es: {
      name: "Investigadores y estudiantes",
      promise: "Un asistente de investigación con 177 skills científicas: datos, literatura, figuras y escritura con fuentes.",
      before: "Madrugada de entrega. Veinte PDF abiertos, datos sin tratar, la figura del artículo todavía en Excel y la revisión de literatura en cero.",
      after: "Pides la revisión con cada afirmación ligada a su fuente, el análisis de datos y la figura lista para publicar. Tu tiempo va a pensar.",
      tasks: ["Revisión de literatura con fuentes", "Análisis de datos y estadística", "Figuras listas para publicar", "Bioinformática y genómica", "Química y cribado de moléculas", "Transcripción de clases y videos", "Figuras que explican conceptos", "Varias respuestas compitiendo por la mejor"],
    },
  },
};

// Kit no idioma pedido; sem tradução, o original em português.
export const localizeKit = (kit, lang) => ({ ...kit, ...(KIT_I18N[kit.slug]?.[lang] || {}) });
