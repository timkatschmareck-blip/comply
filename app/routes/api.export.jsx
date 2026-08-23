import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const rules = await db.packagingRule.findMany({ where: { shop: session.shop } });
  const totalKg = rules.reduce((s, r) => s + r.threshold, 0) * 1; // 1 Bestellung für Test

  const csv = `Material,Masse_kg,Bestellungen
${rules.map(r => `${r.material},${r.threshold},1`).join("\n")}
Gesamt,${totalKg},1
Shop,${session.shop}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="lucid_${session.shop}.csv"`,
    },
  });
};