import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page, Layout, Card, Text, TextField, Button,
  BlockStack, InlineStack, Banner, Box
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const gql = await admin.graphql(`query { products(first: 15) { nodes { id title } } }`);
  const data = await gql.json();
  const shopifyProducts = data.data.products.nodes;

  const settings = await db.shopComplianceSettings.findUnique({
    where: { shop: session.shop }
  }).catch(() => null);
  
  const rules = await db.packagingRule.findMany({
    where: { shop: session.shop }
  }).catch(() => []);

  const products = shopifyProducts.map(p => {
    const r = rules.find(x => x.productId === p.id);
    return {
      ...p,
      paper_g: r?.paper_g ?? settings?.defaultPaper_g ?? 50,
      plastic_g: r?.plastic_g ?? settings?.defaultPlastic_g ?? 10,
    };
  });

  return json({ products, settings });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const type = form.get("type");

  if (type === "settings") {
    const lucidId = String(form.get("lucidId") || "");
    const defaultPaper_g = parseInt(form.get("defaultPaper_g") || "50");
    const defaultPlastic_g = parseInt(form.get("defaultPlastic_g") || "10");
    await db.shopComplianceSettings.upsert({
      where: { shop: session.shop },
      update: { lucidId, defaultPaper_g, defaultPlastic_g },
      create: { shop: session.shop, lucidId, defaultPaper_g, defaultPlastic_g },
    });
    return json({ ok: true, type: "settings" });
  }

  if (type === "product") {
    const productId = String(form.get("productId"));
    const paper_g = parseInt(form.get("paper_g") || "0");
    const plastic_g = parseInt(form.get("plastic_g") || "0");
    await db.packagingRule.upsert({
      where: { shop_productId: { shop: session.shop, productId } },
      update: { paper_g, plastic_g },
      create: { shop: session.shop, productId, paper_g, plastic_g },
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
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">LUCID Einstellungen</Text>
                <fetcher.Form method="post">
                  <input type="hidden" name="type" value="settings" />
                  <BlockStack gap="300">
                    <TextField label="LUCID ID" value={lucidId} onChange={setLucidId} name="lucidId" autoComplete="off" />
                    <InlineStack gap="300">
                      <TextField label="Default Pappe g" type="number" defaultValue={String(settings?.defaultPaper_g ?? 50)} name="defaultPaper_g" autoComplete="off" />
                      <TextField label="Default Plastik g" type="number" defaultValue={String(settings?.defaultPlastic_g ?? 10)} name="defaultPlastic_g" autoComplete="off" />
                    </InlineStack>
                    <Button submit variant="primary" loading={fetcher.state !== "idle"}>Speichern</Button>
                    {fetcher.data?.ok && fetcher.data?.type === "settings" && <Text tone="success">✅ Gespeichert!</Text>}
                  </BlockStack>
                </fetcher.Form>
              </BlockStack>
            </Card>

            {products.map((p) => (
              <Card key={p.id}>
                <fetcher.Form method="post">
                  <input type="hidden" name="type" value="product" />
                  <input type="hidden" name="productId" value={p.id} />
                  <BlockStack gap="300">
                    <Text fontWeight="bold">{p.title}</Text>
                    <InlineStack gap="300" blockAlign="end">
                      <TextField label="Pappe g" type="number" defaultValue={String(p.paper_g)} name="paper_g" autoComplete="off" />
                      <TextField label="Plastik g" type="number" defaultValue={String(p.plastic_g)} name="plastic_g" autoComplete="off" />
                      <Button submit>Save</Button>
                      {fetcher.data?.ok && fetcher.data?.productId === p.id && <Text tone="success">✓</Text>}
                    </InlineStack>
                  </BlockStack>
                </fetcher.Form>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}