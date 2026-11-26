/** Ask Kaaga's money words, shared by the page and the box inside a doc. */

/** "$50" for whole dollars, "$3.20" otherwise. */
export const money = (usd: number) => (Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`);

/** An answer's cost: cents while small ("4.1¢"), dollars past one. */
export function costWords(usd: number): string {
  if (usd >= 1) return money(usd);
  const c = usd * 100;
  if (c < 0.1) return 'under 0.1¢';
  return `${c < 10 ? c.toFixed(1).replace(/\.0$/, '') : Math.round(c)}¢`;
}
