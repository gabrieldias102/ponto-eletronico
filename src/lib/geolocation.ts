"use client";

export type Position = { latitude: number; longitude: number; accuracy: number };

export class GeolocationError extends Error {}

/** Posição atual do aparelho, com mensagens em português. */
export function getCurrentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GeolocationError("Este navegador não informa a localização."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      (error) => {
        const messages: Record<number, string> = {
          1: "Permita o acesso à localização nas configurações do navegador.",
          2: "Não foi possível obter sua localização. Verifique o GPS.",
          3: "A localização demorou demais para responder. Tente novamente.",
        };
        reject(new GeolocationError(messages[error.code] ?? "Não foi possível obter sua localização."));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
