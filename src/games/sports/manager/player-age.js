/** Exact birthdays when recorded; year-only records remain explicitly approximate. */
export function getPlayerAge(player, date, year) {
  const currentYear = /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? Number(date.slice(0, 4)) : Number(year);
  if (/^\d{4}-\d{2}-\d{2}$/.test(player.birthDate || "") && /^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return currentYear - Number(player.birthDate.slice(0, 4)) - Number(date.slice(5) < player.birthDate.slice(5));
  }
  return currentYear - player.birthYear;
}
