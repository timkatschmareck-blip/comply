import { useState } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import { json } from "@remix-run/node";
import { Page, Card, TextField, Button, BlockStack, Text, Box, InlineStack, Banner, Select, Divider } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const rules = await db.packagingRule.findMany({ 
    where: { shop: session.shop },
    orderBy: { createdAt: 'desc' }
  });
  return json({ rules });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "delete") {
    const id = form.get("id");
    if (!id) return json({ error: "ID fehlt" }, { status: 400 });
    await db.packagingRule.delete({ where: { id } });
    return json({ status: "deleted" });
  }

  if (intent === "export") {
    const rules = await db.packagingRule.findMany({ where: { shop: session.shop } });
    let csv = "Material,Masse_in_kg,Beispiel\n";
    const grouped = rules.reduce((acc, r) => {
      acc[r.material] = (acc[r.material] || 0) + parseFloat(r.threshold || 0);
      return acc;
    }, {});
    Object.entries(grouped).forEach(([material, weightGramm]) => {
      const kg = (weightGramm / 1000).toFixed(3);
      csv += `${material},${kg},VerpackG Meldung\n`;
    });
    return json({ status: "export", csv, filename: `LUCID_${new Date().toISOString().split('T')[0]}.csv` });
  }

  const material = form.get("material");
  const threshold = parseFloat(form.get("threshold"));
  if (!material || isNaN(threshold) || threshold <= 0) {
    return json({ error: "Bitte Material und gültiges Gewicht eingeben" }, { status: 400 });
  }
  await db.packagingRule.create({
    data: { shop: session.shop, material, threshold },
  });
  return json({ status: "success" });
};

const LUCID_MATERIALS = [
  { label: "Papier / Pappe / Karton (PPK)", value: "PAP" },
  { label: "Kunststoff", value: "Kunststoff" },
  { label: "Glas", value: "Glas" },
  { label: "Metalle (FE)", value: "FE" },
  { label: "Metalle (ALU)", value: "ALU" },
  { label: "Holz", value: "Holz" },
  { label: "Getränkekarton", value: "Getränkekarton" },
  { label: "Sonstige", value: "Sonstige" },
];

export default function Packaging() {
  const { rules } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [material, setMaterial] = useState("PAP");
  const [threshold, setThreshold] = useState("");
  const handleSave = () => {
    const formData = new FormData();
    formData.append("material", material);
    formData.append("threshold", threshold);
    submit(formData, { method: "post" });
    setThreshold("");
  };
  const handleDelete = (id) => {
    if (!confirm("Wirklich löschen?")) return;
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id);
    submit(formData, { method: "post" });
  };
  const handleExport = () => {
    const formData = new FormData();
    formData.append("intent", "export");
    submit(formData, { method: "post" });
  };
  const downloadCSV = () => {
    if (!actionData?.csv) return;
    const blob = new Blob([actionData.csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = actionData.filename;
    a.click();
  };
  const totalWeight = rules.reduce((sum, r) => sum + parseFloat(r.threshold || 0), 0);
  return (
    <Page title="VerpackG / LUCID" subtitle="Verpackungsgewichte für Zentrale Stelle">
      <BlockStack gap="500">
        {actionData?.error && <Banner tone="critical">{actionData.error}</Banner>}
        {actionData?.status === "deleted" && <Banner tone="success">Regel gelöscht</Banner>}
        {actionData?.status === "success" && <Banner tone="success">Regel gespeichert - {totalWeight}g gesamt</Banner>}
        {actionData?.status === "export" && (
          <Banner tone="success" action={{ content: "CSV Herunterladen", onAction: downloadCSV }}>LUCID Export bereit!</Banner>
        )}
        <Card>
          <Box padding="400">
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Neue Verpackung erfassen</Text>
              <Select label="LUCID Material" options={LUCID_MATERIALS} value={material} onChange={setMaterial} />
              <TextField label="Gewicht pro Bestellung (Gramm)" value={threshold} onChange={setThreshold} placeholder="z.B. 120" autoComplete="off" type="number" suffix="g" />
              <Button onClick={handleSave} variant="primary">Speichern</Button>
            </BlockStack>
          </Box>
        </Card>
        <Card>
          <Box padding="400">
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">Erfasste Verpackungen: {rules.length} | Gesamt: {totalWeight}g</Text>
                <Button onClick={handleExport} disabled={rules.length === 0}>LUCID CSV Export</Button>
              </InlineStack>
              <Divider />
              {rules.length === 0 ? (
                <Text tone="subdued">Noch keine Verpackungen erfasst.</Text>
              ) : (
                rules.map((r) => (
                  <Box key={r.id} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="bold">{r.material}</Text>
                        <Text tone="subdued">{r.threshold}g pro Bestellung</Text>
                      </BlockStack>
                      <Button tone="critical" onClick={() => handleDelete(r.id)}>Löschen</Button>
                    </InlineStack>
                  </Box>
                ))
              )}
            </BlockStack>
          </Box>
        </Card>
      </BlockStack>
    </Page>
  );
}