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

  const rules = await db.packagingRule.findMany({
    where: { shop: session.shop },
  });
  
  const kartonRegel = rules.find(r => r.material.toLowerCase().includes('karton'));
  const weightPerOrder = kartonRegel ? kartonRegel.threshold : 0.2;

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
  
  return json({
    shop: session.shop,
    rules,
    totalOrders: orders.length,
    totalKg: orders.length * weightPerOrder,
    weightPerOrder,
    orders,
  });
};

export default function Dashboard() {
  const { shop, totalOrders, totalKg, weightPerOrder, orders, rules } = useLoaderData();

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
                Basiert auf {rules.length} Regel(n). Aktiv: {weightPerOrder} kg Karton pro Bestellung
              </Text>
              <InlineStack gap="400">
                <Card>
                  <Box padding="400">
                    <Text as="h3" variant="headingMd">{totalOrders}</Text>
                    <Text as="p" tone="subdued">Bestellungen</Text>
                  </Box>
                </Card>
                <Card>
                  <Box padding="400">
                    <Text as="h3" variant="headingMd">{totalKg.toFixed(2)} kg</Text>
                    <Text as="p" tone="subdued">Karton gesamt</Text>
                  </Box>
                </Card>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Für LUCID musst du {totalKg.toFixed(2)} kg Pappe melden.
              </Text>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">Letzte Bestellungen</Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text']}
                headings={['Bestellung', 'Datum', 'Status', 'Verpackung']}
                rows={orders.map((o) => [
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