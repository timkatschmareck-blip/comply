import crypto from "crypto";

export const action = async ({ request }) => {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || "";
  const rawBody = await request.text();

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  // Wenn HMAC falsch -> 401 zurück (genau das will Shopify Partners sehen!)
  if (hash !== hmacHeader) {
    return new Response(null, { status: 401 });
  }

  console.log("Webhook verified OK");
  return new Response(null, { status: 200 });
};