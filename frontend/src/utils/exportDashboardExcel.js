// ─── exportDashboardExcel.js ──────────────────────────────────────────────────
// Professional Excel export for Eco-Park Financial Reports.
// Styled dynamically matching the dashboard aesthetics using xlsx-js-style.
// ─────────────────────────────────────────────────────────────────────────────
import XLSXStyle from 'xlsx-js-style'

const C = {
  PRIMARY_BG:    'D1FAE5',  // emerald-100
  PRIMARY_FG:    '064E3B',  // emerald-900
  ACCENT_BG:     'ECFDF5',  // emerald-50
  ACCENT_FG:     '047857',  // emerald-700
  HDR_BG:        'F1F5F9',  // slate-100
  HDR_FG:        '0F172A',  // slate-950
  BORDER:        'CBD5E1',  // slate-300
  PROFIT_BG:     'DCFCE7',  // green-100
  PROFIT_FG:     '15803D',  // green-700
  LOSS_BG:       'FEE2E2',  // red-100
  LOSS_FG:       'B91C1C',  // red-700
  WHITE:         'FFFFFF'
}

const thinBorder = (clr = C.BORDER) => ({ style: 'thin', color: { rgb: clr } })
const doubleBorder = (clr = C.BORDER) => ({ style: 'double', color: { rgb: clr } })

function makeStyle(opts = {}) {
  return {
    font: {
      name: 'Calibri',
      sz: opts.sz || 10,
      bold: opts.bold || false,
      italic: opts.italic || false,
      color: { rgb: opts.fg || '000000' }
    },
    fill: opts.bg ? {
      type: 'pattern',
      patternType: 'solid',
      fgColor: { rgb: opts.bg }
    } : undefined,
    alignment: {
      horizontal: opts.align || 'left',
      vertical: 'center',
      wrapText: opts.wrap || false
    },
    border: opts.noBorder ? undefined : {
      top: opts.doubleTop ? doubleBorder() : thinBorder(),
      bottom: opts.doubleBottom ? doubleBorder() : thinBorder(),
      left: thinBorder(),
      right: thinBorder()
    }
  }
}

const S = {
  title: makeStyle({ sz: 16, bold: true, fg: C.PRIMARY_FG, bg: C.PRIMARY_BG, align: 'center', noBorder: true }),
  subtitle: makeStyle({ sz: 11, italic: true, fg: C.PRIMARY_FG, bg: C.ACCENT_BG, align: 'center', noBorder: true }),
  sectionHdr: makeStyle({ sz: 11, bold: true, fg: C.PRIMARY_FG, bg: C.PRIMARY_BG }),
  colHdr: makeStyle({ sz: 10, bold: true, fg: C.HDR_FG, bg: C.HDR_BG, align: 'center' }),
  
  labelL: makeStyle({ sz: 10 }),
  labelLBold: makeStyle({ sz: 10, bold: true }),
  valCurrency: makeStyle({ sz: 10, align: 'right' }),
  valCurrencyBold: makeStyle({ sz: 10, bold: true, align: 'right' }),
  
  revenueVal: makeStyle({ sz: 10, bold: true, fg: C.PROFIT_FG, align: 'right' }),
  costVal: makeStyle({ sz: 10, fg: C.LOSS_FG, align: 'right' }),
  costValBold: makeStyle({ sz: 10, bold: true, fg: C.LOSS_FG, align: 'right' }),
  
  profitRowLbl: makeStyle({ sz: 11, bold: true, fg: C.PROFIT_FG, bg: C.PROFIT_BG, doubleBottom: true }),
  profitRowVal: makeStyle({ sz: 11, bold: true, fg: C.PROFIT_FG, bg: C.PROFIT_BG, align: 'right', doubleBottom: true }),
  
  lossRowLbl: makeStyle({ sz: 11, bold: true, fg: C.LOSS_FG, bg: C.LOSS_BG, doubleBottom: true }),
  lossRowVal: makeStyle({ sz: 11, bold: true, fg: C.LOSS_FG, bg: C.LOSS_BG, align: 'right', doubleBottom: true }),
  
  empty: { border: {} }
}

function formatLabelMonth(monthStr) {
  if (!monthStr) return ''
  try {
    const [year, month] = monthStr.split('-')
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  } catch (e) {
    return monthStr
  }
}

export function exportDashboardExcel(kpis, trendData) {
  if (!kpis) {
    throw new Error('Aucune donnée de synthèse disponible pour l\'export.')
  }

  const wb = XLSXStyle.utils.book_new()
  const ws = {}
  const merges = []
  const rowHeights = []
  let r = 0

  function setCell(row, col, value, style) {
    const addr = XLSXStyle.utils.encode_cell({ r: row, c: col })
    ws[addr] = {
      v: value,
      s: style,
      t: typeof value === 'number' ? 'n' : 's'
    }
  }

  function addRowHeight(hpt) {
    rowHeights.push({ hpt })
  }

  // 1. Title Banner
  setCell(r, 0, 'RAPPORT FINANCIER MENSUEL — ECO-PARK', S.title)
  merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 4 } })
  for (let c = 1; c <= 4; c++) setCell(r, c, '', S.title)
  addRowHeight(35)
  r++

  // 2. Subtitle
  const labelMonth = formatLabelMonth(kpis.month)
  setCell(r, 0, `Période : ${labelMonth.toUpperCase()} (${kpis.month})`, S.subtitle)
  merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 4 } })
  for (let c = 1; c <= 4; c++) setCell(r, c, '', S.subtitle)
  addRowHeight(22)
  r++

  // Spacer
  addRowHeight(15)
  r++

  // 3. Section 1: Synthèse du Mois
  setCell(r, 0, 'SYNTHÈSE DES FLUX FINANCIERS', S.sectionHdr)
  merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 2 } })
  setCell(r, 1, '', S.sectionHdr)
  setCell(r, 2, '', S.sectionHdr)
  addRowHeight(24)
  r++

  // Table Headers
  setCell(r, 0, 'Catégorie de Flux', S.colHdr)
  setCell(r, 1, 'Type', S.colHdr)
  setCell(r, 2, 'Montant (DH)', S.colHdr)
  addRowHeight(20)
  r++

  // Revenues Row
  setCell(r, 0, 'Chiffre d\'Affaires / Recettes', S.labelLBold)
  setCell(r, 1, 'Entrée (+)', S.labelL)
  setCell(r, 2, kpis.totalRevenue, S.revenueVal)
  addRowHeight(22)
  r++

  // Purchases Row
  setCell(r, 0, 'Achats Matières / Fournisseurs', S.labelL)
  setCell(r, 1, 'Sortie (-)', S.labelL)
  setCell(r, 2, kpis.totalPurchases, S.costVal)
  addRowHeight(22)
  r++

  // Salaries Row
  setCell(r, 0, 'Masse Salariale / Paies', S.labelL)
  setCell(r, 1, 'Sortie (-)', S.labelL)
  setCell(r, 2, kpis.totalSalaries, S.costVal)
  addRowHeight(22)
  r++

  // Fixed expenses
  setCell(r, 0, 'Charges Fixes (Loyers, Abonnements, etc.)', S.labelL)
  setCell(r, 1, 'Sortie (-)', S.labelL)
  setCell(r, 2, kpis.totalFixedExpenses, S.costVal)
  addRowHeight(22)
  r++

  // Variable expenses
  setCell(r, 0, 'Charges Variables (Électricité, Maintenance, etc.)', S.labelL)
  setCell(r, 1, 'Sortie (-)', S.labelL)
  setCell(r, 2, kpis.totalVariableExpenses, S.costVal)
  addRowHeight(22)
  r++

  // Total Expenses
  setCell(r, 0, 'Total des Dépenses', S.labelLBold)
  setCell(r, 1, 'Sortie (-)', S.labelLBold)
  const totalOutflows = kpis.totalPurchases + kpis.totalSalaries + kpis.totalExpenses
  setCell(r, 2, totalOutflows, S.costValBold)
  addRowHeight(22)
  r++

  // Net Profit Highlight Row
  const isProfit = kpis.netProfit >= 0
  setCell(r, 0, isProfit ? 'RÉSULTAT NET (BÉNÉFICE)' : 'RÉSULTAT NET (DÉFICIT)', isProfit ? S.profitRowLbl : S.lossRowLbl)
  setCell(r, 1, isProfit ? 'Excédent' : 'Pertes', isProfit ? S.profitRowLbl : S.lossRowLbl)
  setCell(r, 2, kpis.netProfit, isProfit ? S.profitRowVal : S.lossRowVal)
  addRowHeight(26)
  r++

  // Spacer
  addRowHeight(20)
  r++

  // 4. Section 2: Trend / Évolution Historique
  if (trendData && trendData.length > 0) {
    setCell(r, 0, 'ÉVOLUTION HISTORIQUE DES DERNIERS MOIS', S.sectionHdr)
    merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 4 } })
    for (let c = 1; c <= 4; c++) setCell(r, c, '', S.sectionHdr)
    addRowHeight(24)
    r++

    // Trend Headers
    setCell(r, 0, 'Mois', S.colHdr)
    setCell(r, 1, 'Chiffre d\'Affaires', S.colHdr)
    setCell(r, 2, 'Charges Totales', S.colHdr)
    setCell(r, 3, 'Résultat Net', S.colHdr)
    setCell(r, 4, 'Rentabilité (%)', S.colHdr)
    addRowHeight(20)
    r++

    trendData.forEach((trend) => {
      const marginPercent = trend.revenue > 0 ? ((trend.profit / trend.revenue) * 100).toFixed(1) : '0.0'
      const profitStyle = trend.profit >= 0 ? S.revenueVal : S.costVal

      setCell(r, 0, formatLabelMonth(trend.month), S.labelLBold)
      setCell(r, 1, trend.revenue, S.valCurrency)
      setCell(r, 2, trend.costs, S.costVal)
      setCell(r, 3, trend.profit, profitStyle)
      setCell(r, 4, `${marginPercent} %`, makeStyle({ align: 'right', bold: true, fg: trend.profit >= 0 ? C.ACCENT_FG : C.LOSS_FG }))
      addRowHeight(22)
      r++
    })
  }

  // Dimension setup
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 4 } })
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 40 }, // A: Catégorie / Libellé
    { wch: 18 }, // B: Type / Flux
    { wch: 22 }, // C: Montant
    { wch: 22 }, // D: Historique Coûts / Résultat
    { wch: 18 }  // E: Rentabilité
  ]
  ws['!rows'] = rowHeights

  XLSXStyle.utils.book_append_sheet(wb, ws, 'Rapport Financier')

  const fileName = `EcoPark_Rapport_Financier_${kpis.month}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}
