import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop } = await authenticate.webhook(request);
  console.log(`Shop redact for ${shop}`);
  // Hier würdest du Shop-Daten löschen
  return new Response(null, { status: 200 });
};