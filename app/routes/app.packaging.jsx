import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { json } from "@remix-run/node";
import {
  Page, Layout, Card, Text, TextField, Button, BlockStack
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const rules = await db.packagingRule.findMany({
    where: { shop: session.shop },
  });
  return json({ rules });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  await db.packagingRule.create({
    data: {
      shop: session.shop,
      material: form.get("material"),
      threshold: parseFloat(form.get("threshold")),
    },
  });
  return json({ ok: true });
};

export default function Packaging() {
  const { rules } = useLoaderData();
  const fetcher = useFetcher();
  const [mat, setMat] = useState("");
  const [thr, setThr] = useState("");

  return (
    <Page title="Verpackung">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Neue Regel</Text>
              <fetcher.Form method="post">
                <TextField label="Material" name="material" value={mat} onChange={setMat} />
                <TextField label="Schwelle" name="threshold" value={thr} onChange={setThr} type="number" />
                <Button submit primary>Speichern</Button>
              </fetcher.Form>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Regeln: {rules.length}</Text>
              {rules.map((r) => (
                <Text key={r.id} as="p">{r.material} - {r.threshold}kg</Text>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}