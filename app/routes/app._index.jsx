import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(`query { products(first: 20) { nodes { id title vendor metafields(first: 1, keys: ["custom.manufacturer_address"]) { nodes { value } } } } shop { name } }`);
  const data = await res.json();
  const checks = data.data.products.nodes.map(p => {
    const has = p.metafields.nodes.length > 0 && p.metafields.nodes[0].value;
    return { id: p.id, title: p.title, vendor: p.vendor || "Unbekannt", sku: p.id.split("/").pop().slice(-6), status: has? "Dokumentiert" : "Handlungsbedarf", addr: has? p.metafields.nodes[0].value : "" };
  });
  return { checks, shopName: data.data.shop.name };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const fd = await request.formData();
  const address = fd.get("address");
  const ids = JSON.parse(fd.get("productIds"));
  for (const pid of ids) {
    await admin.graphql(`mutation { metafieldsSet(metafields: [{ ownerId: "${pid}", namespace: "custom", key: "manufacturer_address", value: "${address}", type: "single_line_text_field" }]) { userErrors { message } } }`);
  }
  return { ok: true, count: ids.length };
};

export default function Index() {
  const { checks, shopName } = useLoaderData();
  const fetcher = useFetcher();
  const bedarf = checks.filter(c => c.status === "Handlungsbedarf").length;
  const doku = checks.filter(c => c.status === "Dokumentiert").length;
  const score = checks.length? Math.round((doku / checks.length) * 100) : 0;
  const critIds = checks.filter(c => c.status === "Handlungsbedarf").map(c => c.id);

  const exportPDF = async () => {
    const m = await import("jspdf");
    const jsPDF = m.default;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

    // HEADER
    doc.setFontSize(20); doc.setTextColor("#0a5c36"); doc.text("comply", 20, 20);
    doc.setFontSize(11); doc.setTextColor("#444"); doc.text("GPSR Dokumentations-Bericht | EU Verordnung 2023/988", 45, 20);
    doc.setFontSize(9); doc.text(`Shop: ${shopName} | Erstellt: ${date} | Produkte: ${checks.length}`, 20, 28);

    // SCORE BOX
    doc.setFillColor(246, 246, 247); doc.rect(20, 33, 170, 22, "F");
    doc.setFontSize(13); doc.setTextColor("#000"); doc.text(`Dokumentations-Status: ${score}%`, 22, 41);
    doc.setFontSize(10); doc.text(`Dokumentiert: ${doku} | Handlungsbedarf: ${bedarf} | Gesamt: ${checks.length}`, 22, 48);

    // TABLE HEADER
    let y = 62;
    doc.setFontSize(11); doc.text("Produktliste (Hinterlegte Herstellerangaben):", 20, y); y+=6;
    doc.setFontSize(7); doc.setTextColor("#666");
    doc.text("Nr. Produkt | Hersteller | Status | Hinterlegte Adresse (aus Shopify Metafeld custom.manufacturer_address)", 20, y); y+=4;
    doc.line(20, y, 190, y); y+=4;

    // PRODUCTS
    doc.setTextColor("#000");
    checks.forEach((c, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const line = `${i+1}. ${c.title.slice(0,40)} | ${c.vendor.slice(0,15)} | ${c.status} | ${c.addr? c.addr.slice(0,50) : "-- keine Angabe --"}`;
      doc.text(line, 20, y);
      y+=4;
    });

    // DISCLAIMER
    y+=8;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(9); doc.setTextColor("#0a5c36");
    doc.text("Hinweis zur Nutzung:", 20, y); y+=5;
    doc.setFontSize(7); doc.setTextColor("#333");
    doc.text("1. Dieser Bericht dokumentiert ausschließlich die in Ihrem Shopify-Shop hinterlegten Daten im Metafeld", 20, y); y+=3;
    doc.text(" 'custom.manufacturer_address'. Er dient der internen Dokumentation.", 20, y); y+=4;
    doc.text("2. comply ist ein Dokumentationstool und ersetzt keine Rechtsberatung. Für die rechtliche Bewertung", 20, y); y+=3;
    doc.text(" Ihrer GPSR-Pflichten konsultieren Sie bitte einen Anwalt.", 20, y); y+=4;
    doc.text("3. Der Händler ist selbst für die Richtigkeit und Vollständigkeit der hinterlegten Herstellerangaben", 20, y); y+=3;
    doc.text(" (Name + postalische Anschrift) verantwortlich.", 20, y); y+=6;
    doc.text(`Erstellt am ${date} in Bochum. Bericht-ID: comply-${Date.now().toString().slice(-8)}`, 20, y);

    doc.setFontSize(6); doc.setTextColor("#999");
    doc.text("comply - GPSR Dokumentationstool | Nicht affiliated mit Shopify | EU Verordnung 2023/988 Info: https://ec.europa.eu/gpsr", 20, 290);

    doc.save(`comply-Dokumentation-${shopName}-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div style={{ padding: "24px", background: "#f6f6f7", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "#0a5c36", color: "white", width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</div>
          <div><b>comply</b> <span style={{ color: "#666" }}>GPSR Dokumentation</span><div style={{ fontSize: "11px", color: "#888" }}>Dokumentationstool - keine Rechtsberatung</div></div>
        </div>
        <button onClick={exportPDF} style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>↓ Dokumentation exportieren</button>
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "12px" }}>
        <b>ℹ️ Hinweis:</b> comply hilft dir beim Dokumentieren deiner Herstellerangaben (GPSR). Es ersetzt keine Rechtsberatung.
        Bitte prüfe selbst, ob deine Angaben korrekt und vollständig sind.
      </div>

      <h2 style={{ margin: "0 0 16px 0" }}>Übersicht · {shopName}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "20px" }}>
        <div style={{ background: "white", borderRadius: "10px", padding: "16px" }}><div style={{ fontSize: "12px", color: "#666" }}>Dokumentations-Status</div><div style={{ fontSize: "36px", fontWeight: "800", color: "#0a5c36" }}>{score}%</div></div>
        <div style={{ background: "white", borderRadius: "10px", padding: "16px" }}><div style={{ fontSize: "12px", color: "#666" }}>Status</div><div>Handlungsbedarf: {bedarf}</div><div>Dokumentiert: {doku}</div></div>
        <div style={{ background: "white", borderRadius: "10px", padding: "16px" }}><button onClick={exportPDF} style={{ width: "100%", background: "#0a5c36", color: "white", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer" }}>📄 PDF Dokumentation</button><div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>Für interne Ablage</div></div>
      </div>

      {bedarf > 0 && (
        <div style={{ background: "white", borderRadius: "10px", padding: "14px", marginBottom: "14px", borderLeft: "4px solid #dc2626" }}>
          <fetcher.Form method="post" style={{ display: "flex", gap: "10px" }}>
            <input name="address" required placeholder="Echte Hersteller-Adresse eingeben: z.B. Adidas AG, Adi-Dassler-Str. 1, 91074 Herzogenaurach" style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }} />
            <input type="hidden" name="productIds" value={JSON.stringify(critIds)} />
            <button style={{ background: "#dc2626", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "bold" }}>🚀 {bedarf} dokumentieren</button>
          </fetcher.Form>
          <div style={{ fontSize: "11px", color: "#666", marginTop: "6px" }}>Bitte echte Hersteller-Adresse verwenden. Test-Daten wie "Muster GmbH" nur für Dev-Stores.</div>
        </div>
      )}

      <div style={{ background: "white", borderRadius: "10px", padding: "14px" }}>
        <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
          <thead><tr style={{ color: "#666", borderBottom: "1px solid #eee", textAlign: "left" }}><th>Produkt</th><th>Status</th><th>Hinterlegte Adresse</th></tr></thead>
          <tbody>
            {checks.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "10px 0" }}><b>{c.title}</b><div style={{ fontSize: "11px", color: "#666" }}>{c.vendor}</div></td>
                <td><span style={{ background: c.status === "Handlungsbedarf"? "#dc2626" : "#059669", color: "white", padding: "3px 8px", borderRadius: "12px", fontSize: "11px" }}>{c.status}</span></td>
                <td style={{ fontSize: "11px", maxWidth: "220px" }}>{c.addr || "— keine Angabe"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}