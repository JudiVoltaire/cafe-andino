import { createClient } from "@libsql/client";

const localClient = createClient({
  url: "file:./prisma/dev.db",
});

async function run() {
  const tables = await localClient.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'"
  );
  console.log("Total tables found:", tables.rows.length);
  for (const row of tables.rows) {
    const count = await localClient.execute(`SELECT COUNT(*) as c FROM "${row.name}"`);
    console.log(`- ${row.name}: ${count.rows[0].c} records`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
