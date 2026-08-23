export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "comply-test-bochum.myshopify.com";

  // Preis pro kg für 2026 (Dual System)
  const preisProKg = 0.90; // 0,90€ / kg Karton
  const masse = 0.2;
  const kosten = (masse * preisProKg).toFixed(2);

  const csv = `sep=;
Material;Masse_kg;Bestellungen;Kosten_EUR;Shop
Karton;${masse};1;${kosten};${shop}
Gesamt;${masse};1;${kosten};${shop}
`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="LUCID_${shop}_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
};