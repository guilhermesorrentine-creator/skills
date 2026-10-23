// Identificação de quem vende (CDC, art. 31; Decreto 7.962/2013). Vem do ambiente de build da Vercel.
const env = import.meta.env;

export const seller = {
  name: env.VITE_SELLER_NAME || "",
  document: env.VITE_SELLER_DOCUMENT || "",
  city: env.VITE_SELLER_CITY || "",
  email: env.VITE_SUPPORT_EMAIL || "",
};

export const sellerLine = () => [seller.name, seller.document && `CPF/CNPJ ${seller.document}`, seller.city].filter(Boolean).join(" · ");
