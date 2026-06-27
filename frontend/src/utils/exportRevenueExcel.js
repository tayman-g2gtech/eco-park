// ─── exportRevenueExcel.js ──────────────────────────────────────────────────
// Professional Excel export for Eco-Park — Relevé du Chiffre d'Affaires (CA)
// 1 sheet: "CA du Mois"
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
  ROW_ODD:     'FFFFFF',
  ROW_EVEN:    'F8FAFC',  // slate-50
  GRAND_BG:    'E2E8F0',  // slate-200
  GRAND_FG:    '0F172A',  // slate-950
  BORDER:      'CBD5E1',  // slate-300
  BORDER_DARK: '64748B',  // slate-500
}

// ─── Border helpers ────────────────────────────────────────────────────────────
const thinBorder = (clr = C.BORDER)      => ({ style: 'thin',   color: { rgb: clr } })
const medBorder  = (clr = C.BORDER_DARK) => ({ style: 'medium', color: { rgb: clr } })

const allBorders = (thin) => ({ top: thin, bottom: thin, left: thin, right: thin })
const allMedBorders = ()   => ({ top: medBorder(), bottom: medBorder(), left: medBorder(), right: medBorder() })

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
  dataL:   (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'left' }),
  dataC:   (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'center' }),
  dataR:   (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'right', numFmt: '#,##0.00' }),
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

const DATA_START_COL = 1
const TOTAL_COLS = 5  // A through E

// ─── Sheet builder ─────────────────────────────────────────────────────────────
function buildSheet(revenues, month) {
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
  setCell(r, DATA_START_COL, '🌿  ECO-PARK — RELEVÉ DU CHIFFRE D\'AFFAIRES (CA)', S.title)
  mergeCols(r, DATA_START_COL, TOTAL_COLS - 1)

  // ── Row 2: Subtitle info bar ──
  r = 2
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.sub)
  setCell(r, DATA_START_COL, `Période : ${fmtMonth(month)}     Généré le : ${new Date().toLocaleDateString('fr-MA')}     Module : Finances & CA`, S.sub)
  mergeCols(r, DATA_START_COL, TOTAL_COLS - 1)

  // ── Row 3: spacer ──
  r = 3
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Row 4: Column Headers ──
  r = 4
  const headers = ['N°', 'Date de déclaration', 'Note / Détail', 'CA Déclaré (DH)']
  setCell(r, 0, '', S.empty)
  headers.forEach((h, i) => setCell(r, DATA_START_COL + i, h, S.hdr))

  // Sort revenues by date ascending
  const sortedRevenues = [...revenues].sort((a, b) => new Date(a.date) - new Date(b.date))

  let grandTotal = 0
  let rowNum = 1

  sortedRevenues.forEach((rev, idx) => {
    r++
    const even = idx % 2 === 1
    grandTotal += rev.amount || 0

    setCell(r, 0, '', S.empty)
    setCell(r, DATA_START_COL + 0, rowNum++,                      S.dataC(even))
    setCell(r, DATA_START_COL + 1, fmtDate(rev.date),             S.dataC(even))
    setCell(r, DATA_START_COL + 2, rev.description || 'Chiffre d\'affaires quotidien', S.dataL(even))
    setCell(r, DATA_START_COL + 3, rev.amount || 0,               S.dataR(even))
  })

  // ── Grand Total ──
  r++
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.grandL)
  setCell(r, DATA_START_COL,     'CHIFFRE D\'AFFAIRES TOTAL DU MOIS', S.grandL)
  mergeCols(r, DATA_START_COL, DATA_START_COL + 2)
  setCell(r, DATA_START_COL + 3, grandTotal, S.grandR)

  // ── Bottom margin ──
  r++
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Sheet metadata ──
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: TOTAL_COLS - 1 } })
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 3  },  // A — margin
    { wch: 5  },  // B — N°
    { wch: 22 },  // C — Date de déclaration
    { wch: 38 },  // D — Note / Détail
    { wch: 22 },  // E — CA Déclaré
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
export async function exportRevenueExcel(revenues, month) {
  if (!revenues || revenues.length === 0) {
    throw new Error('Aucun revenu à exporter pour ce mois.')
  }

  const wb = XLSXStyle.utils.book_new()
  const sheetName = `CA ${month || ''}`
  const ws = buildSheet(revenues, month)
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

  const fileName = `EcoPark_CA_${month || 'export'}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}
