#!/bin/sh
set -e

echo "=== Iniciando Café Andino ==="
cd /home/site/wwwroot

# Sincronizar esquema de base de datos SQLite si es necesario
if [ -f "./node_modules/.bin/prisma" ]; then
  echo "Verificando base de datos SQLite..."
  ./node_modules/.bin/prisma db push --skip-generate || true
fi

echo "Iniciando servidor Next.js..."
exec npm run start
