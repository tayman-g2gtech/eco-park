import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Users, 
  Receipt, 
  Wallet,
  AlertTriangle,
  Plus,
  Coins,
  Loader2,
  FileDown
} from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import client from '@/api/client'
import { formatCurrency } from '@/lib/utils'
import MonthCarousel from '@/components/shared/MonthCarousel'
import { toast } from 'sonner'
import { exportDashboardExcel } from '@/utils/exportDashboardExcel'

// ─── Guide d'Opération Quotidienne (FR / AR) ────────────────────────────────
const GUIDE_CONTENT = {
  fr: {
    title: "Guide d'Opération Quotidienne",
    steps: [
      {
        n: '1',
        title: 'Mouvements de Stocks',
        desc: 'En fin de journée, déclarez les consommations et les ajouts de stock par pôle (PDJ, Bar, Crêperie) pour calculer le reste réel.',
      },
      {
        n: '2',
        title: 'Achats & Fournisseurs',
        desc: 'Enregistrez chaque facture ou règlement fournisseur quotidien (basé sur le format ACHAT.xlsx) pour suivre les charges variables.',
      },
      {
        n: '3',
        title: 'Planning Hebdomadaire',
        desc: 'Établissez le planning de présence. Les heures et présences alimentent directement le calcul mensuel de la masse salariale.',
      },
      {
        n: '4',
        title: 'Fiches de Paie & Charges',
        desc: 'Validez la paie des employés à la fin du mois, puis cliquez sur "Générer Charges" pour imputer automatiquement le coût sur le Dashboard.',
      },
    ],
  },
  ar: {
    title: 'دليل العمليات اليومية',
    steps: [
      {
        n: '١',
        title: 'حركات المخزون',
        desc: 'في نهاية كل يوم، سجّل الاستهلاكات والإضافات لكل قسم (PDJ، البار، الكريبري) لاحتساب الرصيد الحقيقي.',
      },
      {
        n: '٢',
        title: 'المشتريات والموردون',
        desc: 'سجّل كل فاتورة أو تسوية مع مورد يومياً (بناءً على ملف ACHAT.xlsx) لمتابعة التكاليف المتغيرة.',
      },
      {
        n: '٣',
        title: 'جدول العمل الأسبوعي',
        desc: 'ضع جدول الحضور الأسبوعي. تُغذّي ساعات الحضور تلقائياً حساب الرواتب الشهرية.',
      },
      {
        n: '٤',
        title: 'كشوف الرواتب والأعباء',
        desc: 'اعتمد رواتب الموظفين في نهاية الشهر، ثم انقر على "توليد الأعباء" لإدراج التكلفة تلقائياً في لوحة القيادة.',
      },
    ],
  },
}

function GuidePanel() {
  const [lang, setLang] = useState('fr')
  const content = GUIDE_CONTENT[lang]
  const isAr = lang === 'ar'

  return (
    /* dir on the root card — browser handles all flex/text direction */
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4 transition-all duration-300"
    >
      {/* Header — switcher pinned to the start edge (left in LTR, right in RTL)
          We force the switcher itself to stay LTR so FR | AR never flips */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">
          {content.title}
        </h3>
        <div dir="ltr" className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 gap-0.5 shrink-0">
          {['fr', 'ar'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 uppercase ${
                lang === l
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Steps grid — dir inherited from parent card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
        {content.steps.map((step) => (
          <div key={step.n} className="space-y-2">
            {/* flex without explicit direction — dir attribute handles it */}
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
              <span className="h-5 w-5 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center text-xs shrink-0">
                {step.n}
              </span>
              <span>{step.title}</span>
            </div>
            {/* ps-7 = padding-inline-start : adapts automatically to RTL/LTR */}
            <p className="text-xs leading-relaxed ps-7">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7) // YYYY-MM
  })
  const [kpis, setKpis] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [breakdownData, setBreakdownData] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Quick CA entry form state
  const [caDate, setCaDate] = useState(() => new Date().toISOString().split('T')[0])
  const [caAmount, setCaAmount] = useState('')
  const [caDescription, setCaDescription] = useState('')
  const [caSubmitting, setCaSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [kpiRes, trendRes, breakdownRes] = await Promise.all([
        client.get(`/dashboard/kpis?month=${selectedMonth}`),
        client.get('/dashboard/trend?months=6'),
        client.get(`/dashboard/expenses-breakdown?month=${selectedMonth}`)
      ])
      
      setKpis(kpiRes.data)
      setTrendData(trendRes.data)
      // Filter out values with value === 0 to avoid cluttering the chart
      setBreakdownData(breakdownRes.data.filter(item => item.value > 0))
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      toast.error('Erreur lors du chargement du tableau de bord')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const handleExportExcel = () => {
    try {
      exportDashboardExcel(kpis, trendData)
      toast.success('Rapport financier exporté avec succès !')
    } catch (err) {
      console.error('Error exporting dashboard excel:', err)
      toast.error(err.message || 'Erreur lors de l\'export du rapport')
    }
  }

  const handleAddCA = async (e) => {
    e.preventDefault()
    if (!caAmount || Number(caAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide')
      return
    }

    setCaSubmitting(true)
    try {
      await client.post('/revenues', {
        date: caDate,
        amount: Number(caAmount),
        description: caDescription || 'CA Saisi'
      })
      toast.success('Chiffre d\'Affaires ajouté avec succès !')
      setCaAmount('')
      setCaDescription('')
      fetchData() // Refresh dashboard
    } catch (err) {
      console.error('Error adding CA:', err)
      toast.error(err.response?.data?.message || 'Erreur lors de l\'ajout du CA')
    } finally {
      setCaSubmitting(false)
    }
  }

  if (loading && !kpis) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 size={40} className="animate-spin text-emerald-600 mb-2" />
        <p className="text-slate-500 text-sm">Chargement des indicateurs...</p>
      </div>
    )
  }

  const profitIsPositive = kpis ? kpis.netProfit >= 0 : true

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Tableau de Bord
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Indicateurs clés et performance financière d'Eco-Park.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold shadow-sm"
          >
            <FileDown size={16} />
            Exporter Rapport
          </button>
          <MonthCarousel value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Card 1: CA */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Chiffre d'Affaires
            </span>
            <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 p-2 rounded-xl">
              <Coins size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatCurrency(kpis?.totalRevenue)}
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              CA déclaré du mois
            </span>
          </div>
        </div>

        {/* Card 2: Purchases */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Achats Mat. Prem.
            </span>
            <div className="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 p-2 rounded-xl">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatCurrency(kpis?.totalPurchases)}
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Achats fournisseurs variables
            </span>
          </div>
        </div>

        {/* Card 3: Salaries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Masse Salariale
            </span>
            <div className="bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 p-2 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatCurrency(kpis?.totalSalaries)}
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Salaires nets calculés
            </span>
          </div>
        </div>

        {/* Card 4: Fixed Charges */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Charges & Loyers
            </span>
            <div className="bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 p-2 rounded-xl">
              <Receipt size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {formatCurrency(kpis?.totalExpenses)}
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Charges fixes & variables
            </span>
          </div>
        </div>

        {/* Card 5: Profit or Alert */}
        <div className={`border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 ${
          profitIsPositive 
            ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-300' 
            : 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30 text-red-900 dark:text-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-85">
              Bénéfice Net Est.
            </span>
            <div className={`p-2 rounded-xl ${
              profitIsPositive 
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
            }`}>
              {profitIsPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono">
              {formatCurrency(kpis?.netProfit)}
            </h3>
            <span className="text-xs opacity-75">
              Estimation nette mensuelle
            </span>
          </div>
        </div>
      </div>

      {/* Critical Stock Alert Banner if any */}
      {kpis?.stockAlertCount > 0 && (
        <div className="bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 flex items-center justify-between text-red-900 dark:text-red-300">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-2 rounded-lg">
              <AlertTriangle size={20} className="animate-bounce" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Alerte de Stock Critique !</h4>
              <p className="text-xs opacity-80 mt-0.5">
                Il y a <strong>{kpis.stockAlertCount}</strong> produits dont le stock restant est sous le seuil d'alerte aujourd'hui.
              </p>
            </div>
          </div>
          <Link 
            to="/stock/movements" 
            className="text-xs font-semibold bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            Voir le Stock
          </Link>
        </div>
      )}

      {/* Main Charts & CA Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Trend Area Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              Évolution Financière (CA vs Charges globales)
            </h3>
            <span className="text-xs text-slate-400">Derniers 6 mois</span>
          </div>
          <div className="h-72 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="label" className="text-xs fill-slate-400 font-mono" />
                  <YAxis className="text-xs fill-slate-400 font-mono" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    formatter={(value) => [`${value.toLocaleString()} DH`]}
                  />
                  <Area name="CA" type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area name="Charges" type="monotone" dataKey="costs" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorCosts)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Aucune donnée financière enregistrée.
              </div>
            )}
          </div>
        </div>

        {/* Expenses Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            Répartition des Dépenses
          </h3>
          <div className="h-60 w-full flex items-center justify-center">
            {breakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    formatter={(value) => [`${value.toLocaleString()} DH`]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" className="text-xs" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Aucune dépense ce mois-ci.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saisie rapide CA & alert details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick CA Entry Widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm lg:col-span-1 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl">
              <Wallet size={18} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">
              Saisir le Chiffre d'Affaires
            </h3>
          </div>
          
          <form onSubmit={handleAddCA} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={caDate}
                onChange={(e) => setCaDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Montant (DH)</label>
              <input
                type="number"
                placeholder="Ex: 8500"
                value={caAmount}
                onChange={(e) => setCaAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-mono"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Note (optionnelle)</label>
              <input
                type="text"
                placeholder="Ex: Services midi + soir"
                value={caDescription}
                onChange={(e) => setCaDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={caSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-2.5 text-sm shadow-sm active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
            >
              {caSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>Valider le CA</span>
            </button>
          </form>
        </div>

        {/* Quick Instructions & Help Panel */}
        <GuidePanel />
      </div>
    </div>
  )
}
