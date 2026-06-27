// ─── exportExpensesExcel.js ──────────────────────────────────────────────────
// Professional Excel export for Eco-Park — Relevé des Charges
// 1 sheet: "Charges du Mois", grouped by Catégorie (Fixe / Variable)
// Uses xlsx-js-style (SheetJS fork with cell-level styling support)
// ─────────────────────────────────────────────────────────────────────────────
import XLSXStyle from 'xlsx-js-style'

// ─── Brand Colour Palette (Print-Safe) ──────────────────────────────────────
const C = {
  TITLE_BG:    'D1FAE5',  // emerald-100  — header banner
  TITLE_FG:    '064E3B',  // emerald-900
  SUBTITLE_BG: 'ECFDF5',  // emerald-50
  SUBTITLE_FG: '065F46',  // emerald-800
  COL_HDR_BG:  'E2E8F0',  // slate-200    — column headers
  COL_HDR_FG:  '0F172A',  // slate-950
  FIXED_BG:    'E0E7FF',  // indigo-100   — charge fixe group
  FIXED_FG:    '3730A3',  // indigo-800
  VAR_BG:      'FFEDD5',  // orange-100   — charge variable group
  VAR_FG:      '7C2D12',  // orange-900
  ROW_ODD:     'FFFFFF',
  ROW_EVEN:    'F8FAFC',  // slate-50
  SUBTOT_BG:   'FEF9C3',  // yellow-100
  SUBTOT_FG:   '78350F',  // amber-900
  GRAND_BG:    'E2E8F0',  // slate-200
  GRAND_FG:    '0F172A',  // slate-950
  BORDER:      'CBD5E1',  // slate-300
  BORDER_DARK: '64748B',  // slate-500
}

// ─── Border helpers ────────────────────────────────────────────────────────────
const thinBorder = (clr = C.BORDER)      => ({ style: 'thin',   color: { rgb: clr } })
const medBorder  = (clr = C.BORDER_DARK) => ({ style: 'medium', color: { rgb: clr } })

const allBorders    = (thin) => ({ top: thin, bottom: thin, left: thin, right: thin })
const allMedBorders = ()     => ({ top: medBorder(), bottom: medBorder(), left: medBorder(), right: medBorder() })

// ─── Style factory ─────────────────────────────────────────────────────────────
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

// ─── Pre-built styles ──────────────────────────────────────────────────────────
const S = {
  title:   makeStyle({ bg: C.TITLE_BG,    fg: C.TITLE_FG,    bold: true, sz: 14, h: 'center', med: true }),
  sub:     makeStyle({ bg: C.SUBTITLE_BG, fg: C.SUBTITLE_FG, bold: false, sz: 9,  h: 'left', italic: true }),
  empty:   makeStyle({ noBorder: true }),
  hdr:     makeStyle({ bg: C.COL_HDR_BG,  fg: C.COL_HDR_FG,  bold: true, sz: 9, h: 'center', med: true }),
  catFixed: makeStyle({ bg: C.FIXED_BG,   fg: C.FIXED_FG,    bold: true, sz: 10 }),
  catVar:   makeStyle({ bg: C.VAR_BG,     fg: C.VAR_FG,      bold: true, sz: 10 }),
  dataL:   (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'left' }),
  dataC:   (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'center' }),
  dataR:   (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'right', numFmt: '#,##0.00' }),
  subTotL: makeStyle({ bg: C.SUBTOT_BG, fg: C.SUBTOT_FG, bold: true, sz: 10 }),
  subTotR: makeStyle({ bg: C.SUBTOT_BG, fg: C.SUBTOT_FG, bold: true, sz: 10, h: 'right', numFmt: '#,##0.00' }),
  grandL:  makeStyle({ bg: C.GRAND_BG,  fg: C.GRAND_FG,  bold: true, sz: 11, med: true }),
  grandR:  makeStyle({ bg: C.GRAND_BG,  fg: C.GRAND_FG,  bold: true, sz: 11, h: 'right', med: true, numFmt: '#,##0.00' }),
}

// ─── Format helpers ────────────────────────────────────────────────────────────
function fmtDate(raw) {
  if (!raw) return '—'
  const d = new Date(raw)
  return d.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin',
                  'Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

// ─── Column definitions (A = margin, B-F = data) ──────────────────────────────
// 0=margin, 1=N°, 2=Intitulé, 3=DatePaiement, 4=Catégorie, 5=Montant, 6=Description
const DATA_START_COL = 1
const TOTAL_COLS = 7  // A through G

// ─── Sheet builder ─────────────────────────────────────────────────────────────
function buildSheet(expenses, month) {
  const ws = {}
  let r = 0

  function setCell(row, col, value, style) {
    const addr = XLSXStyle.utils.encode_cell({ r: row, c: col })
    ws[addr] = { v: value, s: style, t: typeof value === 'number' ? 'n' : 's' }
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
  for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.title)
  setCell(r, DATA_START_COL, '🌿  ECO-PARK — RELEVÉ DES CHARGES D\'EXPLOITATION', S.title)
  mergeCols(r, DATA_START_COL, TOTAL_COLS - 1)

  // ── Row 2: Subtitle info bar ──
  r = 2
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.sub)
  setCell(r, DATA_START_COL, `Période : ${fmtMonth(month)}     Généré le : ${new Date().toLocaleDateString('fr-MA')}     Module : Finances & Charges`, S.sub)
  mergeCols(r, DATA_START_COL, TOTAL_COLS - 1)

  // ── Row 3: spacer ──
  r = 3
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Row 4: Column Headers ──
  r = 4
  const headers = ['N°', 'Charge / Intitulé', 'Date Paiement', 'Catégorie', 'Montant (DH)', 'Description']
  setCell(r, 0, '', S.empty)
  headers.forEach((h, i) => setCell(r, DATA_START_COL + i, h, S.hdr))

  // ── Group by category ──
  const groups = {
    fixed:    { label: 'CHARGES FIXES', rows: [], style: S.catFixed },
    variable: { label: 'CHARGES VARIABLES', rows: [], style: S.catVar },
  }

  expenses.forEach(exp => {
    const cat = exp.category === 'variable' ? 'variable' : 'fixed'
    groups[cat].rows.push(exp)
  })

  let grandTotal = 0
  let rowNum = 1

  Object.values(groups).forEach(group => {
    if (group.rows.length === 0) return

    const groupTotal = group.rows.reduce((s, e) => s + (e.amount || 0), 0)
    grandTotal += groupTotal

    // ── Category header ──
    r++
    setCell(r, 0, '', S.empty)
    for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', group.style)
    setCell(r, DATA_START_COL, `▶  ${group.label}`, group.style)
    mergeCols(r, DATA_START_COL, TOTAL_COLS - 1)

    // ── Data rows ──
    group.rows.forEach((exp, idx) => {
      r++
      const even = idx % 2 === 1
      setCell(r, 0, '', S.empty)
      setCell(r, DATA_START_COL + 0, rowNum++,                      S.dataC(even))
      setCell(r, DATA_START_COL + 1, exp.name || '—',               S.dataL(even))
      setCell(r, DATA_START_COL + 2, fmtDate(exp.paidAt),           S.dataC(even))
      setCell(r, DATA_START_COL + 3, exp.category === 'fixed' ? 'Fixe' : 'Variable', S.dataC(even))
      setCell(r, DATA_START_COL + 4, exp.amount || 0,               S.dataR(even))
      setCell(r, DATA_START_COL + 5, exp.description || '—',        S.dataL(even))
    })

    // ── Sub-total ──
    r++
    setCell(r, 0, '', S.empty)
    for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.subTotL)
    setCell(r, DATA_START_COL,     `Sous-total  ${group.label}`, S.subTotL)
    mergeCols(r, DATA_START_COL, DATA_START_COL + 3)
    setCell(r, DATA_START_COL + 4, groupTotal, S.subTotR)
    setCell(r, DATA_START_COL + 5, '',         S.subTotL)
  })

  // ── Grand Total ──
  r++
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.grandL)
  setCell(r, DATA_START_COL,     'TOTAL GÉNÉRAL CHARGES', S.grandL)
  mergeCols(r, DATA_START_COL, DATA_START_COL + 3)
  setCell(r, DATA_START_COL + 4, grandTotal, S.grandR)
  setCell(r, DATA_START_COL + 5, '',         S.grandL)

  // ── Bottom margin ──
  r++
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Sheet metadata ──
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: TOTAL_COLS - 1 } })
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 3  },  // A — margin
    { wch: 5  },  // B — N°
    { wch: 32 },  // C — Intitulé
    { wch: 15 },  // D — Date
    { wch: 14 },  // E — Catégorie
    { wch: 16 },  // F — Montant
    { wch: 32 },  // G — Description
  ]
  ws['!rows'] = [
    { hpt: 8  },  // row 0 top margin
    { hpt: 30 },  // row 1 title
    { hpt: 16 },  // row 2 subtitle
    { hpt: 14 },  // row 3 spacer
    { hpt: 22 },  // row 4 headers
  ]

  return ws
}

// ─── Public export function ───────────────────────────────────────────────────
export async function exportExpensesExcel(expenses, month) {
  if (!expenses || expenses.length === 0) {
    throw new Error('Aucune charge à exporter pour ce mois.')
  }

  const wb = XLSXStyle.utils.book_new()
  const sheetName = `Charges ${month || ''}`
  const ws = buildSheet(expenses, month)
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

  const fileName = `EcoPark_Charges_${month || 'export'}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}
