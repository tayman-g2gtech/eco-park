// ─── exportSalariesExcel.js ──────────────────────────────────────────────────
// Professional Excel export for Eco-Park — Masse Salariale Mensuelle
// 1 sheet: "Masse Salariale"
// Uses xlsx-js-style (SheetJS fork with cell-level styling support)
// ─────────────────────────────────────────────────────────────────────────────
import XLSXStyle from 'xlsx-js-style'

// ─── Brand Colour Palette (Print-Safe) ──────────────────────────────────────
const C = {
  TITLE_BG:      'D1FAE5',  // emerald-100  — header banner (same as other exports)
  TITLE_FG:      '064E3B',  // emerald-900
  SUBTITLE_BG:   'ECFDF5',  // emerald-50
  SUBTITLE_FG:   '065F46',  // emerald-800
  COL_HDR_BG:    'E2E8F0',  // slate-200    — column headers
  COL_HDR_FG:    '0F172A',  // slate-950
  ROW_ODD:       'FFFFFF',
  ROW_EVEN:      'F8FAFC',  // slate-50
  MENSUEL_BG:    'EFF6FF',  // blue-50
  MENSUEL_FG:    '1D4ED8',  // blue-700
  JOURNALIER_BG: 'FFFBEB',  // amber-50
  JOURNALIER_FG: 'B45309',  // amber-700
  GRAND_BG:      'E2E8F0',  // slate-200    — total row (same as other exports)
  GRAND_FG:      '0F172A',  // slate-950
  BORDER:        'CBD5E1',  // slate-300
  BORDER_DARK:   '64748B',  // slate-500
}

// ─── Border helpers ──────────────────────────────────────────────────────────
const thinBorder = (clr = C.BORDER)      => ({ style: 'thin',   color: { rgb: clr } })
const medBorder  = (clr = C.BORDER_DARK) => ({ style: 'medium', color: { rgb: clr } })

const allBorders    = (thin) => ({ top: thin, bottom: thin, left: thin, right: thin })
const allMedBorders = ()     => ({ top: medBorder(), bottom: medBorder(), left: medBorder(), right: medBorder() })

// ─── Style factory ───────────────────────────────────────────────────────────
function makeStyle(opts = {}) {
  const style = {
    font: {
      name:   'Calibri',
      sz:     opts.sz    ?? 10,
      bold:   opts.bold  ?? false,
      italic: opts.italic ?? false,
      color:  { rgb: opts.fg ?? '0F172A' },
    },
    fill: {
      patternType: 'solid',
      fgColor: { rgb: opts.bg ?? 'FFFFFF' },
    },
    alignment: {
      horizontal: opts.h    ?? 'left',
      vertical:   opts.v    ?? 'center',
      wrapText:   opts.wrap ?? false,
    },
    ...(opts.numFmt ? { numFmt: opts.numFmt } : {}),
  }

  if (!opts.noBorder) {
    style.border = opts.med
      ? allMedBorders()
      : allBorders(thinBorder(opts.borderClr ?? C.BORDER))
  }

  return style
}

// ─── Pre-built styles ────────────────────────────────────────────────────────
const S = {
  title:      makeStyle({ bg: C.TITLE_BG,    fg: C.TITLE_FG,    bold: true,  sz: 14, h: 'center', med: true }),
  sub:        makeStyle({ bg: C.SUBTITLE_BG, fg: C.SUBTITLE_FG, bold: false, sz: 9,  h: 'left', italic: true }),
  empty:      makeStyle({ noBorder: true }),
  hdr:        makeStyle({ bg: C.COL_HDR_BG,  fg: C.COL_HDR_FG,  bold: true,  sz: 9,  h: 'center', med: true }),
  dataL:      (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'left' }),
  dataC:      (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'center' }),
  dataR:      (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'right', numFmt: '#,##0.00' }),
  dataNum:    (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'center', numFmt: '0' }),
  tagMensuel: () => makeStyle({ bg: C.MENSUEL_BG, fg: C.MENSUEL_FG, bold: true, sz: 9, h: 'center' }),
  tagJour:    () => makeStyle({ bg: C.JOURNALIER_BG, fg: C.JOURNALIER_FG, bold: true, sz: 9, h: 'center' }),
  grandL:     makeStyle({ bg: C.GRAND_BG, fg: C.GRAND_FG, bold: true, sz: 11, med: true }),
  grandR:     makeStyle({ bg: C.GRAND_BG, fg: C.GRAND_FG, bold: true, sz: 11, h: 'right', med: true, numFmt: '#,##0.00' }),
}

// ─── Format helpers ──────────────────────────────────────────────────────────
function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin',
                  'Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

const TOTAL_COLS  = 12  // A through L  (margin + 11 data columns)
const DATA_START  = 1   // skip col A (margin)

// ─── Sheet builder ───────────────────────────────────────────────────────────
function buildSheet(salaries, month) {
  const ws = {}
  let r = 0

  function setCell(row, col, value, style) {
    const addr = XLSXStyle.utils.encode_cell({ r: row, c: col })
    ws[addr] = {
      v: value,
      s: style,
      t: typeof value === 'number' ? 'n' : 's',
    }
  }

  const merges = []
  function mergeCols(row, fromCol, toCol) {
    merges.push({ s: { r: row, c: fromCol }, e: { r: row, c: toCol } })
  }

  // ── Row 0: top margin ──
  r = 0
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Row 1: Title ──
  r = 1
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START; c < TOTAL_COLS; c++) setCell(r, c, '', S.title)
  setCell(r, DATA_START, '🌿  ECO-PARK — MASSE SALARIALE MENSUELLE', S.title)
  mergeCols(r, DATA_START, TOTAL_COLS - 1)

  // ── Row 2: Subtitle ──
  r = 2
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START; c < TOTAL_COLS; c++) setCell(r, c, '', S.sub)
  setCell(r, DATA_START, `Période : ${fmtMonth(month)}     Généré le : ${new Date().toLocaleDateString('fr-MA')}     Module : Ressources Humaines — Paie`, S.sub)
  mergeCols(r, DATA_START, TOTAL_COLS - 1)

  // ── Row 3: spacer ──
  r = 3
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Row 4: Column Headers ──
  r = 4
  const headers = [
    'N°', 'Matricule', 'Nom & Prénom', 'Pôle', 'Poste',
    'Type', 'Taux Net', 'Jours Travaillés', 'Repos', 'Avances (DH)', 'Net à Payer'
  ]
  setCell(r, 0, '', S.empty)
  headers.forEach((h, i) => setCell(r, DATA_START + i, h, S.hdr))

  // ── Data rows ──
  let grandTotal = 0
  let rowNum = 1

  salaries.forEach((s, idx) => {
    r++
    const even = idx % 2 === 1
    const emp = s.employeeId || {}
    const isJour = emp.paymentType === 'Journalier'
    const tauxLabel = isJour
      ? `${emp.dailyRate || 0} DH/j`
      : `${emp.baseSalaryNet || 0} DH/m`

    grandTotal += s.netToPay || 0

    setCell(r, 0,           '', S.empty)
    setCell(r, DATA_START + 0,  rowNum++,                         S.dataC(even))
    setCell(r, DATA_START + 1,  emp.employeeNumber || '',          S.dataC(even))
    setCell(r, DATA_START + 2,  emp.fullName       || '',          S.dataL(even))
    setCell(r, DATA_START + 3,  emp.pole           || '',          S.dataC(even))
    setCell(r, DATA_START + 4,  emp.position       || '',          S.dataL(even))
    setCell(r, DATA_START + 5,  emp.paymentType    || '',          isJour ? S.tagJour(even) : S.tagMensuel(even))
    setCell(r, DATA_START + 6,  tauxLabel,                         S.dataC(even))
    setCell(r, DATA_START + 7,  s.daysWorked       || 0,           S.dataNum(even))
    setCell(r, DATA_START + 8,  s.restDays         || 0,           S.dataNum(even))
    setCell(r, DATA_START + 9,  s.advances         || 0,           S.dataR(even))
    setCell(r, DATA_START + 10, s.netToPay         || 0,           S.dataR(even))
  })

  // ── Grand Total row ──
  r++
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START; c < TOTAL_COLS; c++) setCell(r, c, '', S.grandL)
  setCell(r, DATA_START,      'TOTAL MASSE SALARIALE DU MOIS', S.grandL)
  mergeCols(r, DATA_START, DATA_START + 9)
  setCell(r, DATA_START + 10, grandTotal, S.grandR)

  // ── Bottom margin ──
  r++
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Sheet metadata ──
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: TOTAL_COLS - 1 } })
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 3  },  // A — margin
    { wch: 5  },  // B — N°
    { wch: 11 },  // C — Matricule
    { wch: 26 },  // D — Nom & Prénom
    { wch: 14 },  // E — Pôle
    { wch: 18 },  // F — Poste
    { wch: 12 },  // G — Type
    { wch: 15 },  // H — Taux Net
    { wch: 16 },  // I — Jours Travaillés
    { wch: 9  },  // J — Repos
    { wch: 16 },  // K — Avances
    { wch: 18 },  // L — Net à Payer
  ]
  ws['!rows'] = [
    { hpt: 8  },  // row 0 top margin
    { hpt: 32 },  // row 1 title
    { hpt: 16 },  // row 2 subtitle
    { hpt: 10 },  // row 3 spacer
    { hpt: 22 },  // row 4 headers
  ]

  return ws
}

// ─── Public export function ──────────────────────────────────────────────────
export async function exportSalariesExcel(salaries, month) {
  if (!salaries || salaries.length === 0) {
    throw new Error('Aucune fiche de paie à exporter pour ce mois.')
  }

  const wb = XLSXStyle.utils.book_new()
  const sheetName = `Paie ${month || ''}`.slice(0, 31)
  const ws = buildSheet(salaries, month)
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName)

  const fileName = `EcoPark_MasseSalariale_${month || 'export'}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}
