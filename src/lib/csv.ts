/** Descarga filas como CSV (con BOM para Excel y escapado básico). */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const content = '\uFEFF' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
