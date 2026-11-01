import type { Guardia, TrabajadorPublico, Turno } from '../types/database'
import type { GuardiaUpsert } from '../services/guardiasService'
import { ausenciaEn, isoDate, type Ausencia } from './horario'

export type Cell = string | number | boolean | Date | null | undefined

export interface ImportPreview {
  rows: GuardiaUpsert[]
  errores: string[]
  advertencias: string[]
  celdas: number
}

const CODE_MAP: Record<string, Turno> = {
  m: 'MANANA', manana: 'MANANA', am: 'MANANA',
  t: 'TARDE', tarde: 'TARDE', pm: 'TARDE',
  n: 'NOCHE', noche: 'NOCHE',
  '24': '24H', '24h': '24H', '24 horas': '24H', '24horas': '24H',
}

const normalizar = (v: unknown): string =>
  String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

/** Acepta M/T/N/24, palabras completas y varios turnos separados por coma/espacio. */
export function parseCell(raw: Cell): Turno[] | null {
  if (raw === null || raw === undefined) return []
  const s = String(raw).trim()
  if (!s) return []
  const directo = CODE_MAP[normalizar(s)]
  if (directo) return [directo]
  const partes = s.split(/[\s,;/]+/).filter(Boolean)
  const out: Turno[] = []
  for (const p of partes) {
    const t = CODE_MAP[normalizar(p)]
    if (!t) return null
    if (!out.includes(t)) out.push(t)
  }
  return out
}

/** Parser CSV simple (soporta comillas y separadores , o ;). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') {
      quoted = true
    } else if (c === ',' || c === ';') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

export async function readSpreadsheet(file: File): Promise<Cell[][]> {
  if (file.name.toLowerCase().endsWith('.csv')) return parseCsv(await file.text())
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const rows = await readXlsxFile(file)
  return rows as unknown as Cell[][]
}

export function buildTemplate(month: Date, trabajadores: TrabajadorPublico[]): {
  guardias: (string | number)[][]
  instrucciones: (string | number)[][]
} {
  const y = month.getFullYear()
  const m = month.getMonth()
  const days = new Date(y, m + 1, 0).getDate()
  const header = ['Cédula', 'Apellidos y nombres', 'Departamento', ...Array.from({ length: days }, (_, i) => i + 1)]
  const activos = trabajadores
    .filter((t) => t.estado)
    .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es'))

  const guardias: (string | number)[][] = [
    header,
    ...activos.map((t) => [t.cedula, `${t.apellidos}, ${t.nombres}`, t.departamento ?? '', ...Array(days).fill('')]),
  ]

  const instrucciones: (string | number)[][] = [
    ['Carga masiva de guardias'],
    [`Mes: ${month.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}`],
    [],
    ['Códigos válidos en las celdas:'],
    ['M = Mañana (07:00–13:00)'],
    ['T = Tarde (13:00–19:00)'],
    ['N = Noche (19:00–07:00)'],
    ['24 = 24 horas (07:00–07:00)'],
    [],
    ['Reglas:'],
    ['- Una celda vacía significa sin guardia.'],
    ['- 24 no puede combinarse con M/T/N el mismo día.'],
    ['- Puede indicar más de un turno separado por coma (ej. M,T).'],
    ['- La cédula debe existir en el sistema.'],
    ['- Si la guardia ya existe, se actualiza el departamento.'],
    ['- Las ausencias aprobadas solo generan una advertencia.'],
  ]

  return { guardias, instrucciones }
}

export function parseMatrix(
  data: Cell[][],
  month: Date,
  trabajadores: TrabajadorPublico[],
  guardias: Guardia[],
  ausencias: Ausencia[],
): ImportPreview {
  const y = month.getFullYear()
  const m = month.getMonth()
  const daysInMonth = new Date(y, m + 1, 0).getDate()

  let headerIndex = -1
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    if ((data[i] ?? []).some((c) => normalizar(c) === 'cedula')) { headerIndex = i; break }
  }
  if (headerIndex === -1) headerIndex = 0
  const header = data[headerIndex] ?? []

  const colCedula = header.findIndex((c) => normalizar(c) === 'cedula')
  const colDepto = header.findIndex((c) => normalizar(c) === 'departamento')
  const dayCols: { index: number; day: number }[] = []
  header.forEach((c, index) => {
    const n = Number(String(c ?? '').trim())
    if (Number.isInteger(n) && n >= 1 && n <= 31) dayCols.push({ index, day: n })
  })

  if (colCedula === -1 || dayCols.length === 0) {
    return { rows: [], errores: ['No se encontró la columna "Cédula" o los días del mes en el archivo.'], advertencias: [], celdas: 0 }
  }

  const byCedula = new Map<string, TrabajadorPublico>()
  for (const t of trabajadores) byCedula.set(t.cedula.replace(/\D/g, ''), t)

  const existentes24 = new Set<string>()
  const existentesOtros = new Set<string>()
  for (const g of guardias) {
    const key = `${g.trabajador_id}|${g.fecha}`
    if (g.turno === '24H') existentes24.add(key)
    else existentesOtros.add(key)
  }

  const rows: GuardiaUpsert[] = []
  const seen = new Set<string>()
  const warns = new Set<string>()
  const errores: string[] = []
  const advertencias: string[] = []
  let celdas = 0

  for (let r = headerIndex + 1; r < data.length; r++) {
    const row = data[r] ?? []
    const cedulaRaw = String(row[colCedula] ?? '').replace(/\D/g, '')
    if (!cedulaRaw) continue
    const trabajador = byCedula.get(cedulaRaw)
    if (!trabajador) { errores.push(`Fila ${r + 1}: la cédula ${cedulaRaw} no existe`); continue }

    const deptoCell = colDepto >= 0 ? String(row[colDepto] ?? '').trim() : ''
    const departamento = deptoCell || trabajador.departamento || null

    for (const { index, day } of dayCols) {
      const raw = row[index]
      if (raw === null || raw === undefined || String(raw).trim() === '') continue
      if (day > daysInMonth) { errores.push(`Fila ${r + 1}, día ${day}: fuera del mes seleccionado`); continue }
      const turnos = parseCell(raw)
      celdas++
      if (!turnos) { errores.push(`Fila ${r + 1}, día ${day}: turno "${String(raw)}" inválido`); continue }
      if (turnos.includes('24H') && turnos.length > 1) {
        errores.push(`Fila ${r + 1}, día ${day}: 24H no puede combinarse con otros turnos`)
        continue
      }

      const fecha = isoDate(new Date(y, m, day))
      const key = `${trabajador.id}|${fecha}`
      if (turnos.includes('24H') && existentesOtros.has(key)) {
        errores.push(`Fila ${r + 1}, día ${day}: ${trabajador.apellidos} ya tiene otro turno ese día`)
        continue
      }
      if (turnos.some((t) => t !== '24H') && existentes24.has(key)) {
        errores.push(`Fila ${r + 1}, día ${day}: ${trabajador.apellidos} ya tiene 24H ese día`)
        continue
      }

      for (const turno of turnos) {
        const rowKey = `${trabajador.id}|${fecha}|${turno}`
        if (seen.has(rowKey)) continue
        seen.add(rowKey)
        rows.push({ trabajador_id: trabajador.id, fecha, turno, departamento })
      }

      if (ausenciaEn(ausencias, trabajador.id, fecha) && !warns.has(key)) {
        warns.add(key)
        advertencias.push(`Fila ${r + 1}, día ${day}: ${trabajador.apellidos} tiene una ausencia aprobada ese día`)
      }
    }
  }

  return { rows, errores, advertencias, celdas }
}

function escapeCsv(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadBlob(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadTemplate(month: Date, trabajadores: TrabajadorPublico[], format: 'xlsx' | 'csv'): Promise<void> {
  const { guardias, instrucciones } = buildTemplate(month, trabajadores)
  const base = `plantilla_guardias_${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`

  if (format === 'csv') {
    const csv = '\uFEFF' + guardias.map((r) => r.map(escapeCsv).join(',')).join('\r\n')
    downloadBlob(csv, `${base}.csv`, 'text/csv;charset=utf-8;')
    return
  }

  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  await writeXlsxFile([
    { data: guardias, sheet: 'Guardias' },
    { data: instrucciones, sheet: 'Instrucciones' },
  ]).toFile(`${base}.xlsx`)
}
