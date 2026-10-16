import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  formatNsr,
  isTimeOfDay,
  isValidCoordinate,
  isWithinBusinessHours,
  matchLocation,
  resolveRequirements,
} from "./punch-rules";

const defaults = {
  punchRequireGeolocation: true,
  punchRequireGeofence: false,
  punchRequireSelfie: true,
  punchRequireQrCode: false,
};
const inherit = {
  punchRequireGeolocation: null,
  punchRequireGeofence: null,
  punchRequireSelfie: null,
  punchRequireQrCode: null,
};

describe("resolveRequirements", () => {
  it("segue o padrão da empresa quando o usuário não sobrescreve", () => {
    expect(resolveRequirements(defaults, inherit)).toEqual({
      geolocation: true,
      geofence: false,
      selfie: true,
      qrCode: false,
    });
  });

  it("o valor do usuário vence o padrão", () => {
    const r = resolveRequirements(defaults, { ...inherit, punchRequireSelfie: false, punchRequireQrCode: true });
    expect(r.selfie).toBe(false);
    expect(r.qrCode).toBe(true);
  });

  it("cerca virtual implica geolocalização", () => {
    const r = resolveRequirements(
      { ...defaults, punchRequireGeolocation: false },
      { ...inherit, punchRequireGeofence: true },
    );
    expect(r.geofence).toBe(true);
    expect(r.geolocation).toBe(true);
  });

  it("funcionário remoto pode dispensar a cerca", () => {
    const r = resolveRequirements({ ...defaults, punchRequireGeofence: true }, { ...inherit, punchRequireGeofence: false });
    expect(r.geofence).toBe(false);
  });
});

describe("isWithinBusinessHours", () => {
  const hours = { start: "08:00", end: "18:00", days: [1, 2, 3, 4, 5] };

  it("dentro do horário em dia útil", () => {
    // sexta, 16/10/2026, 09:00 em São Paulo
    expect(isWithinBusinessHours(new Date("2026-10-16T12:00:00Z"), hours)).toBe(true);
  });

  it("antes do início e no horário de término", () => {
    expect(isWithinBusinessHours(new Date("2026-10-16T10:59:00Z"), hours)).toBe(false); // 07:59
    expect(isWithinBusinessHours(new Date("2026-10-16T21:00:00Z"), hours)).toBe(false); // 18:00
  });

  it("fim de semana fica fora", () => {
    // sábado, 17/10/2026, 10:00
    expect(isWithinBusinessHours(new Date("2026-10-17T13:00:00Z"), hours)).toBe(false);
  });

  it("valida o formato HH:mm", () => {
    expect(isTimeOfDay("08:00")).toBe(true);
    expect(isTimeOfDay("23:59")).toBe(true);
    expect(isTimeOfDay("24:00")).toBe(false);
    expect(isTimeOfDay("8:00")).toBe(false);
  });
});

describe("cerca virtual", () => {
  const paulista = { latitude: -23.5614, longitude: -46.6559 };
  const se = { latitude: -23.5503, longitude: -46.6339 };

  it("calcula distâncias reais", () => {
    const d = distanceMeters(paulista, se);
    expect(d).toBeGreaterThan(2_400);
    expect(d).toBeLessThan(2_700);
    expect(distanceMeters(paulista, paulista)).toBe(0);
  });

  it("encontra o local que contém o ponto", () => {
    const locations = [
      { id: "a", name: "Sé", ...se, radiusMeters: 200 },
      { id: "b", name: "Paulista", ...paulista, radiusMeters: 150 },
    ];
    const point = { latitude: -23.5616, longitude: -46.6561 }; // ~30 m da Paulista
    expect(matchLocation(point, locations).match?.id).toBe("b");
  });

  it("informa o local mais próximo quando está fora de todos", () => {
    const locations = [{ id: "a", name: "Sé", ...se, radiusMeters: 200 }];
    const result = matchLocation(paulista, locations);
    expect(result.match).toBeNull();
    expect(result.nearest?.location.id).toBe("a");
    expect(result.nearest?.distance).toBeGreaterThan(2_000);
  });

  it("sem locais cadastrados não há correspondência", () => {
    expect(matchLocation(paulista, [])).toEqual({ match: null, nearest: null });
  });

  it("valida coordenadas", () => {
    expect(isValidCoordinate(-23.5, -46.6)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(NaN, 0)).toBe(false);
  });
});

describe("formatNsr", () => {
  it("usa 9 dígitos", () => {
    expect(formatNsr(1n)).toBe("000000001");
    expect(formatNsr(123456789n)).toBe("123456789");
  });
});
