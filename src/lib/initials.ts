/** Iniciales legibles a partir del nombre: primera y última palabra ("María Pérez" → "MP"). */
export function initialsFromName(nombre: string | null | undefined, cedula?: string | null): string {
  const words = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
  if (words.length === 1) return words[0][0].toUpperCase()
  return (cedula ?? '').slice(0, 1).toUpperCase()
}
