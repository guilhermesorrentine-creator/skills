import handle from "../server/app.js";

// Uma única função atende /api/* (limite de funções do plano Hobby).
export const GET = handle;
export const POST = handle;
