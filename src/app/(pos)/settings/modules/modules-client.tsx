"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toggleModule } from "@/server/settings/actions";
import { toast } from "sonner";
import { useI18n } from "@/i18n/context";
import {
  ShoppingBag,
  LayoutDashboard,
  ClipboardList,
  DollarSign,
  BarChart3,
  Settings2,
  Tv,
  Music,
  Info,
} from "lucide-react";

type Module = {
  id: string;
  name: string;
  enabled: boolean;
  config: string | null;
  updatedAt: Date;
};

interface ModuleInfo {
  title: string;
  badge: string;
  desc: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isCore?: boolean;
}

const MODULE_DEFINITIONS: Record<string, ModuleInfo> = {
  dashboard: {
    title: "Panel de Control (Dashboard)",
    badge: "Dirección",
    desc: "Vista ejecutiva en tiempo real con indicadores clave del restaurante: total de ventas del día, ticket promedio por cliente, comparativas horarias y productos estrella más vendidos.",
    icon: LayoutDashboard,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    isCore: true,
  },
  order: {
    title: "Punto de Venta / Ventas y Mesas",
    badge: "Principal",
    desc: "Plano visual interactivo de mesas, toma ágil de pedidos en sala para meseros, envío de comandas directas a cocina/barra, división o unión de mesas y cobro rápido.",
    icon: ShoppingBag,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    isCore: true,
  },
  cash: {
    title: "Caja y Arqueo Diario",
    badge: "Finanzas",
    desc: "Control de turnos de cobro: registro del fondo inicial de sencillo/cambio, control de ingresos en efectivo/QR/tarjeta, registro de compras menores y arqueo ciego al cierre de turno.",
    icon: DollarSign,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    isCore: true,
  },
  inventory: {
    title: "Inventario, Almacén y Recetas",
    badge: "Operaciones",
    desc: "Control de stock de ingredientes e insumos, registro de compras y proveedores, alertas automáticas de existencias bajas y escandallos técnicos (descuento automático por plato vendido).",
    icon: ClipboardList,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  reports: {
    title: "Reportes y Estadísticas",
    badge: "Finanzas",
    desc: "Historial completo de ventas, análisis de facturación e impuestos (IVA 13%), margen de ganancia por producto, rendimiento del personal y exportación contable.",
    icon: BarChart3,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  settings: {
    title: "Ajustes y Configuración General",
    badge: "Administración",
    desc: "Gestión de la carta (menú, categorías, precios, modificadores/toppings), áreas y mesas, impresoras de comandas, datos fiscales y permisos de usuarios y roles.",
    icon: Settings2,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-700",
    isCore: true,
  },
  kds: {
    title: "Pantalla de Cocina (KDS)",
    badge: "Producción",
    desc: "Kitchen Display System: pantalla digital para cocineros y baristas que muestra las comandas en preparación en tiempo real, cronómetro de espera por plato y cambio de estados sin gastar papel térmico.",
    icon: Tv,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  karaoke: {
    title: "Karaoke y Salas por Tiempo",
    badge: "Entretenimiento",
    desc: "Tarificación automática de tiempo consumido para salas privadas, mesas VIP o áreas de entretenimiento, con cobro por hora o fracción y contador en vivo en la comanda.",
    icon: Music,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
  },
};

export function ModulesClient({ modules: initialModules }: { modules: Module[] }) {
  const { t } = useI18n();
  const [modules, setModules] = useState(initialModules);

  async function handleToggle(id: string, currentEnabled: boolean, isCore?: boolean) {
    if (isCore && currentEnabled) {
      if (!window.confirm("Este es un módulo esencial del sistema. ¿Estás seguro de que deseas desactivarlo? Dejará de verse en la navegación.")) {
        return;
      }
    }
    const action = !currentEnabled ? t.modules.enabledAction : t.modules.disabledAction;
    setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: !currentEnabled } : m));
    try {
      await toggleModule(id, !currentEnabled);
      toast.success(t.modules.toggled.replace("{action}", action));
    } catch {
      setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: currentEnabled } : m));
      toast.error(t.common.error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">{t.modules.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{t.modules.desc}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {modules.map((m) => {
          const info = MODULE_DEFINITIONS[m.name] || (m.name === "orders" ? MODULE_DEFINITIONS["order"] : null);
          const title = info?.title || m.name;
          const desc = info?.desc || t.modules.noDesc;
          const Icon = info?.icon || Info;
          const iconBg = info?.iconBg || "bg-gray-100";
          const iconColor = info?.iconColor || "text-gray-600";

          return (
            <Card key={m.id} className={`transition-all duration-200 border ${m.enabled ? "border-gray-200 shadow-sm bg-white" : "border-gray-100 bg-gray-50/60 opacity-80"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-bold text-gray-900">
                          {title}
                        </CardTitle>
                        {info?.badge && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            {info.badge}
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                        {desc}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 border-t border-gray-100/80 mt-2">
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={m.enabled ? "default" : "secondary"} className={`text-xs ${m.enabled ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
                      {m.enabled ? t.modules.on : t.modules.off}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {m.enabled ? t.modules.activeStatus : t.modules.inactiveStatus}
                    </span>
                  </div>
                  <Switch
                    checked={m.enabled}
                    onCheckedChange={() => handleToggle(m.id, m.enabled, info?.isCore)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
