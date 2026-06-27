// ─── exportPlanningExcel.js ──────────────────────────────────────────────────
// Professional Excel export for Eco-Park — Planning de Présence Hebdomadaire
// Grouped by Service (Pôle) with vertical merged labels and original styling.
// Uses xlsx-js-style (SheetJS fork with cell-level styling support)
// ─────────────────────────────────────────────────────────────────────────────
import XLSXStyle from 'xlsx-js-style'

// ─── Brand Colour Palette (Original Theme) ──────────────────────────────────
const C = {
  TITLE_BG:      'D1FAE5',  // emerald-100  — header banner (from original version)
  TITLE_FG:      '064E3B',  // emerald-900
  SUBTITLE_BG:   'ECFDF5',  // emerald-50
  SUBTITLE_FG:   '065F46',  // emerald-800
  COL_HDR_BG:    'E2E8F0',  // slate-200    — column headers (from original version)
  COL_HDR_FG:    '0F172A',  // slate-950
  ROW_ODD:       'FFFFFF',
  ROW_EVEN:      'F8FAFC',  // slate-50
  POLE_BG:       'F1F5F9',  // Light grey for group column
  POLE_FG:       '000000',
  BORDER:        'A6A6A6',  // Medium gray border (darker for high visibility)
  BORDER_DARK:   '64748B',  // slate-500

  // Soft shift styles matching the original theme
  SHIFT_07_BG:   'D1FAE5',  // soft green
  SHIFT_07_FG:   '065F46',  // dark green
  SHIFT_15_BG:   'E0E7FF',  // soft blue
  SHIFT_15_FG:   '3730A3',  // dark blue
  
  // Highlight for Repos / CNG / RCP matching user template (yellow)
  HIGHLIGHT_BG:  'FFFF00',
  HIGHLIGHT_FG:  '000000',
}

const thinBorder = (clr = C.BORDER) => ({ style: 'thin', color: { rgb: clr } })
const allBorders = (thin) => ({ top: thin, bottom: thin, left: thin, right: thin })

function makeStyle(opts = {}) {
  const style = {
    font: {
      name:   'Calibri',
      sz:     opts.sz    ?? 10,
      bold:   opts.bold  ?? false,
      italic: opts.italic ?? false,
      color:  { rgb: opts.fg ?? '000000' },
    },
    fill: {
      patternType: 'solid',
      fgColor: { rgb: opts.bg ?? 'FFFFFF' },
    },
    alignment: {
      horizontal: opts.h    ?? 'left',
      vertical:   opts.v    ?? 'center',
      wrapText:   opts.wrap ?? false,
      textRotation: opts.rot ?? undefined,
    },
  }

  if (!opts.noBorder) {
    style.border = allBorders(thinBorder(opts.borderClr ?? C.BORDER))
  }

  return style
}

// Pre-built styles
const S = {
  title:      makeStyle({ bg: C.TITLE_BG, fg: C.TITLE_FG, bold: true, sz: 14, h: 'center' }),
  sub:        makeStyle({ bg: C.SUBTITLE_BG, fg: C.SUBTITLE_FG, bold: false, sz: 9, h: 'left', italic: true }),
  poleLabel:  makeStyle({ bg: C.POLE_BG, fg: C.POLE_FG, bold: true, h: 'center', v: 'center', rot: 90 }),
  hdr:        makeStyle({ bg: C.COL_HDR_BG, fg: C.COL_HDR_FG, bold: true, sz: 9, h: 'center' }),
  empty:      makeStyle({ noBorder: true }),
  
  dataL:      (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'left' }),
  dataC:      (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'center' }),
  dataNum:    (even) => makeStyle({ bg: even ? C.ROW_EVEN : C.ROW_ODD, h: 'center', numFmt: '0' }),
  
  shift07:    makeStyle({ bg: C.SHIFT_07_BG, fg: C.SHIFT_07_FG, bold: true, h: 'center' }),
  shift15:    makeStyle({ bg: C.SHIFT_15_BG, fg: C.SHIFT_15_FG, bold: true, h: 'center' }),
  shiftRest:  makeStyle({ bg: C.HIGHLIGHT_BG, fg: C.HIGHLIGHT_FG, bold: true, h: 'center' }),

  separator:  makeStyle({ bg: C.COL_HDR_BG, fg: C.COL_HDR_FG, h: 'center', sz: 8 }),
  summaryLbl: makeStyle({ bg: 'F8FAFC', fg: '475569', bold: true, sz: 9, h: 'right' }),
  summaryVal: makeStyle({ bg: 'F8FAFC', fg: '475569', bold: true, h: 'center', numFmt: '0' }),
}

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const TOTAL_COLS = 12 // A (margin) + B (Pôle) + C (N°) + D (Nom) + E-K (7 Days) + L (RCP)
const DATA_START = 1  // Starts at Column B (index 1)

const POLE_TRANSLATIONS = {
  'Caisse': 'La Caisse',
  'Bar': 'Bar',
  'Service': 'SERVICE',
  'Cuisine': 'Cuisine',
  'Creperie': 'Crêperie',
  'PDJ': 'PDJ',
  'Commis': 'Commis'
}

function getPoleLabel(pole) {
  return POLE_TRANSLATIONS[pole] || pole
}

// REST shifts show ***, others show as is
function getShiftText(val) {
  if (val === 'REST') return '***'
  return val || '***'
}

function getShiftStyle(val) {
  if (val === '07H00-AP') return S.shift07
  if (val === '15H00-FS') return S.shift15
  return S.shiftRest // REST, CNG, RCP (Yellow highlight)
}

function isHighlightShift(val) {
  return val === 'REST' || val === 'CNG' || val === 'RCP'
}

function buildSheet(entries, weekLabel, selectedPole) {
  const ws = {}
  const merges = []
  const rowHeights = []
  let r = 0

  function setCell(row, col, value, style) {
    const addr = XLSXStyle.utils.encode_cell({ r: row, c: col })
    ws[addr] = {
      v: value,
      s: style,
      t: typeof value === 'number' ? 'n' : 's',
    }
  }

  function mergeCols(row, fromCol, toCol) {
    merges.push({ s: { r: row, c: fromCol }, e: { r: row, c: toCol } })
  }

  function addRowHeight(hpt) {
    rowHeights.push({ hpt })
  }

  // ── Row 0: Top Margin ──
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)
  addRowHeight(8)
  r++

  // ── Row 1: Green Title Header (Original Theme) ──
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START; c < TOTAL_COLS; c++) setCell(r, c, '', S.title)
  setCell(r, DATA_START, '🌿  ECO-PARK — PLANNING DE PRÉSENCE HEBDOMADAIRE', S.title)
  mergeCols(r, DATA_START, TOTAL_COLS - 1)
  addRowHeight(32)
  r++

  // ── Row 2: Green Subtitle Header (Original Theme) ──
  setCell(r, 0, '', S.empty)
  for (let c = DATA_START; c < TOTAL_COLS; c++) setCell(r, c, '', S.sub)
  const poleLabelText = selectedPole === 'All' ? 'Tous les pôles' : (selectedPole === 'Creperie' ? 'Crêperie' : selectedPole)
  setCell(r, DATA_START, `Période : ${weekLabel}     Pôle : ${poleLabelText}     Généré le : ${new Date().toLocaleDateString('fr-MA')}     Module : RH & Planning`, S.sub)
  mergeCols(r, DATA_START, TOTAL_COLS - 1)
  addRowHeight(16)
  r++

  // ── Row 3: Spacer ──
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)
  addRowHeight(10)
  r++

  // ── Row 4: Single Main Header (Only Once at the Top of the Table) ──
  const currentYear = new Date().getFullYear()
  setCell(r, 0, '', S.empty)
  setCell(r, 1, 'Service', S.hdr)
  setCell(r, 2, 'N°', S.hdr)
  setCell(r, 3, 'Nom & Prénom', S.hdr)
  const dayHeaders = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  dayHeaders.forEach((day, index) => {
    setCell(r, 4 + index, `${day} ${currentYear}`, S.hdr)
  })
  setCell(r, 11, 'RCP', S.hdr)
  addRowHeight(24)
  r++

  // ── Group entries by Pole ──
  const grouped = {}
  entries.forEach(entry => {
    const emp = entry.employeeId || {}
    const pole = emp.pole || 'Autre'
    if (!grouped[pole]) grouped[pole] = []
    grouped[pole].push(entry)
  })

  const poleOrder = ['Caisse', 'Bar', 'Service', 'Cuisine', 'Creperie', 'PDJ', 'Commis']
  const sortedPoles = Object.keys(grouped).sort((a, b) => {
    let idxA = poleOrder.indexOf(a)
    let idxB = poleOrder.indexOf(b)
    if (idxA === -1) idxA = 99
    if (idxB === -1) idxB = 99
    return idxA - idxB
  })

  let globalSeq = 1

  // Summary counts initialization
  const shift07Counts = DAYS.map(() => 0)
  const shift15Counts = DAYS.map(() => 0)
  const restCounts = DAYS.map(() => 0)

  sortedPoles.forEach((poleKey, poleIdx) => {
    const poleEntries = grouped[poleKey]
    if (poleEntries.length === 0) return

    // ── Separator Row between service groups ──
    if (poleIdx > 0) {
      setCell(r, 0, '', S.empty)
      for (let c = DATA_START; c < TOTAL_COLS; c++) {
        setCell(r, c, '', S.separator)
      }
      addRowHeight(12) // Smaller height for separator row acting as a line divider
      r++
    }

    const poleLabel = getPoleLabel(poleKey)
    const startRow = r

    // Data rows for each employee in this group
    poleEntries.forEach((entry, idx) => {
      const emp = entry.employeeId || {}
      const even = idx % 2 === 1
      
      setCell(r, 0, '', S.empty)
      setCell(r, 1, '', makeStyle({ bg: C.POLE_BG, noBorder: false })) // Placeholder for pole label merge
      setCell(r, 2, globalSeq++, S.dataC(even))
      setCell(r, 3, emp.fullName || '', S.dataL(even))

      // Days shifts
      DAYS.forEach((day, index) => {
        const val = entry[day] || 'REST'
        setCell(r, 4 + index, getShiftText(val), getShiftStyle(val))

        // Accumulate summary counts
        if (val === '07H00-AP') shift07Counts[index]++
        else if (val === '15H00-FS') shift15Counts[index]++
        else if (val === 'REST') restCounts[index]++
      })

      // RCP value
      setCell(r, 11, entry.rcp || '', S.dataNum(even))
      addRowHeight(24) // Tall data rows for spacing and rotated text
      r++
    })

    const endRow = r - 1

    // Merge Column B (index 1) from startRow to endRow and set the Pole Label
    setCell(startRow, 1, poleLabel, S.poleLabel)
    merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } })
  })

  // ── Spacer before summary rows ──
  for (let c = 0; c < TOTAL_COLS; c++) setCell(r, c, '', S.empty)
  addRowHeight(10)
  r++

  // ── Summary Rows ──
  // Summary 1: Matin AP
  setCell(r, 0, '', S.empty)
  setCell(r, 1, 'Effectif Matin (07H00-AP)', S.summaryLbl)
  mergeCols(r, 1, 3)
  for (let c = 1; c < TOTAL_COLS; c++) {
    if (c > 3) setCell(r, c, '', S.summaryLbl)
  }
  DAYS.forEach((_, dIdx) => {
    setCell(r, 4 + dIdx, shift07Counts[dIdx], S.summaryVal)
  })
  addRowHeight(22)
  r++

  // Summary 2: Après-midi FS
  setCell(r, 0, '', S.empty)
  setCell(r, 1, 'Effectif Après-midi (15H00-FS)', S.summaryLbl)
  mergeCols(r, 1, 3)
  for (let c = 1; c < TOTAL_COLS; c++) {
    if (c > 3) setCell(r, c, '', S.summaryLbl)
  }
  DAYS.forEach((_, dIdx) => {
    setCell(r, 4 + dIdx, shift15Counts[dIdx], S.summaryVal)
  })
  addRowHeight(22)
  r++

  // Summary 3: Repos
  setCell(r, 0, '', S.empty)
  setCell(r, 1, 'Effectif en Repos', S.summaryLbl)
  mergeCols(r, 1, 3)
  for (let c = 1; c < TOTAL_COLS; c++) {
    if (c > 3) setCell(r, c, '', S.summaryLbl)
  }
  DAYS.forEach((_, dIdx) => {
    setCell(r, 4 + dIdx, restCounts[dIdx], S.summaryVal)
  })
  addRowHeight(22)
  r++

  // Set ranges and dimensions
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: TOTAL_COLS - 1 } })
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 3  }, // A: Left Margin
    { wch: 14 }, // B: Pôle/Service (Increased width for rotated text)
    { wch: 5  }, // C: N°
    { wch: 25 }, // D: Nom & Prénom
    { wch: 14 }, // E: Lundi
    { wch: 14 }, // F: Mardi
    { wch: 14 }, // G: Mercredi
    { wch: 14 }, // H: Jeudi
    { wch: 14 }, // I: Vendredi
    { wch: 14 }, // J: Samedi
    { wch: 14 }, // K: Dimanche
    { wch: 8  }, // L: RCP
  ]
  ws['!rows'] = rowHeights

  return ws
}

export async function exportPlanningExcel(entries, weekLabel, selectedPole) {
  if (!entries || entries.length === 0) {
    throw new Error('Aucune donnée à exporter.')
  }

  const wb = XLSXStyle.utils.book_new()
  const sheetName = `Planning`.slice(0, 31)
  const ws = buildSheet(entries, weekLabel, selectedPole)
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName)

  const cleanLabel = (weekLabel || 'export').replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `EcoPark_Planning_${cleanLabel}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}
