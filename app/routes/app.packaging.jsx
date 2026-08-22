import { useState } from "react";
import { useLoaderData, useFetcher, json } from "react-router";
import {
  Page, Layout, Card, Text, TextField, Button,
  BlockStack, InlineStack
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const gql = await admin.graphql(`query { products(first: 15) { nodes { id title } } }`);
  const d = await gql.json();
  const shopifyProducts = d.data.products.nodes;

  const settings = await db.shopComplianceSettings.findUnique({
    where: { shop: session.shop }
  }).catch(()=>null);
  const rules = await db.packagingRule.findMany({
    where: { shop: session.shop }
  }).catch(()=>[]);

  const products = shopifyProducts.map(p => {
    const r = rules.find(x => x.productId === p.id);
    return {
     ...p,
      paper_g: r?.paper_g?? settings?.defaultPaper_g?? 50,
      plastic_g: r?.plastic_g?? settings?.defaultPlastic_g?? 10,
    };
  });
  return json({ products, settings });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const type = form.get("type");

  if (type === "settings") {
    await db.shopComplianceSettings.upsert({
      where: { shop: session.shop },
      update: {
        lucidId: String(form.get("lucidId")||""),
        defaultPaper_g: parseInt(form.get("defaultPaper_g")||"50"),
        defaultPlastic_g: parseInt(form.get("defaultPlastic_g")||"10")
      },
      create: {
        shop: session.shop,
        lucidId: String(form.get("lucidId")||""),
        defaultPaper_g: parseInt(form.get("defaultPaper_g")||"50"),
        defaultPlastic_g: parseInt(form.get("defaultPlastic_g")||"10")
      }
    });
    return json({ ok: true, type: "settings" });
  }
  if (type === "product") {
    const productId = String(form.get("productId"));
    await db.packagingRule.upsert({
      where: { shop_productId: { shop: session.shop, productId } },
      update: {
        paper_g: parseInt(form.get("paper_g")||"0"),
        plastic_g: parseInt(form.get("plastic_g")||"0")
      },
      create: {
        shop: session.shop,
        productId,
        paper_g: parseInt(form.get("paper_g")||"0"),
        plastic_g: parseInt(form.get("plastic_g")||"0")
      }
    });
    return json({ ok: true, type: "product", productId });
  }
  return json({ ok: false });
};

export default function PackagingPage() {
  const { products, settings } = useLoaderData();
  const fetcher = useFetcher();
  const [lucidId, setLucidId] = useState(settings?.lucidId || "");
  return (
    <Page title="📦 VerpackG / LUCID">
      <Layout><Layout.Section>
        <BlockStack gap="500">
          <Card><BlockStack gap="300">
            <Text as="h2" variant="headingMd">LUCID Einstellungen</Text>
            <fetcher.Form method="post">
              <input type="hidden" name="type" value="settings" />
              <TextField label="LUCID ID" value={lucidId} onChange={setLucidId} name="lucidId" autoComplete="off" />
              <InlineStack gap="300">
                <TextField label="Default Pappe g" type="number" defaultValue={String(settings?.defaultPaper_g?? 50)} name="defaultPaper_g" autoComplete="off" />
                <TextField label="Default Plastik g" type="number" defaultValue={String(settings?.defaultPlastic_g?? 10)} name="defaultPlastic_g" autoComplete="off" />
              </InlineStack>
              <Button submit variant="primary">Speichern</Button>
              {fetcher.data?.ok && <Text tone="success">✅ Gespeichert!</Text>}
            </fetcher.Form>
          </BlockStack></Card>
          {products.map(p=>(
            <Card key={p.id}><fetcher.Form method="post">
              <input type="hidden" name="type" value="product" />
              <input type="hidden" name="productId" value={p.id} />
              <Text fontWeight="bold">{p.title}</Text>
              <InlineStack gap="300" blockAlign="end">
                <TextField label="Pappe g" type="number" defaultValue={String(p.paper_g)} name="paper_g" autoComplete="off" />
                <TextField label="Plastik g" type="number" defaultValue={String(p.plastic_g)} name="plastic_g" autoComplete="off" />
                <Button submit>Save</Button>
              </InlineStack>
            </fetcher.Form></Card>
          ))}
        </BlockStack>
      </Layout.Section></Layout>
    </Page>
  );
}