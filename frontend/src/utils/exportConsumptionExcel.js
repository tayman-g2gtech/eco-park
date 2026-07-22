// ─── exportConsumptionExcel.js ────────────────────────────────────────────────
// Export Excel for Employee Consumption monthly report
// Uses xlsx-js-style (same library as rest of the project)
// ─────────────────────────────────────────────────────────────────────────────
import XLSXStyle from 'xlsx-js-style'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
  TITLE_BG:   'FFF7ED', // orange-50
  TITLE_FG:   '7C2D12', // orange-900
  SUB_BG:     'FFEDD5', // orange-100
  SUB_FG:     'C2410C', // orange-700
  HDR_BG:     'E2E8F0', // slate-200
  HDR_FG:     '0F172A', // slate-950
  DAY_BG:     'DBEAFE', // blue-100
  DAY_FG:     '1E3A8A', // blue-900
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
  dayHeader:  makeStyle({ bg: C.DAY_BG,   fg: C.DAY_FG,   sz: 11, bold: true,  h: 'left',   med: true }),
  rowOdd:     (h) => makeStyle({ bg: C.ROW_ODD,  fg: '0F172A', h }),
  rowEven:    (h) => makeStyle({ bg: C.ROW_EVEN, fg: '0F172A', h }),
  rowRight:   (ev) => makeStyle({ bg: ev ? C.ROW_EVEN : C.ROW_ODD, fg: '7C3AED', bold: true, h: 'right' }),
  totalLbl:   makeStyle({ bg: C.TOTAL_BG, fg: C.TOTAL_FG, sz: 11, bold: true, h: 'left',   med: true }),
  totalVal:   makeStyle({ bg: C.TOTAL_BG, fg: C.TOTAL_FG, sz: 11, bold: true, h: 'right',  med: true }),
  totalCtr:   makeStyle({ bg: C.TOTAL_BG, fg: C.TOTAL_FG, sz: 11, bold: true, h: 'center', med: true }),
}

// ─── Public export ────────────────────────────────────────────────────────────
/**
 * Generates and downloads a multi-sheet Excel for the monthly consumption summary.
 * Sheet 1: Synthèse par Produit
 * Sheet 2: Détail par Date (Jour par jour)
 */
export function exportConsumptionExcel(summary) {
  if (!summary || (!summary.productTotals?.length && !summary.dailyConsumptions?.length)) {
    throw new Error('Aucune donnée à exporter')
  }

  const wb = XLSXStyle.utils.book_new()
  const monthLabel = format(new Date(summary.month + '-01'), 'MMMM yyyy', { locale: fr })
  const now = new Date()
  const exportStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // ════════════════════════════════════════════════════════════════
  // FEUILLE 1 : SYNTHÈSE PAR PRODUIT
  // ════════════════════════════════════════════════════════════════
  if (summary.productTotals?.length) {
    const NCOLS = 7
    const ws1 = {}
    const merges1 = []
    const rowHeights1 = []
    let r = 0

    const cell = (row, col) => XLSXStyle.utils.encode_cell({ r: row, c: col })
    const set = (row, col, v, s, t) => {
      ws1[cell(row, col)] = { v, s, t: t ?? (typeof v === 'number' ? 'n' : 's') }
    }
    const fillRow = (row, style, v = '') => {
      for (let c = 1; c <= NCOLS; c++) set(row, c, v, style)
    }
    const merge = (r1, r2, c1, c2) => merges1.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })
    const height = (hpt) => rowHeights1.push({ hpt })

    // Title
    fillRow(r, S.title)
    set(r, 1, `🍽️  ECO-PARK — Synthèse par Produit — ${monthLabel.toUpperCase()}`, S.title)
    merge(r, r, 1, NCOLS)
    height(36)
    r++

    // Subtitle
    fillRow(r, S.subtitle)
    set(r, 1, `${summary.totalDays} jour(s) saisi(s)  •  Exporté le : ${exportStr}  •  ${summary.productTotals.length} produit(s)`, S.subtitle)
    merge(r, r, 1, NCOLS)
    height(20)
    r++

    height(10)
    r++

    // Column headers
    const HEADERS = ['Produit', 'Catégorie', 'Pôle', 'Unité', 'Total Consommé', 'Jours Présents', 'Moy. / Jour']
    HEADERS.forEach((h, idx) => set(r, idx + 1, h, S.colHdr))
    height(26)
    r++

    // Data rows
    let grandTotal = 0
    summary.productTotals.forEach((pt, idx) => {
      const ev  = idx % 2 === 0
      const avg = summary.totalDays > 0
        ? Math.round((pt.totalQuantity / summary.totalDays) * 100) / 100
        : 0
      const unit = pt.unit || pt.product.unit || '—'

      set(r, 1, pt.product.name,                    ev ? S.rowOdd('left')   : S.rowEven('left'))
      set(r, 2, pt.product.category || '—',         ev ? S.rowOdd('center') : S.rowEven('center'))
      set(r, 3, pt.product.pole || '—',             ev ? S.rowOdd('center') : S.rowEven('center'))
      set(r, 4, unit,                               ev ? S.rowOdd('center') : S.rowEven('center'))
      set(r, 5, pt.totalQuantity,                   S.rowRight(ev))
      set(r, 6, pt.daysPresent,                     ev ? S.rowOdd('center') : S.rowEven('center'))
      set(r, 7, avg + ' ' + unit,                   ev ? S.rowOdd('right')  : S.rowEven('right'))

      grandTotal += pt.totalQuantity
      height(18)
      r++
    })

    // Grand total
    set(r, 1, 'TOTAL GÉNÉRAL',             S.totalLbl)
    set(r, 2, `${summary.productTotals.length} produits`, S.totalCtr)
    set(r, 3, '',                          S.totalCtr)
    set(r, 4, '',                          S.totalCtr)
    set(r, 5, grandTotal,                  S.totalVal)
    set(r, 6, `${summary.totalDays} jours`, S.totalCtr)
    set(r, 7, '',                          S.totalCtr)
    height(24)

    ws1['!ref']    = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: NCOLS } })
    ws1['!merges'] = merges1
    ws1['!rows']   = rowHeights1
    ws1['!cols']   = [
      { wch: 2  },
      { wch: 28 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 }
    ]

    XLSXStyle.utils.book_append_sheet(wb, ws1, 'Synthèse Par Produit')
  }

  // ════════════════════════════════════════════════════════════════
  // FEUILLE 2 : DÉTAIL JOUR PAR JOUR (GROUPÉ PAR DATE)
  // ════════════════════════════════════════════════════════════════
  if (summary.dailyConsumptions?.length) {
    const NCOLS = 6
    const ws2 = {}
    const merges2 = []
    const rowHeights2 = []
    let r = 0

    const cell = (row, col) => XLSXStyle.utils.encode_cell({ r: row, c: col })
    const set = (row, col, v, s, t) => {
      ws2[cell(row, col)] = { v, s, t: t ?? (typeof v === 'number' ? 'n' : 's') }
    }
    const fillRow = (row, style, v = '') => {
      for (let c = 1; c <= NCOLS; c++) set(row, c, v, style)
    }
    const merge = (r1, r2, c1, c2) => merges2.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })
    const height = (hpt) => rowHeights2.push({ hpt })

    // Title
    fillRow(r, S.title)
    set(r, 1, `📅  ECO-PARK — Détail par Date — ${monthLabel.toUpperCase()}`, S.title)
    merge(r, r, 1, NCOLS)
    height(36)
    r++

    // Subtitle
    fillRow(r, S.subtitle)
    set(r, 1, `Saisies quotidiennes de la période`, S.subtitle)
    merge(r, r, 1, NCOLS)
    height(20)
    r++

    height(10)
    r++

    summary.dailyConsumptions.forEach(fiche => {
      const dateFormatted = format(parseISO(fiche.date), 'EEEE d MMMM yyyy', { locale: fr })

      // Day section header
      fillRow(r, S.dayHeader)
      const noteText = fiche.notes ? ` — Note: ${fiche.notes}` : ''
      set(r, 1, `📆 ${dateFormatted.toUpperCase()} (${fiche.items?.length || 0} produits)${noteText}`, S.dayHeader)
      merge(r, r, 1, NCOLS)
      height(24)
      r++

      // Column headers for day
      const HEADERS = ['Produit', 'Catégorie', 'Pôle', 'Quantité Consommée', 'Unité', 'Remarques']
      HEADERS.forEach((h, idx) => set(r, idx + 1, h, S.colHdr))
      height(22)
      r++

      // Items for day
      if (fiche.items?.length) {
        fiche.items.forEach((item, idx) => {
          if (!item.productId) return
          const ev = idx % 2 === 0
          const unit = item.unit || item.productId.unit || '—'

          set(r, 1, item.productId.name,             ev ? S.rowOdd('left')   : S.rowEven('left'))
          set(r, 2, item.productId.category || '—',  ev ? S.rowOdd('center') : S.rowEven('center'))
          set(r, 3, item.productId.pole || '—',      ev ? S.rowOdd('center') : S.rowEven('center'))
          set(r, 4, item.quantity,                   S.rowRight(ev))
          set(r, 5, unit,                            ev ? S.rowOdd('center') : S.rowEven('center'))
          set(r, 6, item.notes || '',                ev ? S.rowOdd('left')   : S.rowEven('left'))
          height(18)
          r++
        })
      }

      // Spacer between days
      height(12)
      r++
    })

    ws2['!ref']    = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: NCOLS } })
    ws2['!merges'] = merges2
    ws2['!rows']   = rowHeights2
    ws2['!cols']   = [
      { wch: 2  },
      { wch: 28 },
      { wch: 16 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 25 }
    ]

    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Détail Jour par Jour')
  }

  XLSXStyle.writeFile(wb, `Consommations_Employes_${summary.month}.xlsx`)
}
