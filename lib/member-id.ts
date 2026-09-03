// Membership id: pgpgs-<year from dateSurvived>-<sequence> e.g. pgpgs-2024-0001
export function buildMemberId(dateSurvived: string, sequence: number): string {
  const yearMatch = dateSurvived.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
  return `pgpgs-${year}-${String(sequence).padStart(4, "0")}`;
}
