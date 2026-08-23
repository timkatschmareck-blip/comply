import { useLoaderData } from "react-router";
import { json } from "@remix-run/node";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Box,
  InlineStack,
  Badge,
  DataTable,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // 1. Regeln holen
  const rules = await db.packagingRule.findMany({
    where: { shop: session.shop },
  });
  
  // Standard: Wenn keine Regel, nimm 0.2kg pro Order als Demo
  const kartonRegel = rules.find(r => r.material.toLowerCase().includes('karton'));
  const weightPerOrder = kartonRegel ? kartonRegel.threshold : 0.2; // kg

  // 2. Orders holen via GraphQL
  const response = await admin.graphql(
    `#graphql
    query {
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          name
          createdAt
          displayFulfillmentStatus
        }
      }
    }`
  );
  const data = await response.json();
  const orders = data?.data?.orders?.nodes || [];
  
  const totalOrders = orders.length;
  const totalKg = totalOrders * weightPerOrder;

  return json({
    shop: session.shop,
    rules,
    totalOrders,
    totalKg,
    weightPerOrder,
    orders,
  });
};

export default function Dashboard() {
  const { shop, rules, totalOrders, totalKg, weightPerOrder, orders } = useLoaderData();

  return (
    <Page title="LUCID Dashboard">
      <BlockStack gap="500">
        <Card>
          <Box padding="500">
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingLg">Verpackungsbilanz</Text>
                <Badge tone="success">Live - {shop}</Badge>
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                Basierend auf {rules.length} Regel(n). Aktive Regel: {weightPerOrder} kg Karton pro Bestellung
              </Text>
              <Box paddingBlockStart="400">
                <InlineStack gap="400">
                  <Card>
                    <Box padding="400">
                      <Text as="h3" variant="headingMd">{totalOrders}</Text>
                      <Text as="p" tone="subdued">Bestellungen (letzte 50)</Text>
                    </Box>
                  </Card>
                  <Card>
                    <Box padding="400">
                      <Text as="h3" variant="headingMd">{totalKg.toFixed(2)} kg</Text>
                      <Text as="p" tone="subdued">Karton in Verkehr gebracht</Text>
                    </Box>
                  </Card>
                  <Card>
                    <Box padding="400">
                      <Text as="h3" variant="headingMd">{(totalKg * 0.8).toFixed(2)} €</Text>
                      <Text as="p" tone="subdued">Geschätzte Lizenzkosten*</Text>
                    </Box>
                  </Card>
                </InlineStack>
              </Box>
              <Box paddingBlockStart="300">
                <Text as="p" variant="bodySm" tone="subdued">* Beispiel 0,80€ / kg - für deine LUCID Meldung musst du {totalKg.toFixed(2)} kg Pappe melden.</Text>
              </Box>
            </Box>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">Letzte Bestellungen</Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text']}
                headings={['Bestellung', 'Datum', 'Status', 'Verpackung']}
                rows={orders.map(o => [
                  o.name,
                  new Date(o.createdAt).toLocaleDateString('de-DE'),
                  o.displayFulfillmentStatus,
                  `${weightPerOrder} kg`
                ])}
              />
            </BlockStack>
          </Box>
        </Card>
      </BlockStack>
    </Page>
  );
}