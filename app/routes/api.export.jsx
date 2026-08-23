import db from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "comply-test-bochum.myshopify.com";
  let rules = [];

  try {
    rules = await db.packagingRule.findMany({ where: { shop } });
  } catch (e) {}

  if (rules.length === 0) rules = [{ material: "Karton", threshold: 0.2 }];

  const csv = `Material;Masse_kg;Bestellungen;Shop
Karton;0.2;1;${shop}
Gesamt;0.2;1;${shop}
`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="LUCID_${shop}.csv"`,
    },
  });
};