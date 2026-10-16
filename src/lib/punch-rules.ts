import { zonedParts } from "@/lib/time";

/** Máximo de marcações por dia (docs/requisitos.md, seção 5.1). */
export const MAX_PUNCHES_PER_DAY = 8;

export type PunchRequirements = {
  geolocation: boolean;
  geofence: boolean;
  selfie: boolean;
  qrCode: boolean;
};

type Overrides = {
  punchRequireGeolocation: boolean | null;
  punchRequireGeofence: boolean | null;
  punchRequireSelfie: boolean | null;
  punchRequireQrCode: boolean | null;
};

type Defaults = { [K in keyof Overrides]: boolean };

/** Exigências efetivas: o valor do usuário vence; null segue o padrão da empresa. */
export function resolveRequirements(defaults: Defaults, user: Overrides): PunchRequirements {
  const geofence = user.punchRequireGeofence ?? defaults.punchRequireGeofence;
  return {
    // Cerca virtual depende da localização.
    geolocation: geofence || (user.punchRequireGeolocation ?? defaults.punchRequireGeolocation),
    geofence,
    selfie: user.punchRequireSelfie ?? defaults.punchRequireSelfie,
    qrCode: user.punchRequireQrCode ?? defaults.punchRequireQrCode,
  };
}

export type BusinessHours = { start: string; end: string; days: number[] };

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isTimeOfDay(value: string): boolean {
  return HH_MM.test(value);
}

function minutesOf(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** Se `date` (no fuso da empresa) está dentro do horário comercial. */
export function isWithinBusinessHours(date: Date, hours: BusinessHours): boolean {
  const p = zonedParts(date);
  if (!hours.days.includes(p.weekday)) return false;
  const now = p.hour * 60 + p.minute;
  return now >= minutesOf(hours.start) && now < minutesOf(hours.end);
}

export type Point = { latitude: number; longitude: number };

/** Distância em metros entre dois pontos (fórmula de haversine). */
export function distanceMeters(a: Point, b: Point): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Location = Point & { id: string; name: string; radiusMeters: number };

/**
 * Local permitido que contém o ponto, ou o mais próximo (com a distância) se nenhum contiver.
 * A precisão do GPS não amplia o raio: quem configura o raio já deve considerar a margem.
 */
export function matchLocation<L extends Location>(
  point: Point,
  locations: L[],
): { match: L | null; nearest: { location: L; distance: number } | null } {
  let nearest: { location: L; distance: number } | null = null;
  for (const location of locations) {
    const distance = distanceMeters(point, location);
    if (distance <= location.radiusMeters) return { match: location, nearest: { location, distance } };
    if (!nearest || distance < nearest.distance) nearest = { location, distance };
  }
  return { match: null, nearest };
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/** NSR com 9 dígitos, como nos arquivos da Portaria 671. */
export function formatNsr(nsr: bigint | number): string {
  return String(nsr).padStart(9, "0");
}
