// Roteiro do terminal guiado pelo scroll: dados e a função pura que transforma o progresso
// (0 a 1) num quadro do terminal. `$` é o terminal, `›` é o pedido dentro do agente.
// Cada passo pertence a uma etapa (`l`), que o professor explica ao lado.

export const SCENARIOS = [
  { category: "software", title: "Auditoria de segurança", guide: "guia-security-audit-skill", guideTitle: "Security Audit, da Cloudflare",
    lessons: [
      { title: "Instale a skill", say: "Primeiro, um comando instala a skill de segurança da Cloudflare no seu agente." },
      { title: "Peça em linguagem simples", say: "Depois é só pedir. Nada de configurar ferramenta por ferramenta." },
      { title: "O agente trabalha em fases", say: "Ele mapeia o sistema, caça falhas e manda cada achado para um verificador novo." },
      { title: "Resultado verificado", say: "No fim, um relatório só com o que se sustentou na verificação." },
    ],
    steps: [
      { l: 0, prompt: "$", text: "npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit" },
      { l: 0, out: "skill security-audit instalada" },
      { l: 1, prompt: "›", text: "security audit this codebase" },
      { l: 2, run: "Fase 1 · reconhecimento: arquitetura, entradas e fronteiras de confiança" },
      { l: 2, run: "Fase 2 · caça: agentes isolados percorrem cada parte do código" },
      { l: 2, run: "Fase 3 · validação: um verificador novo tenta derrubar cada achado" },
      { l: 2, progress: "Fase 6 · relatório" },
      { l: 3, done: "REPORT.md gerado, só com o que foi confirmado" },
    ] },
  { category: "empreendedorismo", title: "Conselho do seu negócio", guide: "guia-founder-skill", guideTitle: "Founder, 11 skills para negócios",
    lessons: [
      { title: "Conte a sua ideia", say: "Você descreve o negócio em uma frase, do seu jeito." },
      { title: "Três lentes avaliam", say: "Um conselho analisa a oferta, o que te diferencia e a experiência do cliente." },
      { title: "O conselho vota", say: "Cada lente dá nota e diz o que mataria a ideia." },
      { title: "Decisão registrada", say: "O voto e as condições ficam num arquivo para as próximas etapas." },
    ],
    steps: [
      { l: 0, prompt: "›", text: "/founder-board loja de cafés especiais por assinatura" },
      { l: 1, run: "Lente Ofertas: o que faz o cliente dizer sim" },
      { l: 1, run: "Lente Monopólio: o que ninguém mais consegue copiar" },
      { l: 1, run: "Lente Produto: a experiência de ponta a ponta" },
      { l: 2, progress: "Votação do conselho" },
      { l: 3, done: "founder/idea.md gravado com o voto e as condições" },
    ] },
  { category: "conteudo", title: "Vídeo de lançamento", guide: "guia-hyperframes", guideTitle: "HyperFrames, vídeos com HTML",
    lessons: [
      { title: "Instale o plugin", say: "Um comando coloca o HyperFrames dentro do Claude Code." },
      { title: "Descreva o vídeo", say: "Formato, duração e assunto. Ele pergunta o que faltar." },
      { title: "Plano, checagem e render", say: "Você aprova o plano; ele confere a composição e renderiza." },
      { title: "Vídeo pronto", say: "Sai um MP4 na vertical, pronto para os Reels." },
    ],
    steps: [
      { l: 0, prompt: "$", text: "claude plugin install hyperframes@hyperframes" },
      { l: 0, out: "plugin hyperframes instalado" },
      { l: 1, prompt: "›", text: "/hyperframes vídeo vertical de 25 s lançando o meu app" },
      { l: 2, run: "Plano e storyboard prontos para você aprovar" },
      { l: 2, run: "npx hyperframes check: composição validada" },
      { l: 2, progress: "Renderizando 1080×1920" },
      { l: 3, done: "renders/lancamento-9x16.mp4 pronto" },
    ] },
  { category: "ciencia", title: "Revisão de literatura", guide: "guia-scientific-agent-skills", guideTitle: "Scientific Agent Skills",
    lessons: [
      { title: "Instale as skills", say: "São 177 skills científicas, instaladas de uma vez." },
      { title: "Faça a pergunta", say: "Pergunte como pesquisador: tema, recorte e o que você quer descobrir." },
      { title: "Busca e leitura", say: "O agente busca nas bases, lê e classifica as evidências." },
      { title: "Revisão com fontes", say: "Você recebe a revisão com as fontes citadas. Confira sempre." },
    ],
    steps: [
      { l: 0, prompt: "$", text: "npx skills add K-Dense-AI/scientific-agent-skills" },
      { l: 0, out: "skills científicas instaladas" },
      { l: 1, prompt: "›", text: "revisão de literatura sobre microalgas na captura de carbono" },
      { l: 2, run: "Buscando artigos e bases científicas" },
      { l: 2, run: "Lendo, classificando evidências e citações" },
      { l: 2, progress: "Mapeando lacunas de pesquisa" },
      { l: 3, done: "revisao-literatura.md com as fontes citadas" },
    ] },
];

export const CELLS = 24;
const LEAD = 6; // respiro antes do primeiro comando
const HOLD = 22; // tempo de leitura do resultado antes da próxima cena

// Peso de cada passo no scroll: digitar custa por caractere (pedido ao agente, mais devagar).
function weight(step) {
  if (step.prompt) return step.text.length * (step.prompt === "›" ? 0.55 : 0.28) + 4;
  if (step.out) return 6;
  if (step.run) return 12;
  if (step.progress) return 16;
  return 8;
}

const finished = (step) => (step.prompt ? { kind: "cmd", prompt: step.prompt, text: step.text }
  : step.out ? { kind: "out", text: step.out }
  : step.done ? { kind: "done", text: step.done }
  : { kind: "run", text: step.run || step.progress, state: "ok" });

// Quadro do terminal para um progresso local `q` (0 a 1) dentro de uma cena.
export function frameAt(scenario, q) {
  const weights = scenario.steps.map(weight);
  const total = LEAD + weights.reduce((sum, w) => sum + w, 0) + HOLD;
  let t = Math.min(Math.max(q, 0), 1) * total - LEAD;
  const lines = [];
  if (t < 0) return { lines, typing: null, progress: null, lesson: 0, status: "idle" };
  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    if (t >= weights[i]) { lines.push(finished(step)); t -= weights[i]; continue; }
    const f = t / weights[i];
    if (step.prompt) return { lines, typing: { prompt: step.prompt, text: step.text.slice(0, Math.round(f * step.text.length)) }, progress: null, lesson: step.l, status: "running" };
    if (step.run) { lines.push({ kind: "run", text: step.run, state: "busy" }); return { lines, typing: null, progress: null, lesson: step.l, status: "running" }; }
    if (step.progress) return { lines, typing: null, progress: { label: step.progress, value: Math.round(f * CELLS) }, lesson: step.l, status: "running" };
    lines.push(finished(step));
    return { lines, typing: null, progress: null, lesson: step.l, status: "done" };
  }
  return { lines, typing: null, progress: null, lesson: scenario.lessons.length - 1, status: "done" };
}

// Progresso global (0 a 1) → cena atual e progresso local.
export function sceneAt(p, count = SCENARIOS.length) {
  const scaled = Math.min(Math.max(p, 0), 0.99999) * count;
  const index = Math.floor(scaled);
  return { index, q: scaled - index };
}

export function finalFrame(scenario) {
  return { lines: scenario.steps.map(finished), typing: null, progress: null, lesson: scenario.lessons.length - 1, status: "done" };
}

// Textos do roteiro em en/es: só o que é linguagem (títulos, falas, saídas). Comandos e arquivos não mudam.
// `steps` lista, na ordem dos passos, o texto traduzido de out/run/progress/done ou do pedido `›` (null = mantém).
const SCENARIO_I18N = {
  software: {
    en: { title: "Security audit", guideTitle: "Security Audit, by Cloudflare",
      lessons: [["Install the skill", "First, one command installs Cloudflare's security skill in your agent."], ["Ask in plain language", "Then just ask. No configuring tool by tool."], ["The agent works in phases", "It maps the system, hunts for flaws and sends each finding to a fresh verifier."], ["Verified result", "In the end, a report with only what held up under verification."]],
      steps: [null, "security-audit skill installed", null, "Phase 1 · recon: architecture, inputs and trust boundaries", "Phase 2 · hunt: isolated agents go through each part of the code", "Phase 3 · validation: a fresh verifier tries to knock down each finding", "Phase 6 · report", "REPORT.md generated, with confirmed findings only"] },
    es: { title: "Auditoría de seguridad", guideTitle: "Security Audit, de Cloudflare",
      lessons: [["Instala la skill", "Primero, un comando instala la skill de seguridad de Cloudflare en tu agente."], ["Pide en lenguaje simple", "Después solo pides. Nada de configurar herramienta por herramienta."], ["El agente trabaja por fases", "Mapea el sistema, busca fallas y envía cada hallazgo a un verificador nuevo."], ["Resultado verificado", "Al final, un informe solo con lo que resistió la verificación."]],
      steps: [null, "skill security-audit instalada", null, "Fase 1 · reconocimiento: arquitectura, entradas y fronteras de confianza", "Fase 2 · búsqueda: agentes aislados recorren cada parte del código", "Fase 3 · validación: un verificador nuevo intenta derribar cada hallazgo", "Fase 6 · informe", "REPORT.md generado, solo con lo confirmado"] },
  },
  empreendedorismo: {
    en: { title: "Your business board", guideTitle: "Founder, 11 business skills",
      lessons: [["Describe your idea", "You describe the business in one sentence, your way."], ["Three lenses evaluate", "A board analyzes the offer, what sets you apart and the customer experience."], ["The board votes", "Each lens gives a score and says what would kill the idea."], ["Decision recorded", "The vote and conditions go into a file for the next steps."]],
      steps: ["/founder-board specialty coffee subscription shop", "Offers lens: what makes the customer say yes", "Monopoly lens: what nobody else can copy", "Product lens: the end-to-end experience", "Board vote", "founder/idea.md saved with the vote and conditions"] },
    es: { title: "Consejo de tu negocio", guideTitle: "Founder, 11 skills para negocios",
      lessons: [["Cuenta tu idea", "Describes el negocio en una frase, a tu manera."], ["Tres lentes evalúan", "Un consejo analiza la oferta, lo que te diferencia y la experiencia del cliente."], ["El consejo vota", "Cada lente da una nota y dice qué mataría la idea."], ["Decisión registrada", "El voto y las condiciones quedan en un archivo para las próximas etapas."]],
      steps: ["/founder-board tienda de cafés especiales por suscripción", "Lente Ofertas: qué hace que el cliente diga sí", "Lente Monopolio: lo que nadie más puede copiar", "Lente Producto: la experiencia de punta a punta", "Votación del consejo", "founder/idea.md guardado con el voto y las condiciones"] },
  },
  conteudo: {
    en: { title: "Launch video", guideTitle: "HyperFrames, videos with HTML",
      lessons: [["Install the plugin", "One command puts HyperFrames inside Claude Code."], ["Describe the video", "Format, length and topic. It asks for whatever is missing."], ["Plan, check and render", "You approve the plan; it checks the composition and renders."], ["Video ready", "Out comes a vertical MP4, ready for Reels."]],
      steps: [null, "hyperframes plugin installed", "/hyperframes 25-second vertical video launching my app", "Plan and storyboard ready for your approval", "npx hyperframes check: composition validated", "Rendering 1080×1920", "renders/lancamento-9x16.mp4 ready"] },
    es: { title: "Video de lanzamiento", guideTitle: "HyperFrames, videos con HTML",
      lessons: [["Instala el plugin", "Un comando pone HyperFrames dentro de Claude Code."], ["Describe el video", "Formato, duración y tema. Pregunta lo que falte."], ["Plan, revisión y render", "Apruebas el plan; revisa la composición y renderiza."], ["Video listo", "Sale un MP4 vertical, listo para los Reels."]],
      steps: [null, "plugin hyperframes instalado", "/hyperframes video vertical de 25 s lanzando mi app", "Plan y storyboard listos para que apruebes", "npx hyperframes check: composición validada", "Renderizando 1080×1920", "renders/lancamento-9x16.mp4 listo"] },
  },
  ciencia: {
    en: { title: "Literature review", guideTitle: "Scientific Agent Skills",
      lessons: [["Install the skills", "177 scientific skills, installed at once."], ["Ask the question", "Ask like a researcher: topic, scope and what you want to find out."], ["Search and reading", "The agent searches the databases, reads and grades the evidence."], ["Review with sources", "You get the review with the sources cited. Always double-check."]],
      steps: [null, "scientific skills installed", "literature review on microalgae for carbon capture", "Searching papers and scientific databases", "Reading, grading evidence and citations", "Mapping research gaps", "literature-review.md with sources cited"] },
    es: { title: "Revisión de literatura", guideTitle: "Scientific Agent Skills",
      lessons: [["Instala las skills", "Son 177 skills científicas, instaladas de una vez."], ["Haz la pregunta", "Pregunta como investigador: tema, recorte y qué quieres descubrir."], ["Búsqueda y lectura", "El agente busca en las bases, lee y clasifica la evidencia."], ["Revisión con fuentes", "Recibes la revisión con las fuentes citadas. Revísala siempre."]],
      steps: [null, "skills científicas instaladas", "revisión de literatura sobre microalgas en la captura de carbono", "Buscando artículos y bases científicas", "Leyendo, clasificando evidencias y citas", "Mapeando vacíos de investigación", "revision-literatura.md con las fuentes citadas"] },
  },
};

export function localizeScenario(scenario, lang) {
  const local = SCENARIO_I18N[scenario.category]?.[lang];
  if (!local) return scenario;
  const field = (step) => (step.prompt ? "text" : step.out ? "out" : step.run ? "run" : step.progress ? "progress" : "done");
  return {
    ...scenario, title: local.title, guideTitle: local.guideTitle,
    lessons: scenario.lessons.map((lesson, i) => ({ title: local.lessons[i][0], say: local.lessons[i][1] })),
    steps: scenario.steps.map((step, i) => (local.steps[i] == null ? step : { ...step, [field(step)]: local.steps[i] })),
  };
}
