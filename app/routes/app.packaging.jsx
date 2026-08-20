import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const rules = await db.packagingRule.findMany({ where: { shop } }).catch(()=>[]);
  let settings = await db.shopComplianceSettings.findUnique({ where: { shop } }).catch(()=>null);
  if (!settings) settings = { lucidId: "", defaultPaper_g: 50, defaultPlastic_g: 10 };
  return { products: [], rules, settings };
};
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const fd = await request.formData();
  const type = fd.get("type");

  if (type === "saveRule") {
    const productId = fd.get("productId");
    const paper_g = parseInt(fd.get("paper_g")) || 0;
    const plastic_g = parseInt(fd.get("plastic_g")) || 0;
    await db.packagingRule.upsert({
      where: { shop_productId: { shop, productId } },
      update: { paper_g, plastic_g },
      create: { shop, productId, paper_g, plastic_g },
    });
  }
  if (type === "saveSettings") {
    const lucidId = fd.get("lucidId") || "";
    const defaultPaper_g = parseInt(fd.get("defaultPaper_g")) || 0;
    const defaultPlastic_g = parseInt(fd.get("defaultPlastic_g")) || 0;
    await db.shopComplianceSettings.upsert({
      where: { shop },
      update: { lucidId, defaultPaper_g, defaultPlastic_g },
      create: { shop, lucidId, defaultPaper_g, defaultPlastic_g },
    });
  }
  return null;
};

export default function PackagingPage() {
  const { products, rules, settings } = useLoaderData();
  const fetcher = useFetcher();
  const getRule = (id) => rules.find(r => r.productId === id);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>📦 VerpackG / LUCID</h1>
      <h2>LUCID Einstellungen</h2>
      <fetcher.Form method="post" style={{ border: "1px solid #ccc", padding: 10, marginBottom: 20 }}>
        <input type="hidden" name="type" value="saveSettings" />
        <div>LUCID ID: <input name="lucidId" defaultValue={settings.lucidId} /></div>
        <div>Default Pappe g: <input name="defaultPaper_g" type="number" defaultValue={settings.defaultPaper_g} /></div>
        <div>Default Plastik g: <input name="defaultPlastic_g" type="number" defaultValue={settings.defaultPlastic_g} /></div>
        <button type="submit">Speichern</button>
      </fetcher.Form>

      <h2 style={{ marginTop: 30 }}>Produkte</h2>
      {products.map(p => {
        const rule = getRule(p.id);
        return (
          <div key={p.id} style={{ border: "1px solid #ddd", padding: 10, marginBottom: 10 }}>
            <b>{p.title}</b>
            <fetcher.Form method="post" style={{ display: "flex", gap: 10, marginTop: 5 }}>
              <input type="hidden" name="type" value="saveRule" />
              <input type="hidden" name="productId" value={p.id} />
              <label>Pappe g: <input name="paper_g" type="number" defaultValue={rule?.paper_g || 0} /></label>
              <label>Plastik g: <input name="plastic_g" type="number" defaultValue={rule?.plastic_g || 0} /></label>
              <button type="submit">Save</button>
            </fetcher.Form>
          </div>
        );
      })}
    </div>
  );
}