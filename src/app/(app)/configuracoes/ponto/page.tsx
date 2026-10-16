import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { kioskKey } from "@/lib/qr-token";
import { requirePermission } from "@/server/auth/session";
import { baseUrl } from "@/server/base-url";
import { getOrganization } from "@/server/organization";
import { listAllowedLocations } from "@/server/punch-settings";
import { getQrSecret } from "@/server/time-entries";
import { AdjustmentSettingsForm } from "./adjustment-settings-form";
import { Locations } from "./locations";
import { PunchSettingsForm } from "./punch-settings-form";
import { QrPanel } from "./qr-panel";

export const metadata: Metadata = { title: "Configurações de ponto" };

export default async function PunchSettingsPage() {
  await requirePermission("settings:manage");
  const [organization, locations, secret, base] = await Promise.all([
    getOrganization(),
    listAllowedLocations(),
    getQrSecret(),
    baseUrl(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <PunchSettingsForm settings={organization} />
      <Separator className="max-w-xl" />
      <Locations
        locations={locations.map((l) => ({
          id: l.id,
          name: l.name,
          latitude: l.latitude,
          longitude: l.longitude,
          radiusMeters: l.radiusMeters,
          active: l.active,
          entryCount: l._count.timeEntries,
        }))}
      />
      <Separator className="max-w-xl" />
      <AdjustmentSettingsForm settings={organization} />
      <Separator className="max-w-xl" />
      <QrPanel url={`${base}/painel-qr?chave=${kioskKey(secret)}`} />
    </div>
  );
}
