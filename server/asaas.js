// Cliente mínimo da API v3 do Asaas (chave no header `access_token`, somente no servidor).
export function createAsaasClient({ baseUrl, apiKey, fetchImpl = fetch }) {
  async function call(method, path, body) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { "access_token": apiKey, "Content-Type": "application/json", "User-Agent": "biblioteca-total/4.0" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const error = new Error(data?.errors?.map((item) => item.description).join("; ") || `Asaas respondeu ${response.status}.`);
      error.status = 502; error.code = "asaas_error"; error.upstreamStatus = response.status;
      throw error;
    }
    return data;
  }
  return {
    // Checkout avulso (chargeTypes DETACHED): Pix e cartão de crédito, pagamento único.
    createCheckout: (body) => call("POST", "/checkouts", body),
    listCustomerPayments: (customer) => call("GET", `/payments?customer=${encodeURIComponent(customer)}&limit=50`),
  };
}

export function checkoutUrl(checkout, checkoutHost) {
  try {
    if (checkout?.link) {
      const url = new URL(checkout.link);
      if (url.protocol === "https:" && (url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com"))) return url.toString();
    }
  } catch { /* usa o formato documentado abaixo */ }
  return `${checkoutHost}/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`;
}
