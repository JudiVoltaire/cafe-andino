import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";

const db = new PrismaClient({ adapter: new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" }) });

async function main() {
  console.log("🌱 Sembrando Café Andino...\n");

  // ========== MONEDAS ==========
  await db.currency.upsert({ where: { code: "BOB" }, update: {}, create: { code: "BOB", name: "Boliviano", symbol: "Bs", rate: 1, isDefault: true, sortOrder: 1 } });
  await db.currency.upsert({ where: { code: "USD" }, update: {}, create: { code: "USD", name: "Dólar estadounidense", symbol: "$", rate: 0.145, isDefault: false, sortOrder: 2 } });
  await db.currency.upsert({ where: { code: "EUR" }, update: {}, create: { code: "EUR", name: "Euro", symbol: "€", rate: 0.135, isDefault: false, sortOrder: 3 } });
  console.log("✅ Monedas");

  // ========== ROLES ==========
  const adminRole = await db.role.upsert({ where: { name: "Admin" }, update: {}, create: { name: "Admin", permissions: JSON.stringify(["*"]), scopes: JSON.stringify(["*"]) } });
  await db.role.upsert({ where: { name: "Gerente" }, update: {}, create: { name: "Gerente", permissions: JSON.stringify(["reports.view", "settings.*", "inventory.*", "cash.view"]), scopes: JSON.stringify(["reports", "settings", "inventory", "cash"]) } });
  await db.role.upsert({ where: { name: "Cajero" }, update: {}, create: { name: "Cajero", permissions: JSON.stringify(["order.*", "payments.*"]), scopes: JSON.stringify(["order", "cash"]) } });
  await db.role.upsert({ where: { name: "Mesero" }, update: {}, create: { name: "Mesero", permissions: JSON.stringify(["order.open", "order.item_add", "order.send"]), scopes: JSON.stringify(["order"]) } });
  console.log("✅ Roles");

  // ========== USUARIOS ==========
  const hashPwd = await hash("admin123", 12);
  const hashEben = await hash("Cuandomirasalabismo", 12);
  await db.user.upsert({ where: { username: "admin" }, update: {}, create: { username: "admin", password: hashPwd, name: "Administrador", roleId: adminRole.id } });
  await db.user.upsert({ where: { username: "Eben Ezer" }, update: { password: hashEben, name: "Eben Ezer" }, create: { username: "Eben Ezer", password: hashEben, name: "Eben Ezer", roleId: adminRole.id } });
  await db.user.upsert({ where: { username: "cajero" }, update: {}, create: { username: "cajero", password: hashPwd, name: "Cajero Principal", roleId: (await db.role.findUniqueOrThrow({ where: { name: "Cajero" } })).id } });
  await db.user.upsert({ where: { username: "mesero" }, update: {}, create: { username: "mesero", password: hashPwd, name: "Mesero Principal", roleId: (await db.role.findUniqueOrThrow({ where: { name: "Mesero" } })).id } });
  console.log("✅ Usuarios (admin, Eben Ezer, cajero, mesero)");

  // ========== CONFIGURACIÓN GENERAL ==========
  await db.generalConfig.upsert({ where: { id: "default" }, update: {}, create: { restaurantName: "Café Andino", address: "Av. 16 de Julio 123, La Paz, Bolivia", phone: "59171234567", currencyCode: "BOB", timezone: "America/La_Paz", dateFormat: "dd/MM/yyyy" } });
  console.log("✅ Configuración");

  // ========== IVA (Bolivia 13%) ==========
  const vat13 = await db.vat.upsert({ where: { code: "IVA13" }, update: {}, create: { code: "IVA13", name: "IVA 13%", rate: 0.13 } });
  const vat0 = await db.vat.upsert({ where: { code: "IVA0" }, update: {}, create: { code: "IVA0", name: "Exento (0%)", rate: 0 } });
  console.log("✅ IVA (13%, 0%)");

  // ========== IMPUESTO ESPECIAL ==========
  await db.exciseTax.upsert({ where: { code: "NINGUNO" }, update: {}, create: { code: "NINGUNO", name: "Sin impuesto especial", rate: 0 } });
  console.log("✅ Impuesto especial");

  // ========== UNIDADES ==========
  const uPorcion = await db.unit.upsert({ where: { name: "Porción" }, update: {}, create: { name: "Porción" } });
  const uTaza = await db.unit.upsert({ where: { name: "Taza" }, update: {}, create: { name: "Taza" } });
  const uVaso = await db.unit.upsert({ where: { name: "Vaso" }, update: {}, create: { name: "Vaso" } });
  const uPlato = await db.unit.upsert({ where: { name: "Plato" }, update: {}, create: { name: "Plato" } });
  const uUnidad = await db.unit.upsert({ where: { name: "Unidad" }, update: {}, create: { name: "Unidad" } });
  const uKg = await db.unit.upsert({ where: { name: "Kg" }, update: {}, create: { name: "Kg" } });
  const uGramo = await db.unit.upsert({ where: { name: "Gramo" }, update: {}, create: { name: "Gramo" } });
  const uMl = await db.unit.upsert({ where: { name: "Ml" }, update: {}, create: { name: "Ml" } });
  const uLitro = await db.unit.upsert({ where: { name: "Litro" }, update: {}, create: { name: "Litro" } });
  console.log("✅ Unidades");

  // ========== CATEGORÍAS ==========
  const catDesayuno = await db.category.upsert({ where: { slug: "desayunos" }, update: {}, create: { name: "Desayunos", slug: "desayunos", sortOrder: 1 } });
  const catCaliente = await db.category.upsert({ where: { slug: "bebidas-calientes" }, update: {}, create: { name: "Bebidas calientes", slug: "bebidas-calientes", sortOrder: 2 } });
  const catJugos = await db.category.upsert({ where: { slug: "jugos" }, update: {}, create: { name: "Jugos y bebidas frías", slug: "jugos", sortOrder: 3 } });
  const catPanes = await db.category.upsert({ where: { slug: "panes" }, update: {}, create: { name: "Panes y repostería", slug: "panes", sortOrder: 4 } });
  console.log("✅ Categorías (4)");

  // ========== PRODUCTOS ==========
  const products = await Promise.all([
    // Desayunos
    db.product.upsert({ where: { slug: "saltena-carne" }, update: {}, create: { name: "Salteña de carne", slug: "saltena-carne", price: 7, costPrice: 3.5, categoryId: catDesayuno.id, vatId: vat13.id, unitId: uPorcion.id, sortOrder: 1 } }),
    db.product.upsert({ where: { slug: "saltena-pollo" }, update: {}, create: { name: "Salteña de pollo", slug: "saltena-pollo", price: 6, costPrice: 3, categoryId: catDesayuno.id, vatId: vat13.id, unitId: uPorcion.id, sortOrder: 2 } }),
    db.product.upsert({ where: { slug: "api-con-pastel" }, update: {}, create: { name: "Api morado con pastel", slug: "api-con-pastel", price: 12, costPrice: 5, categoryId: catDesayuno.id, vatId: vat13.id, unitId: uPorcion.id, sortOrder: 3 } }),
    db.product.upsert({ where: { slug: "desayuno-completo" }, update: {}, create: { name: "Desayuno completo", slug: "desayuno-completo", price: 25, costPrice: 12, categoryId: catDesayuno.id, vatId: vat13.id, unitId: uPlato.id, sortOrder: 4 } }),
    db.product.upsert({ where: { slug: "huminta" }, update: {}, create: { name: "Huminta", slug: "huminta", price: 7, costPrice: 3, categoryId: catDesayuno.id, vatId: vat13.id, unitId: uPorcion.id, sortOrder: 5 } }),
    db.product.upsert({ where: { slug: "sonso-yuca" }, update: {}, create: { name: "Sonso de yuca", slug: "sonso-yuca", price: 10, costPrice: 4, categoryId: catDesayuno.id, vatId: vat13.id, unitId: uPorcion.id, sortOrder: 6 } }),
    db.product.upsert({ where: { slug: "sopa-mani" }, update: {}, create: { name: "Sopa de maní", slug: "sopa-mani", price: 18, costPrice: 8, categoryId: catDesayuno.id, vatId: vat13.id, unitId: uPlato.id, sortOrder: 7 } }),
    // Bebidas calientes
    db.product.upsert({ where: { slug: "cafe-americano" }, update: {}, create: { name: "Café americano", slug: "cafe-americano", price: 8, costPrice: 3, categoryId: catCaliente.id, vatId: vat13.id, unitId: uTaza.id, sortOrder: 1 } }),
    db.product.upsert({ where: { slug: "cafe-con-leche" }, update: {}, create: { name: "Café con leche", slug: "cafe-con-leche", price: 12, costPrice: 5, categoryId: catCaliente.id, vatId: vat13.id, unitId: uTaza.id, sortOrder: 2 } }),
    db.product.upsert({ where: { slug: "capuchino" }, update: {}, create: { name: "Capuchino", slug: "capuchino", price: 15, costPrice: 6, categoryId: catCaliente.id, vatId: vat13.id, unitId: uTaza.id, sortOrder: 3 } }),
    db.product.upsert({ where: { slug: "chocolate-caliente" }, update: {}, create: { name: "Chocolate caliente", slug: "chocolate-caliente", price: 12, costPrice: 5, categoryId: catCaliente.id, vatId: vat13.id, unitId: uTaza.id, sortOrder: 4 } }),
    db.product.upsert({ where: { slug: "api-morado" }, update: {}, create: { name: "Api morado", slug: "api-morado", price: 8, costPrice: 3, categoryId: catCaliente.id, vatId: vat13.id, unitId: uVaso.id, sortOrder: 5 } }),
    db.product.upsert({ where: { slug: "te-de-coca" }, update: {}, create: { name: "Té de coca", slug: "te-de-coca", price: 6, costPrice: 2, categoryId: catCaliente.id, vatId: vat13.id, unitId: uTaza.id, sortOrder: 6 } }),
    // Jugos y bebidas frías
    db.product.upsert({ where: { slug: "jugo-naranja" }, update: {}, create: { name: "Jugo de naranja", slug: "jugo-naranja", price: 10, costPrice: 4, categoryId: catJugos.id, vatId: vat13.id, unitId: uVaso.id, sortOrder: 1 } }),
    db.product.upsert({ where: { slug: "jugo-papaya" }, update: {}, create: { name: "Jugo de papaya", slug: "jugo-papaya", price: 10, costPrice: 4, categoryId: catJugos.id, vatId: vat13.id, unitId: uVaso.id, sortOrder: 2 } }),
    db.product.upsert({ where: { slug: "frutilla-leche" }, update: {}, create: { name: "Frutilla con leche", slug: "frutilla-leche", price: 12, costPrice: 6, categoryId: catJugos.id, vatId: vat13.id, unitId: uVaso.id, sortOrder: 3 } }),
    db.product.upsert({ where: { slug: "limonada" }, update: {}, create: { name: "Limonada", slug: "limonada", price: 8, costPrice: 2, categoryId: catJugos.id, vatId: vat13.id, unitId: uVaso.id, sortOrder: 4 } }),
    // Panes y repostería
    db.product.upsert({ where: { slug: "marraqueta" }, update: {}, create: { name: "Marraqueta", slug: "marraqueta", price: 1.5, costPrice: 0.5, categoryId: catPanes.id, vatId: vat0.id, unitId: uUnidad.id, sortOrder: 1 } }),
    db.product.upsert({ where: { slug: "pan-con-queso" }, update: {}, create: { name: "Pan con queso", slug: "pan-con-queso", price: 6, costPrice: 2.5, categoryId: catPanes.id, vatId: vat13.id, unitId: uUnidad.id, sortOrder: 2 } }),
    db.product.upsert({ where: { slug: "empanada-queso" }, update: {}, create: { name: "Empanada de queso", slug: "empanada-queso", price: 6, costPrice: 2.5, categoryId: catPanes.id, vatId: vat13.id, unitId: uUnidad.id, sortOrder: 3 } }),
    db.product.upsert({ where: { slug: "empanada-pollo" }, update: {}, create: { name: "Empanada de pollo", slug: "empanada-pollo", price: 7, costPrice: 3, categoryId: catPanes.id, vatId: vat13.id, unitId: uUnidad.id, sortOrder: 4 } }),
    db.product.upsert({ where: { slug: "pastel-queso" }, update: {}, create: { name: "Pastel de queso", slug: "pastel-queso", price: 5, costPrice: 2, categoryId: catPanes.id, vatId: vat13.id, unitId: uUnidad.id, sortOrder: 5 } }),
  ]);
  console.log(`✅ Productos (${products.length})`);

  // ========== GRUPOS DE TOPPINGS ==========
  const tgTamaño = await db.toppingGroup.upsert({ where: { id: "tg-tamano" }, update: {}, create: { id: "tg-tamano", name: "Tamaño", type: "SINGLE" } });
  const tgExtras = await db.toppingGroup.upsert({ where: { id: "tg-extras" }, update: {}, create: { id: "tg-extras", name: "Extras", type: "MULTIPLE" } });

  await db.topping.upsert({ where: { id: "top-mediano" }, update: {}, create: { id: "top-mediano", name: "Mediano", price: 0, toppingGroupId: tgTamaño.id, sortOrder: 1 } });
  await db.topping.upsert({ where: { id: "top-grande" }, update: {}, create: { id: "top-grande", name: "Grande", price: 3, toppingGroupId: tgTamaño.id, sortOrder: 2 } });
  await db.topping.upsert({ where: { id: "top-queso-extra" }, update: {}, create: { id: "top-queso-extra", name: "Queso extra", price: 3, toppingGroupId: tgExtras.id, sortOrder: 1 } });
  await db.topping.upsert({ where: { id: "top-huevo-extra" }, update: {}, create: { id: "top-huevo-extra", name: "Huevo extra", price: 2, toppingGroupId: tgExtras.id, sortOrder: 2 } });
  await db.topping.upsert({ where: { id: "top-aguacate" }, update: {}, create: { id: "top-aguacate", name: "Aguacate", price: 3, toppingGroupId: tgExtras.id, sortOrder: 3 } });
  console.log("✅ Toppings");

  // Vincular toppings a productos
  const saltenaCarne = await db.product.findUniqueOrThrow({ where: { slug: "saltena-carne" } });
  const saltenaPollo = await db.product.findUniqueOrThrow({ where: { slug: "saltena-pollo" } });
  const desayuno = await db.product.findUniqueOrThrow({ where: { slug: "desayuno-completo" } });
  const cafeLeche = await db.product.findUniqueOrThrow({ where: { slug: "cafe-con-leche" } });
  const capuchino = await db.product.findUniqueOrThrow({ where: { slug: "capuchino" } });
  const jugoNaranja = await db.product.findUniqueOrThrow({ where: { slug: "jugo-naranja" } });
  const frutilla = await db.product.findUniqueOrThrow({ where: { slug: "frutilla-leche" } });

  for (const p of [saltenaCarne, saltenaPollo, desayuno]) {
    await db.productToppingGroup.upsert({ where: { productId_toppingGroupId: { productId: p.id, toppingGroupId: tgExtras.id } }, update: {}, create: { productId: p.id, toppingGroupId: tgExtras.id } });
  }
  for (const p of [cafeLeche, capuchino, jugoNaranja, frutilla]) {
    await db.productToppingGroup.upsert({ where: { productId_toppingGroupId: { productId: p.id, toppingGroupId: tgTamaño.id } }, update: {}, create: { productId: p.id, toppingGroupId: tgTamaño.id } });
  }

  // ========== INGREDIENTES ==========
  const ingredients = await Promise.all([
    db.ingredient.upsert({ where: { id: "ing-harina" }, update: {}, create: { id: "ing-harina", name: "Harina de trigo", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 20, minStock: 5, purchasePrice: 25, costPerBaseUnit: 0.025, supplier: "Distribuidora Andina" } }),
    db.ingredient.upsert({ where: { id: "ing-queso" }, update: {}, create: { id: "ing-queso", name: "Queso criollo", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 8, minStock: 2, purchasePrice: 60, costPerBaseUnit: 0.06, supplier: "Mercado Rodríguez" } }),
    db.ingredient.upsert({ where: { id: "ing-huevo" }, update: {}, create: { id: "ing-huevo", name: "Huevo", purchaseUnit: "Unidad", baseUnit: "Unidad", conversionFactor: 1, currentStock: 120, minStock: 24, purchasePrice: 0.8, costPerBaseUnit: 0.8, supplier: "Granja El Alto" } }),
    db.ingredient.upsert({ where: { id: "ing-carne" }, update: {}, create: { id: "ing-carne", name: "Carne de res", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 6, minStock: 1.5, purchasePrice: 45, costPerBaseUnit: 0.045, supplier: "Mercado Rodríguez" } }),
    db.ingredient.upsert({ where: { id: "ing-pollo" }, update: {}, create: { id: "ing-pollo", name: "Pollo", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 6, minStock: 1.5, purchasePrice: 30, costPerBaseUnit: 0.03, supplier: "IMBA" } }),
    db.ingredient.upsert({ where: { id: "ing-cafe" }, update: {}, create: { id: "ing-cafe", name: "Café molido", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 5, minStock: 1, purchasePrice: 120, costPerBaseUnit: 0.12, supplier: "Café Yungas" } }),
    db.ingredient.upsert({ where: { id: "ing-leche" }, update: {}, create: { id: "ing-leche", name: "Leche", purchaseUnit: "Litro", baseUnit: "Ml", conversionFactor: 1000, currentStock: 20, minStock: 3, purchasePrice: 7, costPerBaseUnit: 0.007, supplier: "PIL Andina" } }),
    db.ingredient.upsert({ where: { id: "ing-azucar" }, update: {}, create: { id: "ing-azucar", name: "Azúcar", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 10, minStock: 2, purchasePrice: 8, costPerBaseUnit: 0.008, supplier: "Ingenio Guabirá" } }),
    db.ingredient.upsert({ where: { id: "ing-maiz" }, update: {}, create: { id: "ing-maiz", name: "Maíz morado", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 8, minStock: 2, purchasePrice: 15, costPerBaseUnit: 0.015, supplier: "Mercado Rodríguez" } }),
    db.ingredient.upsert({ where: { id: "ing-canela" }, update: {}, create: { id: "ing-canela", name: "Canela", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 1, minStock: 0.2, purchasePrice: 200, costPerBaseUnit: 0.2, supplier: "Mercado Rodríguez" } }),
    db.ingredient.upsert({ where: { id: "ing-naranja" }, update: {}, create: { id: "ing-naranja", name: "Naranja", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 10, minStock: 2, purchasePrice: 6, costPerBaseUnit: 0.006, supplier: "Frutas del Valle" } }),
    db.ingredient.upsert({ where: { id: "ing-papaya" }, update: {}, create: { id: "ing-papaya", name: "Papaya", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 8, minStock: 2, purchasePrice: 8, costPerBaseUnit: 0.008, supplier: "Frutas del Valle" } }),
    db.ingredient.upsert({ where: { id: "ing-frutilla" }, update: {}, create: { id: "ing-frutilla", name: "Frutilla", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 5, minStock: 1, purchasePrice: 25, costPerBaseUnit: 0.025, supplier: "Frutas del Valle" } }),
    db.ingredient.upsert({ where: { id: "ing-limon" }, update: {}, create: { id: "ing-limon", name: "Limón", purchaseUnit: "Unidad", baseUnit: "Unidad", conversionFactor: 1, currentStock: 40, minStock: 10, purchasePrice: 1, costPerBaseUnit: 1, supplier: "Frutas del Valle" } }),
    db.ingredient.upsert({ where: { id: "ing-cacao" }, update: {}, create: { id: "ing-cacao", name: "Cacao en polvo", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 3, minStock: 0.5, purchasePrice: 80, costPerBaseUnit: 0.08, supplier: "El Ceibo" } }),
    db.ingredient.upsert({ where: { id: "ing-yuca" }, update: {}, create: { id: "ing-yuca", name: "Yuca", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 5, minStock: 1, purchasePrice: 8, costPerBaseUnit: 0.008, supplier: "Mercado Rodríguez" } }),
    db.ingredient.upsert({ where: { id: "ing-mani" }, update: {}, create: { id: "ing-mani", name: "Maní", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 4, minStock: 1, purchasePrice: 18, costPerBaseUnit: 0.018, supplier: "Mercado Rodríguez" } }),
    db.ingredient.upsert({ where: { id: "ing-papa" }, update: {}, create: { id: "ing-papa", name: "Papa", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 10, minStock: 2, purchasePrice: 6, costPerBaseUnit: 0.006, supplier: "Mercado Rodríguez" } }),
    db.ingredient.upsert({ where: { id: "ing-aceite" }, update: {}, create: { id: "ing-aceite", name: "Aceite", purchaseUnit: "Litro", baseUnit: "Ml", conversionFactor: 1000, currentStock: 8, minStock: 1, purchasePrice: 12, costPerBaseUnit: 0.012, supplier: "FINO" } }),
    db.ingredient.upsert({ where: { id: "ing-sal" }, update: {}, create: { id: "ing-sal", name: "Sal", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 3, minStock: 0.5, purchasePrice: 3, costPerBaseUnit: 0.003, supplier: "Distribuidora Andina" } }),
    db.ingredient.upsert({ where: { id: "ing-te" }, update: {}, create: { id: "ing-te", name: "Té de coca", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 1, minStock: 0.2, purchasePrice: 150, costPerBaseUnit: 0.15, supplier: "Los Yungas" } }),
    db.ingredient.upsert({ where: { id: "ing-levadura" }, update: {}, create: { id: "ing-levadura", name: "Levadura", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 1, minStock: 0.2, purchasePrice: 60, costPerBaseUnit: 0.06, supplier: "Distribuidora Andina" } }),
    db.ingredient.upsert({ where: { id: "ing-arveja" }, update: {}, create: { id: "ing-arveja", name: "Arveja", purchaseUnit: "Kg", baseUnit: "Gramo", conversionFactor: 1000, currentStock: 2, minStock: 0.5, purchasePrice: 10, costPerBaseUnit: 0.01, supplier: "Mercado Rodríguez" } }),
  ]);
  console.log(`✅ Ingredientes (${ingredients.length})`);

  // ========== RECETAS ==========
  const recipeData: { productSlug: string; items: { ingredientId: string; quantity: number; unitId: string }[] }[] = [
    { productSlug: "saltena-carne", items: [
      { ingredientId: "ing-harina", quantity: 60, unitId: uGramo.id },
      { ingredientId: "ing-carne", quantity: 40, unitId: uGramo.id },
      { ingredientId: "ing-huevo", quantity: 0.25, unitId: uUnidad.id },
      { ingredientId: "ing-papa", quantity: 30, unitId: uGramo.id },
      { ingredientId: "ing-aceite", quantity: 10, unitId: uMl.id },
      { ingredientId: "ing-sal", quantity: 2, unitId: uGramo.id },
    ]},
    { productSlug: "saltena-pollo", items: [
      { ingredientId: "ing-harina", quantity: 60, unitId: uGramo.id },
      { ingredientId: "ing-pollo", quantity: 40, unitId: uGramo.id },
      { ingredientId: "ing-huevo", quantity: 0.25, unitId: uUnidad.id },
      { ingredientId: "ing-papa", quantity: 30, unitId: uGramo.id },
      { ingredientId: "ing-aceite", quantity: 10, unitId: uMl.id },
      { ingredientId: "ing-sal", quantity: 2, unitId: uGramo.id },
    ]},
    { productSlug: "api-con-pastel", items: [
      { ingredientId: "ing-maiz", quantity: 40, unitId: uGramo.id },
      { ingredientId: "ing-canela", quantity: 2, unitId: uGramo.id },
      { ingredientId: "ing-azucar", quantity: 15, unitId: uGramo.id },
      { ingredientId: "ing-limon", quantity: 0.25, unitId: uUnidad.id },
      { ingredientId: "ing-harina", quantity: 60, unitId: uGramo.id },
      { ingredientId: "ing-queso", quantity: 30, unitId: uGramo.id },
    ]},
    { productSlug: "desayuno-completo", items: [
      { ingredientId: "ing-huevo", quantity: 2, unitId: uUnidad.id },
      { ingredientId: "ing-queso", quantity: 30, unitId: uGramo.id },
      { ingredientId: "ing-harina", quantity: 60, unitId: uGramo.id },
      { ingredientId: "ing-cafe", quantity: 10, unitId: uGramo.id },
      { ingredientId: "ing-leche", quantity: 50, unitId: uMl.id },
    ]},
    { productSlug: "huminta", items: [
      { ingredientId: "ing-maiz", quantity: 80, unitId: uGramo.id },
      { ingredientId: "ing-queso", quantity: 30, unitId: uGramo.id },
      { ingredientId: "ing-azucar", quantity: 10, unitId: uGramo.id },
      { ingredientId: "ing-canela", quantity: 1, unitId: uGramo.id },
    ]},
    { productSlug: "sonso-yuca", items: [
      { ingredientId: "ing-yuca", quantity: 120, unitId: uGramo.id },
      { ingredientId: "ing-queso", quantity: 40, unitId: uGramo.id },
    ]},
    { productSlug: "sopa-mani", items: [
      { ingredientId: "ing-mani", quantity: 40, unitId: uGramo.id },
      { ingredientId: "ing-carne", quantity: 50, unitId: uGramo.id },
      { ingredientId: "ing-arveja", quantity: 20, unitId: uGramo.id },
      { ingredientId: "ing-papa", quantity: 40, unitId: uGramo.id },
      { ingredientId: "ing-aceite", quantity: 10, unitId: uMl.id },
      { ingredientId: "ing-sal", quantity: 2, unitId: uGramo.id },
    ]},
    { productSlug: "cafe-americano", items: [
      { ingredientId: "ing-cafe", quantity: 12, unitId: uGramo.id },
    ]},
    { productSlug: "cafe-con-leche", items: [
      { ingredientId: "ing-cafe", quantity: 12, unitId: uGramo.id },
      { ingredientId: "ing-leche", quantity: 100, unitId: uMl.id },
    ]},
    { productSlug: "capuchino", items: [
      { ingredientId: "ing-cafe", quantity: 12, unitId: uGramo.id },
      { ingredientId: "ing-leche", quantity: 80, unitId: uMl.id },
      { ingredientId: "ing-azucar", quantity: 5, unitId: uGramo.id },
    ]},
    { productSlug: "chocolate-caliente", items: [
      { ingredientId: "ing-cacao", quantity: 20, unitId: uGramo.id },
      { ingredientId: "ing-leche", quantity: 200, unitId: uMl.id },
      { ingredientId: "ing-azucar", quantity: 10, unitId: uGramo.id },
    ]},
    { productSlug: "api-morado", items: [
      { ingredientId: "ing-maiz", quantity: 30, unitId: uGramo.id },
      { ingredientId: "ing-canela", quantity: 2, unitId: uGramo.id },
      { ingredientId: "ing-azucar", quantity: 12, unitId: uGramo.id },
      { ingredientId: "ing-limon", quantity: 0.25, unitId: uUnidad.id },
    ]},
    { productSlug: "te-de-coca", items: [
      { ingredientId: "ing-te", quantity: 3, unitId: uGramo.id },
    ]},
    { productSlug: "jugo-naranja", items: [
      { ingredientId: "ing-naranja", quantity: 300, unitId: uGramo.id },
      { ingredientId: "ing-azucar", quantity: 8, unitId: uGramo.id },
    ]},
    { productSlug: "jugo-papaya", items: [
      { ingredientId: "ing-papaya", quantity: 300, unitId: uGramo.id },
      { ingredientId: "ing-azucar", quantity: 8, unitId: uGramo.id },
    ]},
    { productSlug: "frutilla-leche", items: [
      { ingredientId: "ing-frutilla", quantity: 150, unitId: uGramo.id },
      { ingredientId: "ing-leche", quantity: 200, unitId: uMl.id },
      { ingredientId: "ing-azucar", quantity: 10, unitId: uGramo.id },
    ]},
    { productSlug: "limonada", items: [
      { ingredientId: "ing-limon", quantity: 1, unitId: uUnidad.id },
      { ingredientId: "ing-azucar", quantity: 15, unitId: uGramo.id },
    ]},
    { productSlug: "marraqueta", items: [
      { ingredientId: "ing-harina", quantity: 80, unitId: uGramo.id },
      { ingredientId: "ing-sal", quantity: 2, unitId: uGramo.id },
      { ingredientId: "ing-levadura", quantity: 1, unitId: uGramo.id },
    ]},
    { productSlug: "pan-con-queso", items: [
      { ingredientId: "ing-harina", quantity: 80, unitId: uGramo.id },
      { ingredientId: "ing-queso", quantity: 40, unitId: uGramo.id },
    ]},
    { productSlug: "empanada-queso", items: [
      { ingredientId: "ing-harina", quantity: 60, unitId: uGramo.id },
      { ingredientId: "ing-queso", quantity: 40, unitId: uGramo.id },
      { ingredientId: "ing-aceite", quantity: 15, unitId: uMl.id },
      { ingredientId: "ing-sal", quantity: 1, unitId: uGramo.id },
    ]},
    { productSlug: "empanada-pollo", items: [
      { ingredientId: "ing-harina", quantity: 60, unitId: uGramo.id },
      { ingredientId: "ing-pollo", quantity: 40, unitId: uGramo.id },
      { ingredientId: "ing-aceite", quantity: 15, unitId: uMl.id },
      { ingredientId: "ing-sal", quantity: 1, unitId: uGramo.id },
    ]},
    { productSlug: "pastel-queso", items: [
      { ingredientId: "ing-harina", quantity: 50, unitId: uGramo.id },
      { ingredientId: "ing-queso", quantity: 40, unitId: uGramo.id },
      { ingredientId: "ing-azucar", quantity: 8, unitId: uGramo.id },
      { ingredientId: "ing-huevo", quantity: 0.5, unitId: uUnidad.id },
    ]},
  ];

  for (const r of recipeData) {
    const product = await db.product.findUniqueOrThrow({ where: { slug: r.productSlug } });
    for (const item of r.items) {
      await db.ingredientRecipe.upsert({
        where: { id: `rec-${r.productSlug}-${item.ingredientId}` },
        update: { quantity: item.quantity },
        create: {
          id: `rec-${r.productSlug}-${item.ingredientId}`,
          productId: product.id, ingredientId: item.ingredientId, quantity: item.quantity, unitId: item.unitId,
        },
      });
    }
    await db.product.update({ where: { id: product.id }, data: { costPrice: await calcProductCost(product.id) } });
  }
  console.log(`✅ Recetas (${recipeData.length} productos)`);

  // ========== ÁREAS Y MESAS ==========
  const areaSalon = await db.area.upsert({ where: { id: "area-salon" }, update: { type: "RESTAURANT" }, create: { id: "area-salon", name: "Salón", type: "RESTAURANT", sortOrder: 1 } });
  const areaTerraza = await db.area.upsert({ where: { id: "area-terraza" }, update: { type: "RESTAURANT" }, create: { id: "area-terraza", name: "Terraza", type: "RESTAURANT", sortOrder: 2 } });
  const areaLlevar = await db.area.upsert({ where: { id: "area-llevar" }, update: {}, create: { id: "area-llevar", name: "Para llevar", type: "TAKEAWAY", sortOrder: 3 } });

  const salonCaps = [2, 4, 4, 6, 2, 4, 6, 4];
  for (let i = 1; i <= 8; i++) {
    const name = `M${String(i).padStart(2, "0")}`;
    await db.table.upsert({ where: { id: `t-${name}` }, update: {}, create: { id: `t-${name}`, name, areaId: areaSalon.id, capacity: salonCaps[i - 1] } });
  }
  for (let i = 9; i <= 12; i++) {
    const name = `M${String(i).padStart(2, "0")}`;
    await db.table.upsert({ where: { id: `t-${name}` }, update: {}, create: { id: `t-${name}`, name, areaId: areaTerraza.id, capacity: 4 } });
  }
  await db.table.upsert({ where: { id: "t-llevar" }, update: {}, create: { id: "t-llevar", name: "Para llevar", areaId: areaLlevar.id, capacity: 0 } });
  console.log("✅ Áreas (3) y mesas (13)");

  // ========== MÉTODOS DE PAGO ==========
  await db.paymentMethod.upsert({ where: { code: "CASH" }, update: {}, create: { name: "Efectivo", code: "CASH", sortOrder: 1 } });
  await db.paymentMethod.upsert({ where: { code: "QR_SIMPLE" }, update: {}, create: { name: "QR Simple", code: "QR_SIMPLE", sortOrder: 2 } });
  await db.paymentMethod.upsert({ where: { code: "CARD" }, update: {}, create: { name: "Tarjeta", code: "CARD", sortOrder: 3 } });
  console.log("✅ Métodos de pago");

  // ========== CATEGORÍAS DE FLUJO DE CAJA ==========
  await db.cashFlowCategory.upsert({ where: { id: "inc-sales" }, update: {}, create: { id: "inc-sales", name: "Ventas", type: "INCOME", sortOrder: 1 } });
  await db.cashFlowCategory.upsert({ where: { id: "inc-ventas" }, update: {}, create: { id: "inc-ventas", name: "Ventas", type: "INCOME", sortOrder: 1 } });
  await db.cashFlowCategory.upsert({ where: { id: "inc-otros" }, update: {}, create: { id: "inc-otros", name: "Otros ingresos", type: "INCOME", sortOrder: 2 } });
  await db.cashFlowCategory.upsert({ where: { id: "exp-insumos" }, update: {}, create: { id: "exp-insumos", name: "Compra de insumos", type: "EXPENSE", sortOrder: 1 } });
  await db.cashFlowCategory.upsert({ where: { id: "exp-sueldos" }, update: {}, create: { id: "exp-sueldos", name: "Sueldos", type: "EXPENSE", sortOrder: 2 } });
  await db.cashFlowCategory.upsert({ where: { id: "exp-alquiler" }, update: {}, create: { id: "exp-alquiler", name: "Alquiler", type: "EXPENSE", sortOrder: 3 } });
  await db.cashFlowCategory.upsert({ where: { id: "exp-otros" }, update: {}, create: { id: "exp-otros", name: "Otros gastos", type: "EXPENSE", sortOrder: 4 } });
  console.log("✅ Categorías de caja");

  // ========== MÓDULOS DEL SISTEMA ==========
  await db.systemModule.upsert({ where: { name: "dashboard" }, update: {}, create: { name: "dashboard", enabled: true } });
  await db.systemModule.upsert({ where: { name: "order" }, update: {}, create: { name: "order", enabled: true } });
  await db.systemModule.upsert({ where: { name: "inventory" }, update: {}, create: { name: "inventory", enabled: true } });
  await db.systemModule.upsert({ where: { name: "cash" }, update: {}, create: { name: "cash", enabled: true } });
  await db.systemModule.upsert({ where: { name: "reports" }, update: {}, create: { name: "reports", enabled: true } });
  await db.systemModule.upsert({ where: { name: "settings" }, update: {}, create: { name: "settings", enabled: true } });
  await db.systemModule.upsert({ where: { name: "kds" }, update: {}, create: { name: "kds", enabled: false } });
  await db.systemModule.upsert({ where: { name: "karaoke" }, update: {}, create: { name: "karaoke", enabled: false } });
  console.log("✅ Módulos del sistema");

  // ========== RECARGOS ==========
  await db.serviceCharge.upsert({
    where: { id: "sc-servicio" },
    update: {},
    create: { id: "sc-servicio", name: "Servicio", type: "SERVICE_FEE", value: 0, scope: "ALL", applyCondition: "ALL_DAYS", isActive: false },
  });
  await db.serviceCharge.upsert({
    where: { id: "sc-feriado" },
    update: {},
    create: { id: "sc-feriado", name: "Recargo feriado", type: "FIXED", value: 2, scope: "ALL", applyCondition: "HOLIDAY", isActive: true },
  });
  console.log("✅ Recargos");

  // ========== FESTIVOS ==========
  const holidays = [
    { name: "Año Nuevo", date: "2026-01-01" },
    { name: "Carnaval (lunes)", date: "2026-02-16" },
    { name: "Carnaval (martes)", date: "2026-02-17" },
    { name: "Viernes Santo", date: "2026-04-03" },
    { name: "Día del Trabajo", date: "2026-05-01" },
    { name: "Corpus Christi", date: "2026-06-04" },
    { name: "Año Nuevo Aymara", date: "2026-06-21" },
    { name: "Día de la Patria", date: "2026-08-06" },
    { name: "Todos los Santos", date: "2026-11-02" },
    { name: "Navidad", date: "2026-12-25" },
  ];
  for (const h of holidays) {
    await db.holiday.upsert({ where: { date: new Date(h.date) }, update: {}, create: { ...h, date: new Date(h.date) } });
  }
  console.log("✅ Festivos (10)");

  // ========== RESUMEN ==========
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 ¡Seed completado!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   👤 admin / admin123");
  console.log(`   🍽️  ${products.length} productos`);
  console.log(`   📦  ${ingredients.length} ingredientes`);
  console.log(`   📋  ${recipeData.length} recetas`);
  console.log("   🏠  3 áreas, 13 mesas");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

async function calcProductCost(productId: string): Promise<number> {
  const recipes = await db.ingredientRecipe.findMany({ where: { productId }, include: { ingredient: true } });
  return recipes.reduce((sum, r) => sum + r.ingredient.costPerBaseUnit * r.quantity, 0);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
