// ─── exportConsumptionExcel.js ────────────────────────────────────────────────
// Export Excel for Employee Consumption monthly report
// Uses xlsx-js-style (same library as rest of the project)
// ─────────────────────────────────────────────────────────────────────────────
import XLSXStyle from 'xlsx-js-style'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
  TITLE_BG:   'FFF7ED', // orange-50
  TITLE_FG:   '7C2D12', // orange-900
  SUB_BG:     'FFEDD5', // orange-100
  SUB_FG:     'C2410C', // orange-700
  HDR_BG:     'E2E8F0', // slate-200
  HDR_FG:     '0F172A', // slate-950
  ROW_ODD:    'FFFFFF',
  ROW_EVEN:   'FFF7ED', // orange-50 tint
  TOTAL_BG:   'FED7AA', // orange-200
  TOTAL_FG:   '7C2D12', // orange-900
  BORDER:     'CBD5E1',
  BORDER_DARK:'64748B',
}

const thin = (clr = C.BORDER)      => ({ style: 'thin',   color: { rgb: clr } })
const med  = (clr = C.BORDER_DARK) => ({ style: 'medium', color: { rgb: clr } })
const allThin   = () => ({ top: thin(), bottom: thin(), left: thin(), right: thin() })
const allMedium = () => ({ top: med(),  bottom: med(),  left: med(),  right: med() })

function makeStyle(opts = {}) {
  return {
    font: {
      name: 'Calibri',
      sz:     opts.sz   ?? 10,
      bold:   opts.bold ?? false,
      italic: opts.italic ?? false,
      color:  { rgb: opts.fg ?? '0F172A' },
    },
    fill: { patternType: 'solid', fgColor: { rgb: opts.bg ?? 'FFFFFF' } },
    alignment: {
      horizontal: opts.h    ?? 'left',
      vertical:   opts.v    ?? 'center',
      wrapText:   opts.wrap ?? false,
    },
    border: opts.med ? allMedium() : allThin(),
  }
}

const S = {
  title:      makeStyle({ bg: C.TITLE_BG, fg: C.TITLE_FG, sz: 15, bold: true,  h: 'center', med: true }),
  subtitle:   makeStyle({ bg: C.SUB_BG,   fg: C.SUB_FG,   sz: 10, italic: true, h: 'center' }),
  colHdr:     makeStyle({ bg: C.HDR_BG,   fg: C.HDR_FG,   sz: 10, bold: true,  h: 'center', med: true }),
  rowOdd:     (h) => makeStyle({ bg: C.ROW_ODD,  fg: '0F172A', h }),
  rowEven:    (h) => makeStyle({ bg: C.ROW_EVEN, fg: '0F172A', h }),
  rowRight:   (ev) => makeStyle({ bg: ev ? C.ROW_EVEN : C.ROW_ODD, fg: '7C3AED', bold: true, h: 'right' }),
  totalLbl:   makeStyle({ bg: C.TOTAL_BG, fg: C.TOTAL_FG, sz: 11, bold: true, h: 'left',   med: true }),
  totalVal:   makeStyle({ bg: C.TOTAL_BG, fg: C.TOTAL_FG, sz: 11, bold: true, h: 'right',  med: true }),
  totalCtr:   makeStyle({ bg: C.TOTAL_BG, fg: C.TOTAL_FG, sz: 11, bold: true, h: 'center', med: true }),
}

// ─── Public export ────────────────────────────────────────────────────────────
/**
 * Generates and downloads a styled Excel for the monthly consumption summary.
 * @param {object} summary   — { month, totalDays, productTotals: [{product, totalQuantity, daysPresent}] }
 */
export function exportConsumptionExcel(summary) {
  if (!summary || !summary.productTotals?.length) {
    throw new Error('Aucune donnée à exporter')
  }

  const NCOLS = 7   // columns B..H (index 1..7)
  const ws = {}
  const merges = []
  const rowHeights = []
  let r = 0

  const cell = (row, col) => XLSXStyle.utils.encode_cell({ r: row, c: col })
  const set   = (row, col, v, s, t) => {
    ws[cell(row, col)] = { v, s, t: t ?? (typeof v === 'number' ? 'n' : 's') }
  }
  const fillRow = (row, style, v = '') => {
    for (let c = 1; c <= NCOLS; c++) set(row, c, v, style)
  }
  const merge = (r1, r2, c1, c2) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })
  const height = (hpt) => rowHeights.push({ hpt })

  // Format month label
  const monthLabel = format(new Date(summary.month + '-01'), 'MMMM yyyy', { locale: fr })
  const now = new Date()
  const exportStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // ── Title ──
  fillRow(r, S.title)
  set(r, 1, `🍽️  ECO-PARK — Consommations Employés — ${monthLabel.toUpperCase()}`, S.title)
  merge(r, r, 1, NCOLS)
  height(36)
  r++

  // ── Subtitle ──
  fillRow(r, S.subtitle)
  set(r, 1, `${summary.totalDays} jour(s) saisi(s)  •  Exporté le : ${exportStr}  •  ${summary.productTotals.length} produit(s)`, S.subtitle)
  merge(r, r, 1, NCOLS)
  height(20)
  r++

  // ── Spacer ──
  height(10)
  r++

  // ── Column headers ──
  const HEADERS = ['Produit', 'Catégorie', 'Pôle', 'Unité', 'Total Consommé', 'Jours Présents', 'Moy. / Jour']
  HEADERS.forEach((h, idx) => set(r, idx + 1, h, S.colHdr))
  height(26)
  r++

  // ── Data rows ──
  let grandTotal = 0

  summary.productTotals.forEach((pt, idx) => {
    const ev  = idx % 2 === 0
    const avg = summary.totalDays > 0
      ? Math.round((pt.totalQuantity / summary.totalDays) * 100) / 100
      : 0

    set(r, 1, pt.product.name,                    ev ? S.rowOdd('left')   : S.rowEven('left'))
    set(r, 2, pt.product.category || '—',         ev ? S.rowOdd('center') : S.rowEven('center'))
    set(r, 3, pt.product.pole || '—',             ev ? S.rowOdd('center') : S.rowEven('center'))
    set(r, 4, pt.product.unit || '—',             ev ? S.rowOdd('center') : S.rowEven('center'))
    set(r, 5, pt.totalQuantity,                   S.rowRight(ev))
    set(r, 6, pt.daysPresent,                     ev ? S.rowOdd('center') : S.rowEven('center'))
    set(r, 7, avg + ' ' + (pt.product.unit || ''), ev ? S.rowOdd('right')  : S.rowEven('right'))

    grandTotal += pt.totalQuantity
    height(18)
    r++
  })

  // ── Grand total row ──
  set(r, 1, 'TOTAL GÉNÉRAL',             S.totalLbl)
  set(r, 2, `${summary.productTotals.length} produits`, S.totalCtr)
  set(r, 3, '',                          S.totalCtr)
  set(r, 4, '',                          S.totalCtr)
  set(r, 5, grandTotal,                  S.totalVal)
  set(r, 6, `${summary.totalDays} jours`, S.totalCtr)
  set(r, 7, '',                          S.totalCtr)
  height(24)
  r++

  // ── Sheet metadata ──
  ws['!ref']    = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: NCOLS + 1 } })
  ws['!merges'] = merges
  ws['!rows']   = rowHeights
  ws['!cols']   = [
    { wch: 2  }, // A — left margin
    { wch: 28 }, // B — Produit
    { wch: 16 }, // C — Catégorie
    { wch: 12 }, // D — Pôle
    { wch: 10 }, // E — Unité
    { wch: 18 }, // F — Total Consommé
    { wch: 16 }, // G — Jours Présents
    { wch: 14 }, // H — Moy/Jour
  ]

  const wb = XLSXStyle.utils.book_new()
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Consommations')
  XLSXStyle.writeFile(wb, `Consommations_Employes_${summary.month}.xlsx`)
}
