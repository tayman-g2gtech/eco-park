// ─── exportStockExcel.js ────────────────────────────────────────────────────
// Professional Excel export for Eco-Park Stock Movements
// 3 sheets (PDJ, Bar, Crêperie), each grouped by product category
// Uses xlsx-js-style (SheetJS fork with cell-level styling support)
// ────────────────────────────────────────────────────────────────────────────
import XLSXStyle from 'xlsx-js-style'
import client from '@/api/client'

// ─── Brand Colour Palette (Print-Safe) ──────────────────────────────────────
const C = {
  TITLE_BG:    'D1FAE5',  // emerald-100  — header banner (light, prints well)
  TITLE_FG:    '064E3B',  // emerald-900  — dark text for contrast
  SUBTITLE_BG: 'ECFDF5',  // emerald-50   — info bar
  SUBTITLE_FG: '065F46',  // emerald-800
  COL_HDR_BG:  'E2E8F0',  // slate-200    — column headers (light gray)
  COL_HDR_FG:  '0F172A',  // slate-950    — near-black text
  CAT_BG:      'DBEAFE',  // blue-100     — category group rows
  CAT_FG:      '1E3A8A',  // blue-900
  ROW_ODD:     'FFFFFF',
  ROW_EVEN:    'F8FAFC',  // slate-50
  ALERT_BG:    'FEE2E2',  // red-100
  ALERT_FG:    '991B1B',  // red-800
  REMAIN_BG:   'D1FAE5',  // emerald-100
  REMAIN_FG:   '064E3B',  // emerald-900
  SUBTOT_BG:   'FEF9C3',  // yellow-100   — sub-total rows
  SUBTOT_FG:   '78350F',  // amber-900
  GRAND_BG:    'E2E8F0',  // slate-200    — grand total
  GRAND_FG:    '0F172A',  // slate-950
  BORDER:      'CBD5E1',  // slate-300
  BORDER_DARK: '64748B',  // slate-500
}

// ─── Border helpers ────────────────────────────────────────────────────────────
const thinBorder  = (clr = C.BORDER)      => ({ style: 'thin',   color: { rgb: clr } })
const medBorder   = (clr = C.BORDER_DARK) => ({ style: 'medium', color: { rgb: clr } })

const allBorders = (thin, med) => ({
  top: thin, bottom: thin, left: thin, right: thin,
})
const allMedBorders = () => ({
  top: medBorder(), bottom: medBorder(), left: medBorder(), right: medBorder(),
})

// ─── Style factory ─────────────────────────────────────────────────────────────
function makeStyle(opts = {}) {
  const style = {
    font: {
      name: 'Calibri',
      sz:   opts.sz   ?? 10,
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      color: { rgb: opts.fg ?? '0F172A' },
    },
    fill: {
      patternType: 'solid',
      fgColor: { rgb: opts.bg ?? 'FFFFFF' },
    },
    alignment: {
      horizontal: opts.h   ?? 'left',
      vertical:   opts.v   ?? 'center',
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

// ─── Pre-built reusable styles ─────────────────────────────────────────────────
const S = {
  title:      makeStyle({ bg: C.TITLE_BG,    fg: C.TITLE_FG,    sz: 16, bold: true,  h: 'center', med: true }),
  subtitle:   makeStyle({ bg: C.SUBTITLE_BG, fg: C.SUBTITLE_FG, sz: 10, italic: true, h: 'center' }),
  colHeader:  makeStyle({ bg: C.COL_HDR_BG,  fg: C.COL_HDR_FG, sz: 10, bold: true,  h: 'center', med: true }),
  catLabel:   makeStyle({ bg: C.CAT_BG,      fg: C.CAT_FG,      sz: 10, bold: true,  h: 'left',   med: true }),
  catEmpty:   makeStyle({ bg: C.CAT_BG,      fg: C.CAT_FG,      sz: 10,              h: 'center', med: true }),
  empty:      makeStyle({ bg: 'FFFFFF',      fg: 'FFFFFF',      sz: 4,  noBorder: true }),

  // Data cells — dynamic (even/odd alternating + alert highlight)
  dateName:   (ev, al) => makeStyle({ bg: al ? C.ALERT_BG : (ev ? C.ROW_EVEN : C.ROW_ODD), fg: al ? C.ALERT_FG : '0F172A',  bold: al }),
  dataCat:    (ev, al) => makeStyle({ bg: al ? C.ALERT_BG : (ev ? C.ROW_EVEN : C.ROW_ODD), fg: al ? C.ALERT_FG : '475569',  h: 'center' }),
  dataUnit:   (ev, al) => makeStyle({ bg: al ? C.ALERT_BG : (ev ? C.ROW_EVEN : C.ROW_ODD), fg: al ? C.ALERT_FG : '475569',  h: 'center' }),
  dataNum:    (ev, al) => makeStyle({ bg: al ? C.ALERT_BG : (ev ? C.ROW_EVEN : C.ROW_ODD), fg: al ? C.ALERT_FG : '334155',  h: 'right' }),
  dataRemain: (ev, al) => makeStyle({ bg: al ? C.ALERT_BG : C.REMAIN_BG,                   fg: al ? C.ALERT_FG : C.REMAIN_FG, bold: true, h: 'right' }),
  dataAlert:  (ev, al) => makeStyle({ bg: al ? C.ALERT_BG : (ev ? C.ROW_EVEN : C.ROW_ODD), fg: al ? C.ALERT_FG : '16A34A',  h: 'center', bold: al }),

  // Subtotal rows
  subtotLabel: makeStyle({ bg: C.SUBTOT_BG, fg: C.SUBTOT_FG, bold: true, h: 'left',   med: true }),
  subtotNum:   makeStyle({ bg: C.SUBTOT_BG, fg: C.SUBTOT_FG, bold: true, h: 'right',  med: true }),
  subtotCenter:makeStyle({ bg: C.SUBTOT_BG, fg: C.SUBTOT_FG, bold: true, h: 'center', med: true }),

  // Grand total rows
  grandLabel:  makeStyle({ bg: C.GRAND_BG, fg: C.GRAND_FG, bold: true, sz: 11, h: 'left',   med: true }),
  grandNum:    makeStyle({ bg: C.GRAND_BG, fg: C.GRAND_FG, bold: true, sz: 11, h: 'right',  med: true }),
  grandCenter: makeStyle({ bg: C.GRAND_BG, fg: C.GRAND_FG, bold: true, sz: 11, h: 'center', med: true }),
  grandAlert:  (hasAlert) => makeStyle({
    bg: C.GRAND_BG, sz: 11, bold: true, h: 'center', med: true,
    fg: hasAlert ? C.ALERT_FG : '065F46',
  }),
}

// ─── Fetch data for one pole ───────────────────────────────────────────────────
async function fetchPoleData(date, pole) {
  const [prodRes, moveRes, yestRes] = await Promise.all([
    client.get(`/products?pole=${pole}`),
    client.get(`/stock-movements?date=${date}&pole=${pole}`),
    client.get(`/stock-movements/yesterday?date=${date}&pole=${pole}`),
  ])
  const products = prodRes.data
  const movements = moveRes.data
  const yestMovements = yestRes.data

  return products.map(prod => {
    const todayMove  = movements.find(m => (m.productId?._id ?? m.productId) === prod._id)
    const yestMove   = yestMovements.find(m => (m.productId?._id ?? m.productId) === prod._id)
    const yesterdayStock   = yestMove   ? yestMove.remainingStock   : 0
    const addedQuantity    = todayMove  ? todayMove.addedQuantity   : 0
    const consumedQuantity = todayMove  ? todayMove.consumedQuantity : 0
    const remainingStock   = yesterdayStock + Number(addedQuantity || 0) - Number(consumedQuantity || 0)
    const isUnderAlert     = remainingStock <= prod.quantityAlert
    return { product: prod, yesterdayStock, addedQuantity, consumedQuantity, remainingStock, isUnderAlert }
  })
}

// ─── Build one worksheet ───────────────────────────────────────────────────────
function buildSheet(allRows, poleName, date) {
  const NCOLS = 9 // 1 column spacing + 8 columns data
  const ws    = {}
  const merges = []
  const rowHeights = []
  let r = 0 // 0-based row index

  // ── Helpers ───────────────────────────────────────────────────────────────
  const cellRef = (row, col) => XLSXStyle.utils.encode_cell({ r: row, c: col })

  function setCell(row, col, value, style, t) {
    const type = t ?? (typeof value === 'number' ? 'n' : 's')
    ws[cellRef(row, col)] = { v: value, t: type, s: style }
  }

  // fillRow only styles columns B to I (indexes 1 to 8), leaving column A (index 0) blank
  function fillRow(row, style, value = '') {
    for (let c = 1; c < NCOLS; c++) setCell(row, c, value, style)
  }

  function spanMerge(rowStart, rowEnd, colStart, colEnd) {
    merges.push({ s: { r: rowStart, c: colStart }, e: { r: rowEnd, c: colEnd } })
  }

  function addHeight(hpt) { rowHeights.push({ hpt }) }

  const fmt = (n) => Math.round(n * 100) / 100  // round to 2 decimal places

  // ── Title row ──────────────────────────────────────────────────────────────
  const poleLabel  = poleName === 'Creperie' ? 'Crêperie' : poleName
  const dateLabel  = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  fillRow(r, S.title)
  setCell(r, 1, `🌿 ECO-PARK — Mouvements de Stock  ·  Pôle: ${poleLabel}`, S.title)
  spanMerge(r, r, 1, NCOLS - 1)
  addHeight(38)
  r++

  // ── Subtitle / info row ────────────────────────────────────────────────────
  const now = new Date()
  const exportStr = now.toLocaleDateString('fr-FR') + '  ' +
                    now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  fillRow(r, S.subtitle)
  setCell(r, 1, `Rapport du : ${dateLabel}   •   Exporté le : ${exportStr}   •   ${allRows.length} article(s) au total`, S.subtitle)
  spanMerge(r, r, 1, NCOLS - 1)
  addHeight(22)
  r++

  // ── Blank spacer ──────────────────────────────────────────────────────────
  // Space between Subtitle and Headers is now taller (16pt) and completely borderless
  fillRow(r, S.empty)
  addHeight(16)
  r++

  // ── Column headers ────────────────────────────────────────────────────────
  const HEADERS = ['Produit', 'Catégorie', 'Unité', 'Reste Hier', 'Ajouté (+)', 'Consommé (-)', 'Reste Auj.', 'Seuil / Statut']
  HEADERS.forEach((h, c) => setCell(r, c + 1, h, S.colHeader))
  addHeight(28)
  r++

  // ── Group rows by category ────────────────────────────────────────────────
  const catMap = {}
  allRows.forEach(row => {
    const cat = row.product.category || 'Autre'
    if (!catMap[cat]) catMap[cat] = []
    catMap[cat].push(row)
  })
  const sortedCats = Object.keys(catMap).sort()

  let grandYest = 0, grandAdded = 0, grandConsumed = 0, grandRemain = 0, grandAlerts = 0

  sortedCats.forEach(cat => {
    const catRows = catMap[cat]

    // Category separator row
    fillRow(r, S.catEmpty)
    setCell(r, 1, `▸   ${cat.toUpperCase()}`, S.catLabel)
    spanMerge(r, r, 1, NCOLS - 1)
    addHeight(20)
    r++

    let catYest = 0, catAdded = 0, catConsumed = 0, catRemain = 0, catAlerts = 0

    catRows.forEach((row, idx) => {
      const ev  = idx % 2 === 0
      const al  = row.isUnderAlert

      setCell(r, 1, row.product.name,                         S.dateName(ev, al))
      setCell(r, 2, row.product.category || '—',              S.dataCat(ev, al))
      setCell(r, 3, row.product.unit     || '—',              S.dataUnit(ev, al))
      setCell(r, 4, fmt(row.yesterdayStock),                  S.dataNum(ev, al))
      setCell(r, 5, fmt(row.addedQuantity),                   S.dataNum(ev, al))
      setCell(r, 6, fmt(row.consumedQuantity),                S.dataNum(ev, al))
      setCell(r, 7, fmt(row.remainingStock),                  S.dataRemain(ev, al))
      setCell(r, 8, al
        ? `⚠  Critique (seuil: ${row.product.quantityAlert} ${row.product.unit || ''})`
        : '✓  Normal',                                        S.dataAlert(ev, al))

      catYest     += row.yesterdayStock
      catAdded    += row.addedQuantity
      catConsumed += row.consumedQuantity
      catRemain   += row.remainingStock
      if (al) catAlerts++
      addHeight(18)
      r++
    })

    // Category subtotal row
    setCell(r, 1, `Sous-total — ${cat}`,     S.subtotLabel)
    setCell(r, 2, `${catRows.length} art.`,  S.subtotCenter)
    setCell(r, 3, '',                         S.subtotCenter)
    setCell(r, 4, fmt(catYest),               S.subtotNum)
    setCell(r, 5, fmt(catAdded),              S.subtotNum)
    setCell(r, 6, fmt(catConsumed),           S.subtotNum)
    setCell(r, 7, fmt(catRemain),             S.subtotNum)
    setCell(r, 8, catAlerts > 0
      ? `${catAlerts} alerte(s)`
      : '✓',                                  S.subtotCenter)
    addHeight(20)
    r++

    // Blank spacer between categories
    fillRow(r, S.empty)
    addHeight(5)
    r++

    grandYest     += catYest
    grandAdded    += catAdded
    grandConsumed += catConsumed
    grandRemain   += catRemain
    grandAlerts   += catAlerts
  })

  // ── Grand Total row ────────────────────────────────────────────────────────
  setCell(r, 1, 'TOTAL GÉNÉRAL',               S.grandLabel)
  setCell(r, 2, `${allRows.length} articles`,  S.grandCenter)
  setCell(r, 3, `${sortedCats.length} catég.`, S.grandCenter)
  setCell(r, 4, fmt(grandYest),                S.grandNum)
  setCell(r, 5, fmt(grandAdded),               S.grandNum)
  setCell(r, 6, fmt(grandConsumed),            S.grandNum)
  setCell(r, 7, fmt(grandRemain),              S.grandNum)
  setCell(r, 8,
    grandAlerts > 0
      ? `⚠  ${grandAlerts} alerte(s) critiques`
      : '✓  Aucune alerte critique',
    S.grandAlert(grandAlerts > 0)
  )
  addHeight(26)

  // ── Sheet metadata ─────────────────────────────────────────────────────────
  ws['!ref']    = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: NCOLS - 1 } })
  ws['!merges'] = merges
  ws['!rows']   = rowHeights
  ws['!cols']   = [
    { wch: 3  }, // A  Espace à gauche (marge)
    { wch: 32 }, // B  Produit
    { wch: 16 }, // C  Catégorie
    { wch: 10 }, // D  Unité
    { wch: 15 }, // E  Reste Hier
    { wch: 13 }, // F  Ajouté (+)
    { wch: 14 }, // G  Consommé (-)
    { wch: 14 }, // H  Reste Auj.
    { wch: 28 }, // I  Seuil / Statut
  ]

  return ws
}

// ─── Public export function ────────────────────────────────────────────────────
/**
 * Generates and downloads a multi-sheet Excel report for all 3 poles.
 * @param {string} date  — ISO date string YYYY-MM-DD
 * @returns {string}  fileName that was downloaded
 */
export async function exportStockExcel(date) {
  const poles = [
    { key: 'PDJ',       label: 'PDJ'      },
    { key: 'Bar',       label: 'Bar'      },
    { key: 'Creperie',  label: 'Crêperie' },
  ]

  const wb = XLSXStyle.utils.book_new()

  for (const { key, label } of poles) {
    const data = await fetchPoleData(date, key)
    const ws   = buildSheet(data, key, date)
    XLSXStyle.utils.book_append_sheet(wb, ws, label)
  }

  const fileName = `Stock_Eco-Park_${date}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
  return fileName
}
