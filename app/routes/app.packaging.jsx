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

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "saveRule") {
    const productId = String(form.get("productId"));
    const paper_g = parseInt(String(form.get("paper_g") || "0"), 10);
    const plastic_g = parseInt(String(form.get("plastic_g") || "0"), 10);
    await db.packagingRule.upsert({
      where: { shop_productId: { shop, productId } },
      update: { paper_g, plastic_g },
      create: { shop, productId, paper_g, plastic_g },
    });
    return { ok: true };
  }
  if (intent === "saveSettings") {
    const lucidId = String(form.get("lucidId") || "");
    const defaultPaper_g = parseInt(String(form.get("defaultPaper_g") || "50"), 10);
    const defaultPlastic_g = parseInt(String(form.get("defaultPlastic_g") || "10"), 10);
    await db.shopComplianceSettings.upsert({
      where: { shop },
      update: { lucidId, defaultPaper_g, defaultPlastic_g },
      create: { shop, lucidId, defaultPaper_g, defaultPlastic_g },
    });
    return { ok: true };
  }
  return { ok: false };
};

export default function Packaging() {
  const { products, rules, settings } = useLoaderData();
  const fetcher = useFetcher();
  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>📦 VerpackG / LUCID</h1>
      <p>Minimal Loader aktiv - wenn du das siehst, ist die Wolke weg!</p>
      <div style={{ border: "1px solid #ccc", padding: 15, marginBottom: 20 }}>
        <h3>Globale Settings</h3>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="saveSettings" />
          <div><label>LUCID ID: <input name="lucidId" defaultValue={settings?.lucidId} style={{ width: 300 }} /></label></div>
          <div><label>Papier default (g): <input type="number" name="defaultPaper_g" defaultValue={settings?.defaultPaper_g} /></label></div>
          <div><label>Plastik default (g): <input type="number" name="defaultPlastic_g" defaultValue={settings?.defaultPlastic_g} /></label></div>
          <button type="submit">Speichern</button>
        </fetcher.Form>
      </div>
    </div>
  );
}