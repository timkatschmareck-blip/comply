import { useState } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { json } from "@remix-run/node";
import { Page, Card, TextField, Button, BlockStack, Text, Box, InlineStack, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const rules = await db.packagingRule.findMany({ where: { shop: session.shop } });
  return json({ rules });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "delete") {
    await db.packagingRule.delete({ where: { id: form.get("id") } });
    return json({ status: "deleted" });
  }

  const material = form.get("material");
  const threshold = parseFloat(form.get("threshold"));
  if (!material || isNaN(threshold)) return json({ error: "Fehler" }, { status: 400 });

  await db.packagingRule.create({
    data: { shop: session.shop, material, threshold },
  });
  return json({ status: "success" });
};

export default function Packaging() {
  const { rules } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [material, setMaterial] = useState("");
  const [threshold, setThreshold] = useState("");

  const handleSave = () => {
    const formData = new FormData();
    formData.append("material", material);
    formData.append("threshold", threshold);
    submit(formData, { method: "post" });
    setMaterial(""); setThreshold("");
  };

  const handleDelete = (id) => {
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };

  return (
    <Page title="Verpackung">
      <BlockStack gap="500">
        {actionData?.status === "deleted" && <Banner tone="success">Regel gelöscht</Banner>}
        {actionData?.status === "success" && <Banner tone="success">Regel gespeichert</Banner>}
        
        <Card>
          <Box padding="400">
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Neue Regel</Text>
              <TextField label="Material" value={material} onChange={setMaterial} placeholder="z.B. Karton" autoComplete="off" />
              <TextField label="Schwelle (kg pro Bestellung)" value={threshold} onChange={setThreshold} placeholder="z.B. 0.2" autoComplete="off" />
              <Button onClick={handleSave} primary>Speichern</Button>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Regeln: {rules.length}</Text>
              {rules.map((r) => (
                <Box key={r.id} padding="200" background="bg-surface-secondary" borderRadius="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text>{r.material} - {r.threshold} kg</Text>
                    <Button tone="critical" onClick={() => handleDelete(r.id)}>Löschen</Button>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          </Box>
        </Card>
      </BlockStack>
    </Page>
  );
}