#!/bin/sh
set -e

echo "=== Iniciando Café Andino en Azure ==="
cd /home/site/wwwroot

# Sincronizar esquema y datos iniciales si es necesario
if [ -f "./node_modules/.bin/prisma" ]; then
  echo "Verificando base de datos SQLite..."
  ./node_modules/.bin/prisma db push --skip-generate || true

  if [ ! -f "/home/site/wwwroot/prisma/.seeded" ]; then
    echo "Inicializando catálogo y roles de Café Andino..."
    ./node_modules/.bin/prisma db seed || true
    touch /home/site/wwwroot/prisma/.seeded || true
  fi
fi

echo "Iniciando servidor Next.js..."
exec npm run start
