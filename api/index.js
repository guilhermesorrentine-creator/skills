import handle from "../server/app.js";

// Uma única função atende /api/* (limite de funções do plano Hobby). A rewrite em vercel.json
// encaminha subcaminhos (ex.: /api/admin/overview) para cá; o roteamento usa a URL original.
export const GET = handle;
export const POST = handle;
