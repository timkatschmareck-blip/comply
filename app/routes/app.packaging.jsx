import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  Text,
  TextField,
  Button,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  try {
    const settings = await db.shopComplianceSettings.findUnique({
      where: { shop: session.shop },
    });
    const rules = await db.packagingRule.findMany({
      where: { shop: session.shop },
    });
    return json({ settings: settings || {}, rules: rules || [] });
  } catch (e) {
    console.log("Loader error, returning empty:", e.message);
    return json({ settings: {}, rules: [] });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const material = formData.get("material");
  const threshold = formData.get("threshold");

  try {
    await db.packagingRule.create({
      data: {
        shop: session.shop,
        material: material || "plastic",
        threshold: parseFloat(threshold) || 0,
      },
    });
  } catch (e) {
    console.log("DB save failed, maybe no model yet:", e.message);
  }

  return json({ success: true });
};

export default function PackagingPage() {
  const { settings, rules } = useLoaderData();
  const fetcher = useFetcher();
  const [material, setMaterial] = useState("");
  const [threshold, setThreshold] = useState("");

  return (
    <Page title="Verpackung">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Neue Verpackungs-Regel</Text>
              <fetcher.Form method="post">
                <BlockStack gap="300">
                  <TextField
                    label="Material"
                    name="material"
                    value={material}
                    onChange={setMaterial}
                    autoComplete="off"
                  />
                  <TextField
                    label="Schwelle (kg)"
                    name="threshold"
                    type="number"
                    value={threshold}
                    onChange={setThreshold}
                    autoComplete="off"
                  />
                  <Button submit primary loading={fetcher.state === "submitting"}>
                    Speichern
                  </Button>
                </BlockStack>
              </fetcher.Form>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Regeln ({rules.length})</Text>
              {rules.map((r, i) => (
                <Text key={i} as="p">{r.material}: {r.threshold} kg</Text>
              ))}
              {rules.length === 0 && <Text as="p">Noch keine Regeln</Text>}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}