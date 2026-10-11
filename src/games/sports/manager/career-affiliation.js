// Career year intervals identify a playing club, not loan ownership. Until a
// source also documents the lending club and contract, do not publish loans as
// ordinary permanent registrations, even when no parent stint overlaps.
export function isPublishableCareerStint(stint,year){
  return Boolean(stint&&!stint.loan&&Number.isInteger(stint.from)&&Number.isInteger(stint.to)&&stint.from<Number(year)&&stint.to>Number(year));
}
