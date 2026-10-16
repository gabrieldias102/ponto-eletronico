export const TIME_ZONE = "America/Sao_Paulo";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "medium",
});

export function formatDateTime(date: Date) {
  return dateTime.format(date);
}
