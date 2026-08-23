export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "comply-test-bochum.myshopify.com";

  const csv = `sep=;
Material;Masse_kg;Bestellungen;Shop
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