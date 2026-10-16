/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shift(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export type HolidaySuggestion = { date: string; name: string; optional: boolean };

/**
 * Feriados nacionais (Leis 662/1949, 6.802/1980 e 14.759/2023) e, opcionalmente,
 * os pontos facultativos mais comuns (Carnaval e Corpus Christi), que a empresa decide se adota.
 */
export function nationalHolidays(year: number, includeOptional = false): HolidaySuggestion[] {
  const easter = easterSunday(year);
  const fixed = (md: string, name: string) => ({ date: `${year}-${md}`, name, optional: false });
  const list: HolidaySuggestion[] = [
    fixed("01-01", "Confraternização Universal"),
    { date: shift(easter, -2), name: "Sexta-feira Santa", optional: false },
    fixed("04-21", "Tiradentes"),
    fixed("05-01", "Dia do Trabalho"),
    fixed("09-07", "Independência do Brasil"),
    fixed("10-12", "Nossa Senhora Aparecida"),
    fixed("11-02", "Finados"),
    fixed("11-15", "Proclamação da República"),
    fixed("11-20", "Dia Nacional de Zumbi e da Consciência Negra"),
    fixed("12-25", "Natal"),
  ];
  if (includeOptional) {
    list.push(
      { date: shift(easter, -48), name: "Carnaval (segunda-feira)", optional: true },
      { date: shift(easter, -47), name: "Carnaval (terça-feira)", optional: true },
      { date: shift(easter, 60), name: "Corpus Christi", optional: true },
    );
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
