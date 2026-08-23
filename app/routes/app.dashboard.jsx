import { useLoaderData } from "react-router";
import { json } from "@remix-run/node";
import { Page, Card, Text, BlockStack, Box, Badge, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    const rules = await db.packagingRule.findMany({ 
      where: { shop: session.shop } 
    });
    
    let orderCount = 0;
    try {
      const response = await admin.graphql(` query { ordersCount { count } } `);
      const data = await response.json();
      orderCount = data.data?.ordersCount?.count || 0;
    } catch (e) {
      orderCount = 1;
    }

    const totalKg = rules.reduce((sum, r) => sum + (r.threshold * orderCount), 0);

    return json({ 
      shop: session.shop,
      rules, 
      orderCount,
      totalKg 
    });
  } catch (error) {
    return json({ 
      shop: "unknown",
      rules: [], 
      orderCount: 0,
      totalKg: 0,
    });
  }
};

export default function Dashboard() {
  const { shop, rules, orderCount, totalKg } = useLoaderData();

  return (
    <Page title="comply Dashboard">
      <BlockStack gap="500">
        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Live Status</Text>
              <Text>Shop: {shop}</Text>
              <Badge tone="success">Live - verbunden</Badge>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Verpackung</Text>
              <Text>Aktiv: {rules.length} Regel(n)</Text>
              {rules.map(r => (
                <Text key={r.id}>{r.material} - {r.threshold} kg</Text>
              ))}
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Berechnung</Text>
              <Text as="p" variant="heading2xl">{orderCount} Bestellungen</Text>
              <Text as="p" variant="heading2xl">{totalKg.toFixed(2)} kg Karton gesamt</Text>
              <Text tone="subdued">Regel: 0,2 kg pro Bestellung</Text>
            </BlockStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">LUCID Export (PPWR)</Text>
              <Text>Für die Zentrale Stelle Verpackungsregister - 1-Klick Export</Text>
              <Button primary url={`/api/export?shop=${shop}`}>
                CSV für LUCID herunterladen
              </Button>
            </BlockStack>
          </Box>
        </Card>

      </BlockStack>
    </Page>
  );
}