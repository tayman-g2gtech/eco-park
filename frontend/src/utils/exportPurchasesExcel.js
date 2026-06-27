// ─── exportPurchasesExcel.js ─────────────────────────────────────────────────
// Professional Excel export for Eco-Park — Relevé des Achats
// 1 sheet: "Achats du Mois", grouped by Supplier (Fournisseur)
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
  SUPP_BG:     'DBEAFE',  // blue-100     — supplier group rows
  SUPP_FG:     '1E3A8A',  // blue-900
  ROW_ODD:     'FFFFFF',
  ROW_EVEN:    'F8FAFC',  // slate-50
  ESPECE_BG:   'FEF9C3',  // yellow-100
  ESPECE_FG:   '78350F',  // amber-900
  CHEQUE_BG:   'DBEAFE',  // blue-100
  CHEQUE_FG:   '1E3A8A',  // blue-900
  VIREMENT_BG: 'EDE9FE',  // violet-100
  VIREMENT_FG: '4C1D95',  // violet-900
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
  // Header banner (title)
  title:  makeStyle({ bg: C.TITLE_BG,    fg: C.TITLE_FG,    bold: true, sz: 14, h: 'center', med: true }),
  // Info bar (subtitle)
  sub:    makeStyle({ bg: C.SUBTITLE_BG, fg: C.SUBTITLE_FG, bold: false, sz: 9,  h: 'left',   italic: true }),
  // Empty spacer
  empty:  makeStyle({ noBorder: true }),
  // Column headers
  hdr:    makeStyle({ bg: C.COL_HDR_BG, fg: C.COL_HDR_FG, bold: true, sz: 9, h: 'center', med: true }),
  // Supplier group row
  supp:   makeStyle({ bg: C.SUPP_BG,    fg: C.SUPP_FG,    bold: true, sz: 10 }),
  // Data rows
  dataL:  (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'left' }),
  dataC:  (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'center' }),
  dataR:  (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'right', numFmt: '#,##0.00' }),
  // Payment method badges
  espece:   (even) => makeStyle({ bg: C.ESPECE_BG,  fg: C.ESPECE_FG,  bold: true, sz: 9, h: 'center', bg: even ? C.ESPECE_BG : C.ESPECE_BG }),
  cheque:   (even) => makeStyle({ bg: C.CHEQUE_BG,  fg: C.CHEQUE_FG,  bold: true, sz: 9, h: 'center' }),
  virement: (even) => makeStyle({ bg: C.VIREMENT_BG,fg: C.VIREMENT_FG, bold: true, sz: 9, h: 'center' }),
  // Sub-total row
  subTotL: makeStyle({ bg: C.SUBTOT_BG, fg: C.SUBTOT_FG, bold: true, sz: 10 }),
  subTotR: makeStyle({ bg: C.SUBTOT_BG, fg: C.SUBTOT_FG, bold: true, sz: 10, h: 'right', numFmt: '#,##0.00' }),
  // Grand total row
  grandL:  makeStyle({ bg: C.GRAND_BG,  fg: C.GRAND_FG, bold: true, sz: 11, med: true }),
  grandR:  makeStyle({ bg: C.GRAND_BG,  fg: C.GRAND_FG, bold: true, sz: 11, h: 'right', med: true, numFmt: '#,##0.00' }),
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

// ─── Column definitions (A = margin, B-G = data) ──────────────────────────────
// Col indices: 0=margin, 1=N°, 2=Date, 3=N°Facture, 4=Fournisseur, 5=Montant, 6=Règlement, 7=Notes
const DATA_START_COL = 1  // column B (index 1)
const TOTAL_COLS = 8      // A through H

// ─── Sheet builder ─────────────────────────────────────────────────────────────
function buildSheet(purchases, month) {
  const ws = {}
  let r = 0  // current row (0-indexed)

  // Helper: write a cell
  function setCell(row, col, value, style) {
    const addr = XLSXStyle.utils.encode_cell({ r: row, c: col })
    ws[addr] = { v: value, s: style, t: typeof value === 'number' ? 'n' : 's' }
  }

  // Helper: merge cells across data columns B to H
  const merges = []
  function mergeCols(row, fromCol, toCol) {
    merges.push({ s: { r: row, c: fromCol }, e: { r: row, c: toCol } })
  }

  // ── Row 0: empty top margin ──
  r = 0
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Row 1: Title banner ──
  r = 1
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.title)
  setCell(r, DATA_START_COL, '🌿  ECO-PARK — RELEVÉ DES ACHATS FOURNISSEURS', S.title)
  mergeCols(r, DATA_START_COL, TOTAL_COLS - 1)

  // ── Row 2: Info bar (subtitle) ──
  r = 2
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.sub)
  setCell(r, DATA_START_COL, `Période : ${fmtMonth(month)}     Généré le : ${new Date().toLocaleDateString('fr-MA')}     Module : Achats & Fournisseurs`, S.sub)
  mergeCols(r, DATA_START_COL, TOTAL_COLS - 1)

  // ── Row 3: spacer ──
  r = 3
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Row 4: Column Headers ──
  r = 4
  const headers = ['N°', 'Date', 'N° Facture / Pièce', 'Fournisseur & Détail', 'Montant (DH)', 'Règlement', 'Notes']
  setCell(r, 0, '', S.empty)
  headers.forEach((h, i) => setCell(r, DATA_START_COL + i, h, S.hdr))

  // ── Data rows — group by Supplier ──
  // Group purchases by supplier name
  const grouped = {}
  purchases.forEach(p => {
    const suppName = p.supplierId?.name || 'Inconnu'
    if (!grouped[suppName]) grouped[suppName] = []
    grouped[suppName].push(p)
  })

  const supplierNames = Object.keys(grouped).sort()
  let grandTotal = 0
  let rowNum = 1

  supplierNames.forEach(suppName => {
    const rows = grouped[suppName]
    const suppTotal = rows.reduce((s, p) => s + (p.amount || 0), 0)
    grandTotal += suppTotal

    // ── Supplier group header ──
    r++
    setCell(r, 0, '', S.empty)
    for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.supp)
    setCell(r, DATA_START_COL, `▶  ${suppName.toUpperCase()}`, S.supp)
    mergeCols(r, DATA_START_COL, TOTAL_COLS - 1)

    // ── Supplier rows ──
    rows.forEach((p, idx) => {
      r++
      const even = idx % 2 === 1
      const dL = S.dataL(even)
      const dC = S.dataC(even)
      const dR = S.dataR(even)

      // Payment method style
      let pmStyle = dC
      if (p.paymentMethod === 'ESPECE')   pmStyle = S.espece(even)
      if (p.paymentMethod === 'CHEQUE')   pmStyle = S.cheque(even)
      if (p.paymentMethod === 'VIREMENT') pmStyle = S.virement(even)

      setCell(r, 0, '', S.empty)
      setCell(r, DATA_START_COL + 0, rowNum++,            dC)
      setCell(r, DATA_START_COL + 1, fmtDate(p.date),     dC)
      setCell(r, DATA_START_COL + 2, p.invoiceNumber || '—', dL)
      setCell(r, DATA_START_COL + 3, suppName,            dL)
      setCell(r, DATA_START_COL + 4, p.amount || 0,       dR)
      setCell(r, DATA_START_COL + 5, p.paymentMethod || 'ESPECE', pmStyle)
      setCell(r, DATA_START_COL + 6, p.notes || '—',      dL)
    })

    // ── Supplier sub-total ──
    r++
    setCell(r, 0, '', S.empty)
    for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.subTotL)
    setCell(r, DATA_START_COL,     `Sous-total  ${suppName}`, S.subTotL)
    mergeCols(r, DATA_START_COL, DATA_START_COL + 3)
    setCell(r, DATA_START_COL + 4, suppTotal, S.subTotR)
    setCell(r, DATA_START_COL + 5, '', S.subTotL)
    setCell(r, DATA_START_COL + 6, '', S.subTotL)
  })

  // ── Grand Total ──
  r++
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START_COL; c < TOTAL_COLS; c++) setCell(r, c, '', S.grandL)
  setCell(r, DATA_START_COL,     'TOTAL GÉNÉRAL ACHATS', S.grandL)
  mergeCols(r, DATA_START_COL, DATA_START_COL + 3)
  setCell(r, DATA_START_COL + 4, grandTotal, S.grandR)
  setCell(r, DATA_START_COL + 5, '', S.grandL)
  setCell(r, DATA_START_COL + 6, '', S.grandL)

  // ── Bottom margin ──
  r++
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)

  // ── Sheet metadata ──
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: TOTAL_COLS - 1 } })
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 3 },   // A — left margin
    { wch: 5 },   // B — N°
    { wch: 13 },  // C — Date
    { wch: 20 },  // D — N° Facture
    { wch: 28 },  // E — Fournisseur
    { wch: 16 },  // F — Montant
    { wch: 12 },  // G — Règlement
    { wch: 28 },  // H — Notes
  ]
  ws['!rows'] = [
    { hpt: 8 },   // row 0 top margin
    { hpt: 30 },  // row 1 title
    { hpt: 16 },  // row 2 subtitle
    { hpt: 14 },  // row 3 spacer
    { hpt: 22 },  // row 4 headers
  ]

  return ws
}

// ─── Public export function ───────────────────────────────────────────────────
export async function exportPurchasesExcel(purchases, month) {
  if (!purchases || purchases.length === 0) {
    throw new Error('Aucun achat à exporter pour ce mois.')
  }

  const wb = XLSXStyle.utils.book_new()
  const sheetName = `Achats ${month || ''}`
  const ws = buildSheet(purchases, month)
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

  const fileName = `EcoPark_Achats_${month || 'export'}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}
