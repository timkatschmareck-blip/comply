import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const res = await admin.graphql(`query { products(first: 20) { nodes { id title } } }`);
  const data = await res.json();
  const products = data.data.products.nodes;
  const rules = await db.packagingRule.findMany({ where: { shop } });
  const settings = await db.shopComplianceSettings.findUnique({ where: { shop } });
  return { products, rules, settings };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const fd = await request.formData();
  const type = fd.get("type");
  if (type === "saveRule") {
    const productId = fd.get("productId");
    const paper_g = parseInt(fd.get("paper_g")) || 0;
    const plastic_g = parseInt(fd.get("plastic_g")) || 0;
    await db.packagingRule.upsert({
      where: { shop_productId: { shop: session.shop, productId } },
      update: { paper_g, plastic_g },
      create: { shop: session.shop, productId, paper_g, plastic_g },
    });
  }
  if (type === "saveSettings") {
    await db.shopComplianceSettings.upsert({
      where: { shop: session.shop },
      update: { defaultPaper_g: parseInt(fd.get("defaultPaper_g")) || 50, defaultPlastic_g: parseInt(fd.get("defaultPlastic_g")) || 10, lucidId: fd.get("lucidId") || "" },
      create: { shop: session.shop, defaultPaper_g: parseInt(fd.get("defaultPaper_g")) || 50, defaultPlastic_g: parseInt(fd.get("defaultPlastic_g")) || 10, lucidId: fd.get("lucidId") || "" },
    });
  }
  return null;
};

export default function PackagingPage() {
  const { products, rules, settings } = useLoaderData();
  const fetcher = useFetcher();
  const getRule = (id) => rules.find(r => r.productId === id);
  return (
    <div style={{ padding: 20 }}>
      <h1>📦 VerpackG / LUCID</h1>
      <h2>LUCID Einstellungen</h2>
      <fetcher.Form method="post">
        <input type="hidden" name="type" value="saveSettings" />
        <div>LUCID ID: <input name="lucidId" defaultValue={settings?.lucidId} /></div>
        <div>Default Pappe g: <input name="defaultPaper_g" type="number" defaultValue={settings?.defaultPaper_g || 50} /></div>
        <div>Default Plastik g: <input name="defaultPlastic_g" type="number" defaultValue={settings?.defaultPlastic_g || 10} /></div>
        <button type="submit">Speichern</button>
      </fetcher.Form>
      <h2 style={{ marginTop: 30 }}>Produkte</h2>
      {products.map(p => {
        const rule = getRule(p.id);
        return (
          <div key={p.id} style={{ border: "1px solid #ddd", padding: 10, margin: 10 }}>
            <b>{p.title}</b>
            <fetcher.Form method="post" style={{ display: "flex", gap: 10, marginTop: 5 }}>
              <input type="hidden" name="type" value="saveRule" />
              <input type="hidden" name="productId" value={p.id} />
              <label>Pappe g: <input name="paper_g" type="number" defaultValue={rule?.paper_g || 50} style={{ width: 60 }} /></label>
              <label>Plastik g: <input name="plastic_g" type="number" defaultValue={rule?.plastic_g || 10} style={{ width: 60 }} /></label>
              <button type="submit">Save</button>
            </fetcher.Form>
          </div>
        );
      })}
    </div>
  );
}