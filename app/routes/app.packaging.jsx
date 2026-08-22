import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { json } from "@remix-run/node";
import {
  Page,
  Card,
  TextField,
  Button,
  BlockStack,
  Text,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const rules = await db.packagingRule.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });
  return json({ rules });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const material = form.get("material");
  const threshold = parseFloat(form.get("threshold"));

  if (!material || isNaN(threshold)) {
    return json({ error: "Material und Schwelle erforderlich" }, { status: 400 });
  }

  await db.packagingRule.create({
    data: {
      shop: session.shop,
      material: material.toString(),
      threshold,
    },
  });

  return json({ success: true });
};

export default function Packaging() {
  const { rules } = useLoaderData();
  const fetcher = useFetcher();
  const [material, setMaterial] = useState("");
  const [threshold, setThreshold] = useState("");

  const isSaving = fetcher.state !== "idle";

  return (
    <Page title="Verpackung">
      <BlockStack gap="400">
        <Card>
          <Box padding="400">
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Neue Regel</Text>
              <fetcher.Form method="post">
                <BlockStack gap="300">
                  <TextField
                    label="Material"
                    name="material"
                    value={material}
                    onChange={setMaterial}
                    autoComplete="off"
                    placeholder="z.B. Karton"
                  />
                  <TextField
                    label="Schwelle"
                    name="threshold"
                    type="number"
                    value={threshold}
                    onChange={setThreshold}
                    autoComplete="off"
                    placeholder="z.B. 5.0"
                  />
                  <Button submit loading={isSaving} primary>
                    Speichern
                  </Button>
                </BlockStack>
              </fetcher.Form>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <Text as="h3" variant="headingMd">Regeln: {rules.length}</Text>
            <Box paddingBlockStart="300">
              {rules.map((r) => (
                <Text key={r.id} as="p">{r.material} - {r.threshold} kg</Text>
              ))}
            </Box>
          </Box>
        </Card>
      </BlockStack>
    </Page>
  );
}