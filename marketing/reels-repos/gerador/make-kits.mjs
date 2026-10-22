// Roteiros dos 4 criativos por profissão, no modelo validado do nicho
// (rotina com dor → "não é pack de prompts" → o que faz → números reais → garantia → link na bio).
import { writeFileSync } from "node:fs";

const cta = (kit) => ({ scene: "cta", say: `Toque no link da bio e escolha o kit para ${kit}.`, key: "link da bio", p: { pre: "Toque no", key: "link da bio", sub: `kit para ${kit} · pagamento único` } });
const garantia = { scene: "plano", say: "Pagamento único, acesso imediato e quinze dias de garantia.", show: "Pagamento único, acesso imediato e 15 dias de garantia.", key: "garantia", p: { title: "Voxelia", stamp: "15 DIAS DE GARANTIA" } };

const kits = [
  { repo: "kit-criadores", char: "conteudo", accent: "#f27aa8", lines: [
    { scene: "flop", say: "Domingo, onze da noite. Ideia no celular, roteiro pela metade e o vídeo de amanhã nem gravado.", key: "vídeo", p: { views: 37 } },
    { scene: "varal", say: "A Voxelia não é pack de prompts: é a equipe de IA de um criador de conteúdo, dentro do Claude.", key: "não é pack de prompts", p: { items: ["roteiro", "ganchos", "legenda", "carrossel", "vídeo", "voz", "edição", "plano"] } },
    { scene: "ganchos", say: "Ganchos com nota, roteiro, legenda e o vídeo montado, a partir de uma ideia.", key: "ganchos", p: { label: "3 ganchos com nota", hooks: [{ text: "Ninguém te contou isso sobre…", score: 58 }, { text: "Pare de fazer isso no seu…", score: 92, best: true }, { text: "3 erros que travam o seu…", score: 74 }] } },
    { scene: "contador", say: "São trezentas e doze skills de criação, com passo a passo em português.", show: "São 312 skills de criação, com passo a passo em português.", key: "312", p: { to: 312, label: "skills de criação" } },
    garantia, cta("criadores")] },
  { repo: "kit-empreendedores", char: "empreendedorismo", accent: "#f2a65a", lines: [
    { scene: "orbita", say: "Você é o marketing, o vendedor e o financeiro do seu negócio. Tudo ao mesmo tempo.", key: "financeiro", p: { items: ["marketing", "vendas", "financeiro", "preço", "clientes", "plano"] } },
    { scene: "varal", say: "A Voxelia não é pack de prompts: são especialistas de IA que trabalham pra você no Claude.", key: "não é pack de prompts", p: { items: ["conselho", "financeiro", "preço", "oferta", "vendedor", "leads", "lançamento", "marketing"] } },
    { scene: "multidao", say: "Testa a sua ideia com cem compradores virtuais, antes de você gastar.", show: "Testa a sua ideia com 100 compradores virtuais, antes de você gastar.", key: "100 compradores", p: { label: "100 compradores virtuais", yes: 61 } },
    { scene: "terminal", say: "E monta a sua lista de clientes direto do Google Maps.", key: "lista de clientes", p: { lines: [{ cmd: "liste padarias de Curitiba no Google Maps" }, { out: "✓ lista salva em planilha" }, { cmd: "Harvey, comece a prospecção" }, { out: "✓ prospecção em andamento" }] } },
    garantia, cta("empreendedores")] },
  { repo: "kit-programadores", char: "software", accent: "#a589ec", lines: [
    { scene: "terminal", say: "O agente esqueceu o contexto de novo, e o PR voltou pela terceira vez?", key: "contexto", p: { lines: [{ cmd: "claude" }, { out: "✗ contexto perdido" }, { cmd: "git push" }, { out: "✗ PR reprovado (3ª vez)" }] } },
    { scene: "varal", say: "A Voxelia não é pack de prompts: é o Claude Code configurado como um time sênior.", key: "não é pack de prompts", p: { items: ["método", "memória", "segurança", "plugins", "revisão", "testes", "tokens", "modelos"] } },
    { scene: "fases", say: "Método de desenvolvimento, memória entre sessões e auditoria de segurança.", key: "memória", p: { label: "3 camadas", n: 3, result: "✓ time configurado" } },
    { scene: "contador", say: "Mil setecentas e sessenta e nove skills de software, com guia em português.", show: "1.769 skills de software, com guia em português.", key: "1.769", p: { to: 1769, label: "skills de software" } },
    garantia, cta("programadores")] },
  { repo: "kit-pesquisadores", char: "ciencia", accent: "#5fd3a0", lines: [
    { scene: "citacoes", say: "Madrugada de prazo, vinte PDFs abertos e a revisão de literatura no zero?", key: "revisão", p: { title: "Revisão" } },
    { scene: "varal", say: "A Voxelia não é pack de prompts: é um assistente de pesquisa com cento e setenta e sete skills científicas.", show: "A Voxelia não é pack de prompts: é um assistente de pesquisa com 177 skills científicas.", key: "não é pack de prompts", p: { items: ["literatura", "dados", "figuras", "genômica", "química", "clínica", "escrita", "métodos"] } },
    { scene: "grafico", say: "Revisão com cada afirmação ligada à fonte, análise de dados e figuras prontas pra publicar.", key: "figuras", p: { title: "Resultados" } },
    { scene: "lab", say: "Do DNA às moléculas e aos ensaios clínicos, com guia em português.", key: "moléculas", p: { labels: ["genômica", "moléculas", "ensaios"] } },
    garantia, cta("pesquisadores")] },
];
for (const k of kits) writeFileSync(`reels/${k.repo}.json`, JSON.stringify(k, null, 2));
console.log(kits.map((k) => k.repo).join(" "));
