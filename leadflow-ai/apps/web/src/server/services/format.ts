const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
export function formatMoneyPlain(value: number): string {
  return `${rub.format(value)} ₽`;
}
