import db from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shopFromUrl = url.searchParams.get("shop") || "comply-test-bochum.myshopify.com";

  let shop = shopFromUrl;
  let rules = [];

  try {
    // Versuche Shop aus Session zu holen
    const { authenticate } = await import("../shopify.server");
    const { session } = await authenticate.admin(request);
    shop = session.shop;
  } catch (e) {
    console.log("Fallback auf URL shop param:", shopFromUrl);
  }

  try {
    rules = await db.packagingRule.findMany({ 
      where: { shop } 
    });
  } catch (e) {
    console.error("DB error", e);
  }

  // Fallback wenn keine Regeln
  if (rules.length === 0) {
    rules = [{ material: "Karton", threshold: 0.2 }];
  }

  const orderCount = 1; // Deine 1 Bestellung
  const totalKg = rules.reduce((s, r) => s + r.threshold * orderCount, 0);

  const csv = `Material;Masse_kg;Bestellungen;Shop
${rules.map(r => `${r.material};${r.threshold};${orderCount};${shop}`).join("\n")}
Gesamt;${totalKg};${orderCount};${shop}
`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="LUCID_${shop}_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
};