import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`GDPR ${topic} for ${shop} - No customer data stored, compliant`);
  return new Response(null, { status: 200 });
};