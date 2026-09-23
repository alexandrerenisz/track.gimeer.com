/** Nome completo -> [primeiro nome, resto] pra fn/ln separado (Meta CAPI). */
export function splitName(fullName: string | null | undefined): { firstName: string | null; lastName: string | null } {
  if (!fullName) return { firstName: null, lastName: null };
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { firstName: trimmed, lastName: null };
  return { firstName: trimmed.slice(0, spaceIndex), lastName: trimmed.slice(spaceIndex + 1) };
}
