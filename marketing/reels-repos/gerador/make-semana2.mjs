// Reels da semana 2 (um por repositório), fatos só dos guias. CTA: link da bio (comentário não é clicável).
import { writeFileSync } from "node:fs";

const cta = { scene: "cta", say: "O passo a passo completo tá no nosso site. Toque no link da bio.", key: "link da bio", p: { pre: "Toque no", key: "link da bio", sub: "passo a passo completo em português" } };
const reels = [
  { repo: "harvey", char: "empreendedorismo", accent: "#f2a65a", lines: [
    { scene: "orbita", say: "Você passa o dia caçando cliente e respondendo e-mail, em vez de vender?", key: "cliente", p: { items: ["prospectar", "pesquisar", "escrever", "enviar", "responder", "agendar"] } },
    { scene: "fases", say: "Alguém criou um vendedor de IA, de graça, que acha empresas, lê o site de cada uma e escreve um e-mail personalizado.", key: "vendedor", p: { label: "o ciclo do Harvey", n: 6, result: "✓ reunião marcada" } },
    { scene: "aprovar", say: "Ele lê as respostas e leva a conversa até a reunião. E você aprova os e-mails antes do envio.", key: "reunião", p: { draft: "E-mail personalizado", you: "você aprova", button: "Aprovar e enviar" } },
    { scene: "plano", say: "E roda na assinatura do Claude que você já paga, sem custo por token.", key: "sem custo por token", p: { title: "Harvey", stamp: "SEM CUSTO POR TOKEN" } },
    { scene: "voxelia", say: "Chama Rárvei. É de código aberto, e a gente explica cada passo em português.", show: "Chama Harvey. É de código aberto, e a gente explica cada passo em português.", key: "Harvey", p: { query: "vender com IA", tagline: "Vendedor autônomo de IA", chips: ["Empreendedorismo", "MIT", "Código aberto"] } },
    cta] },
  { repo: "superpowers", char: "software", accent: "#a589ec", lines: [
    { scene: "terminal", say: "Você pede uma função pro agente, e ele sai escrevendo código sem entender o que você queria?", key: "entender", p: { lines: [{ cmd: "crie a tela de login" }, { out: "✗ 400 linhas que ninguém pediu" }] } },
    { scene: "fases", say: "Alguém criou um método completo que faz o agente perguntar antes, mostrar o desenho e montar um plano.", key: "método", p: { label: "perguntar → desenhar → planejar → executar", n: 4, result: "✓ tarefas de 2 a 5 minutos" } },
    { scene: "terminal", say: "E executa com testes antes do código e revisão a cada etapa.", key: "testes", p: { lines: [{ cmd: "rodar testes" }, { out: "✓ testes passando" }, { cmd: "revisar etapa" }, { out: "✓ etapa aprovada" }] } },
    { scene: "contador", say: "São quinze skills que disparam sozinhas, no momento certo.", show: "São 15 skills que disparam sozinhas, no momento certo.", key: "15", p: { to: 15, label: "skills automáticas" } },
    { scene: "voxelia", say: "Chama Súper Páuers. É de código aberto, e a gente explica cada passo em português.", show: "Chama Superpowers. É de código aberto, e a gente explica cada passo em português.", key: "Superpowers", p: { query: "programar com agente", tagline: "Método completo para agentes de código", chips: ["Software", "15 skills", "MIT"] } },
    cta] },
  { repo: "google-maps-scraper-kit", char: "empreendedorismo", accent: "#f2a65a", lines: [
    { scene: "orbita", say: "Precisa de clientes e não sabe por onde começar a prospectar?", key: "clientes", p: { items: ["padarias", "clínicas", "academias", "salões", "oficinas", "lojas"] } },
    { scene: "terminal", say: "Diga o tipo de negócio e a cidade, e receba uma planilha com nome, telefone, site e avaliação.", key: "planilha", p: { lines: [{ cmd: "liste dentistas em Belo Horizonte" }, { out: "✓ planilha com nome, telefone, site e nota" }] } },
    { scene: "plano", say: "Sem chave de API do Google e sem pagar crédito, rodando no seu computador.", key: "sem pagar", p: { title: "Google Maps Scraper Kit", stamp: "SEM CRÉDITOS PAGOS" } },
    { scene: "transform", say: "E dá pra pedir tudo pro Claude Code, em português.", key: "Claude Code", p: { app: "Google Maps", machine: "Claude Code", cmd: "empresas.csv ✓" } },
    { scene: "voxelia", say: "Chama Google Maps Scraper Kit, e o nosso guia mostra até os cuidados legais antes de usar.", key: "cuidados legais", p: { query: "achar clientes", tagline: "Listas de empresas do Google Maps", chips: ["Empreendedorismo", "MIT", "Código aberto"] } },
    cta] },
  { repo: "hyperframes", char: "conteudo", accent: "#f27aa8", lines: [
    { scene: "orbita", say: "E se você pudesse pedir um vídeo pro seu agente de IA, do jeito que pede um texto?", key: "vídeo", p: { items: ["lançamento", "explicador", "legenda", "motion", "anúncio", "reels"] } },
    { scene: "transform", say: "Alguém liberou de graça o framework que transforma HTML em vídeo MP4, sempre com o mesmo resultado.", key: "vídeo MP4", p: { app: "HTML", machine: "HyperFrames", cmd: "video.mp4 ✓" } },
    { scene: "fases", say: "As skills ensinam o agente a planejar, montar, revisar e renderizar.", key: "renderizar", p: { label: "planejar → montar → revisar → renderizar", n: 4, result: "✓ video.mp4 pronto" } },
    { scene: "semana", say: "Os Reels deste perfil foram feitos com ele.", key: "Reels", p: { label: "os Reels deste perfil" } },
    { scene: "voxelia", say: "Chama Ráiper Frêims. É de código aberto, e a gente explica cada passo em português.", show: "Chama HyperFrames. É de código aberto, e a gente explica cada passo em português.", key: "HyperFrames", p: { query: "fazer vídeo com IA", tagline: "Vídeos MP4 feitos pelo seu agente", chips: ["Conteúdo", "Apache 2.0", "Código aberto"] } },
    cta] },
];
for (const r of reels) writeFileSync(`reels/${r.repo}.json`, JSON.stringify(r, null, 2));
console.log(reels.map((r) => r.repo).join(" "));
