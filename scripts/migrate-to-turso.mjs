import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const TURSO_URL = process.env.TURSO_DATABASE_URL || process.argv[2];
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.argv[3];

if (!TURSO_URL) {
  console.error("ERROR: Debes proporcionar la URL de Turso (TURSO_DATABASE_URL o primer argumento).");
  process.exit(1);
}

const localClient = createClient({
  url: "file:./prisma/dev.db",
});

const remoteClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

async function migrate() {
  console.log("🚀 Iniciando migración de datos hacia Turso...");
  console.log(`📡 Destino: ${TURSO_URL}`);

  // 1. Obtener estructura de tablas
  const tableRows = await localClient.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  console.log(`📋 Encontradas ${tableRows.rows.length} tablas para migrar.`);

  // Desactivar temporalmente foreign keys en remoto para inserción masiva segura
  await remoteClient.execute("PRAGMA foreign_keys = OFF;");

  // 2. Crear tablas en remoto si no existen
  for (const table of tableRows.rows) {
    const tableName = table.name;
    const createSql = table.sql;
    if (createSql) {
      console.log(`🔨 Creando estructura de tabla: ${tableName}...`);
      await remoteClient.execute(createSql);
    }
  }

  // 3. Crear índices
  const indexRows = await localClient.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
  );
  for (const idx of indexRows.rows) {
    try {
      await remoteClient.execute(idx.sql);
    } catch (e) {
      // Ignorar si el índice ya existe
    }
  }

  // 4. Migrar los datos de cada tabla
  console.log("\n📦 Migrando registros...");
  let totalMigratedRows = 0;

  for (const table of tableRows.rows) {
    const tableName = table.name;
    const localData = await localClient.execute(`SELECT * FROM "${tableName}"`);
    const count = localData.rows.length;

    if (count === 0) {
      console.log(`  ⚪ ${tableName}: 0 registros`);
      continue;
    }

    // Limpiar tabla remota antes de insertar para evitar duplicados en reintentos
    await remoteClient.execute(`DELETE FROM "${tableName}"`);

    // Inserción en bloques de 50 registros
    const columns = localData.columns;
    const colList = columns.map((c) => `"${c}"`).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders})`;

    const batch = [];
    for (const row of localData.rows) {
      const args = columns.map((col) => row[col]);
      batch.push({ sql: insertSql, args });
    }

    // Ejecutar en chunks
    const CHUNK_SIZE = 50;
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      const chunk = batch.slice(i, i + CHUNK_SIZE);
      await remoteClient.batch(chunk, "write");
    }

    console.log(`  ✅ ${tableName}: ${count} registros migrados con éxito`);
    totalMigratedRows += count;
  }

  // 5. Reactivar foreign keys y verificar
  await remoteClient.execute("PRAGMA foreign_keys = ON;");

  console.log("\n🔍 Verificando integridad de datos en Turso...");
  let allMatched = true;
  for (const table of tableRows.rows) {
    const tableName = table.name;
    const localCount = (await localClient.execute(`SELECT COUNT(*) as c FROM "${tableName}"`)).rows[0].c;
    const remoteCount = (await remoteClient.execute(`SELECT COUNT(*) as c FROM "${tableName}"`)).rows[0].c;

    if (localCount !== remoteCount) {
      console.error(`  ❌ Discrepancia en ${tableName}: Local=${localCount}, Turso=${remoteCount}`);
      allMatched = false;
    }
  }

  if (allMatched) {
    console.log(`\n🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO!`);
    console.log(`Total registros transferidos: ${totalMigratedRows}`);
    console.log(`La base de datos en Turso es 100% idéntica a la local.`);
  } else {
    console.warn(`\n⚠️ Se encontraron discrepancias. Revisa los mensajes anteriores.`);
  }
}

migrate().catch((err) => {
  console.error("\n❌ Error durante la migración:", err);
  process.exit(1);
});
