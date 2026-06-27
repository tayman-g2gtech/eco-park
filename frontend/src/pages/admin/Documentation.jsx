import React, { useState } from 'react'
import {
  BookOpen, LayoutDashboard, Package, ShoppingCart, Receipt,
  CalendarDays, Banknote, Settings, ChevronRight, ChevronDown, ChevronLeft,
  AlertTriangle, Info, Lightbulb, AlertCircle, Search, Lock,
  FileText, ArrowRight, ArrowLeft, Hash, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Data: French manual sections ──────────────────────────────────────────
const DOCS_FR = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    activeBg: 'bg-emerald-50/80 dark:bg-slate-800',
    activeBorder: 'border-emerald-200 dark:border-slate-700/60',
    title: "Tableau de Bord Financier",
    subtitle: "KPIs, graphiques et saisie CA",
    content: [
      { type: 'paragraph', text: "Le Tableau de Bord est le poste de pilotage décisionnel du gérant. Il synthétise l'activité économique du mois sélectionné." },
      { type: 'heading', text: "Indicateurs Clés (KPIs)" },
      {
        type: 'kpis', items: [
          { label: "Chiffre d'Affaires (CA)", desc: 'Total cumulé des ventes déclarées sur le mois.' },
          { label: 'Achats Mat. Premières', desc: 'Total des achats auprès des fournisseurs.' },
          { label: 'Masse Salariale', desc: 'Coût global des salaires nets du mois.' },
          { label: 'Charges & Loyers', desc: 'Somme de toutes les charges fixes et variables.' },
          { label: 'Bénéfice Net Estimé', desc: 'CA − Achats − Salaires − Charges. Vert si bénéfice, rouge si déficit.' },
        ]
      },
      { type: 'formula', text: "Bénéfice Net = CA − Achats Fournisseurs − Masse Salariale − Charges d'Exploitation" },
      { type: 'heading', text: "Graphiques Dynamiques" },
      {
        type: 'list', items: [
          "Évolution Financière : Courbe CA vs charges sur les 6 derniers mois.",
          "Répartition des Dépenses : Camembert des catégories de dépenses."
        ]
      },
      { type: 'heading', text: "Saisie Rapide du Chiffre d'Affaires" },
      {
        type: 'steps', items: [
          "Sélectionnez la Date de la déclaration (défaut = aujourd'hui).",
          "Saisissez le Montant en Dirhams (DH).",
          "Ajoutez une Note optionnelle (ex: \"Service midi complet\").",
          "Cliquez sur Valider le CA → le tableau se met à jour instantanément."
        ]
      }
    ]
  },
  {
    id: 'stock',
    icon: Package,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    activeBg: 'bg-blue-50/80 dark:bg-slate-800',
    activeBorder: 'border-blue-200 dark:border-slate-700/60',
    title: "Stocks & Catalogue Produits",
    subtitle: "Inventaire, seuils d'alerte et mouvements",
    content: [
      { type: 'heading', text: "Catalogue Produits (Référentiel)" },
      { type: 'paragraph', text: "Avant de déclarer des mouvements, les produits doivent exister dans le catalogue." },
      {
        type: 'list', items: [
          "Nom de l'article (ex: \"FILETS DE POULET\").",
          "Catégorie (ex: \"Viande\", \"Épicerie\").",
          "Pôle : PDJ (Petit-déjeuner), Bar, Crêperie ou All (Tous).",
          "Unité de mesure (kg, boite, l, pièce...).",
          "Seuil critique : quantité minimale déclenchant une alerte de rupture."
        ]
      },
      { type: 'alert', variant: 'info', text: "Utilisez les boutons ✏️ (modifier) ou 🗑️ (supprimer) sur chaque fiche produit." },
      { type: 'heading', text: "Mouvements de Stock (Saisie de Fin de Service)" },
      { type: 'alert', variant: 'important', text: "La saisie s'effectue obligatoirement par Pôle (PDJ, Bar ou Crêperie) afin de diviser la grille et simplifier la tâche des responsables." },
      {
        type: 'steps', items: [
          "Choisir la date via le carrousel des jours en haut à droite.",
          "Choisir le pôle concerné (ex: Bar).",
          "Vérifier le \"Reste d'Hier\" — récupéré automatiquement.",
          "Saisir les Ajouts (+) et Consommations (−).",
          "Vérifier le stock calculé : Reste = Hier + Ajouts − Consommations.",
          "Enregistrer ligne par ligne ✔️ ou tout valider via \"Enregistrer tout\"."
        ]
      },
      { type: 'formula', text: "Reste Aujourd'hui = Reste d'Hier + Ajouts − Consommations" },
      { type: 'alert', variant: 'warning', text: "Si le stock calculé tombe sous le seuil critique → la ligne s'affiche en rouge et une alerte \"Critique\" clignote. Une notification persiste sur le Dashboard." }
    ]
  },
  {
    id: 'purchases',
    icon: ShoppingCart,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/20',
    activeBg: 'bg-orange-50/80 dark:bg-slate-800',
    activeBorder: 'border-orange-200 dark:border-slate-700/60',
    title: "Achats Fournisseurs",
    subtitle: "Factures, fournisseurs et charges variables",
    content: [
      { type: 'paragraph', text: "Ce module remplace le fichier ACHAT.xlsx. Il comporte deux onglets : Achats du Mois et Gestion Fournisseurs." },
      { type: 'heading', text: "Gestion des Fournisseurs" },
      {
        type: 'steps', items: [
          "Cliquez sur Nouveau Fournisseur.",
          "Renseignez Nom, Téléphone, Catégorie (Viandes, Épicerie, Boulangerie...).",
          "Définissez le Règlement par Défaut (Espèce, Chèque, Virement).",
          "Cliquez sur Valider."
        ]
      },
      { type: 'heading', text: "Saisie d'un Achat" },
      {
        type: 'steps', items: [
          "Date d'achat : date du reçu ou de la livraison.",
          "Fournisseur : sélectionnez dans la liste déroulante.",
          "Montant (DH) : total TTC de la facture.",
          "Règlement : s'adapte au profil fournisseur (modifiable).",
          "N° Pièce / Facture : pour le suivi comptable.",
          "Note / Détail : précisez le contenu (ex: \"Viande hachée 5kg\").",
          "Cliquez sur Valider."
        ]
      },
      { type: 'alert', variant: 'tip', text: "Le bas de page affiche un bandeau de totalisation style Excel avec la somme exacte de toutes les dépenses fournisseurs du mois." }
    ]
  },
  {
    id: 'expenses',
    icon: Receipt,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/20',
    activeBg: 'bg-purple-50/80 dark:bg-slate-800',
    activeBorder: 'border-purple-200 dark:border-slate-700/60',
    title: "Finances & Charges Fixes",
    subtitle: "Loyer, factures, suivi CA historique",
    content: [
      { type: 'paragraph', text: "Ce module gère les charges de structure (loyer, eau, électricité) et l'historique complet du Chiffre d'Affaires." },
      { type: 'heading', text: "Onglet 1 — Charges & Frais Fixes" },
      {
        type: 'steps', items: [
          "Nom du frais : désignation de la charge (ex: \"Loyer Local Juin\").",
          "Montant (DH) et Catégorie : Charge Fixe (loyer, assurances) ou Charge Variable.",
          "Date de paiement : date de règlement effectif.",
          "Cliquer sur Valider pour inscrire la charge au registre mensuel."
        ]
      },
      { type: 'heading', text: "Onglet 2 — Suivi du Chiffre d'Affaires" },
      { type: 'paragraph', text: "Liste jour par jour de toutes les déclarations de ventes. Modifiez un montant erroné ou supprimez une double saisie via les icônes ✏️ et 🗑️ en bout de ligne." }
    ]
  },
  {
    id: 'planning',
    icon: CalendarDays,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/20',
    activeBg: 'bg-cyan-50/80 dark:bg-slate-800',
    activeBorder: 'border-cyan-200 dark:border-slate-700/60',
    title: "Planning de Présence & RH",
    subtitle: "Employés, grille hebdomadaire, congés",
    content: [
      { type: 'paragraph', text: "Ce module remplace PLANNING21.xlsx. Il comporte deux onglets : Planning de Présence et Gestion du Personnel." },
      { type: 'heading', text: "Fiche Salarié (Gestion du Personnel)" },
      {
        type: 'list', items: [
          "Matricule : numéro unique d'identification.",
          "Pôle de service : Caisse, Bar, Service, Cuisine, Crêperie, PDJ, Commis.",
          "Nom & Prénom et Poste (ex: \"Barman\").",
          "Type Paiement — Mensuel (fixe) ou Journalier (prorata des jours travaillés).",
          "Salaire Net (DH) : salaire net mensuel de base.",
          "Taux journalier : valeur journalière brute (pour paiement journalier)."
        ]
      },
      { type: 'heading', text: "Planning de Présence — Légende des Shifts" },
      {
        type: 'shifts', items: [
          { code: '***', label: 'Repos (REST)', desc: 'Jour non travaillé' },
          { code: '07H00', label: 'Shift Matin', desc: '' },
          { code: '11H00', label: 'Shift Midi', desc: '' },
          { code: '15H00', label: 'Shift Après-midi', desc: '' },
          { code: '15H00-FS', label: 'Fin de Service', desc: '' },
          { code: 'SOIR', label: 'Shift Soirée', desc: '' },
          { code: 'CPR', label: 'Congé Payé', desc: '' },
          { code: 'RCP', label: 'Récupération', desc: 'Déduit un jour de congé à récupérer' },
          { code: 'CNG', label: 'Congé sans solde', desc: 'Absence non rémunérée' },
        ]
      },
      { type: 'heading', text: "Modification d'un Créneau" },
      { type: 'paragraph', text: "Cliquez sur la case correspondant au jour de l'employé et sélectionnez la nouvelle valeur. L'enregistrement est automatique et instantané." },
      { type: 'alert', variant: 'info', text: "Le compteur RCP en fin de ligne permet de tenir à jour le solde de jours de récupération cumulés. Modifiez directement la valeur pour qu'elle s'enregistre." }
    ]
  },
  {
    id: 'salaries',
    icon: Banknote,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-200 dark:border-yellow-500/20',
    activeBg: 'bg-yellow-50/80 dark:bg-slate-800',
    activeBorder: 'border-yellow-200 dark:border-slate-700/60',
    title: "Masse Salariale & Paie",
    subtitle: "Calcul de paie, avances, imputation, exports",
    content: [
      { type: 'paragraph', text: "Ce module remplace MASSE SALAIRE.xlsx. Il extrait les données réelles du planning pour éditer les fiches de paie." },
      { type: 'heading', text: "Processus de Calcul de la Paie" },
      {
        type: 'steps', items: [
          "Cliquez sur le bouton vert \"Générer et Calculer la Paie\".",
          "L'application scanne le planning du mois et détermine les jours travaillés.",
          "Les résultats s'affichent dans la grille avec le détail par employé."
        ]
      },
      { type: 'heading', text: "Avances sur Salaire" },
      {
        type: 'steps', items: [
          "Saisissez le montant dans la colonne Avances (DH).",
          "Cliquez sur le bouton ✔️ de validation à droite de la ligne.",
          "Le Net à Payer est recalculé automatiquement."
        ]
      },
      { type: 'formula', text: 'Net à Payer = Salaire Calculé (Prorata) − Avances' },
      { type: 'heading', text: "Clôture & Imputation Comptable" },
      {
        type: 'steps', items: [
          "Cliquez sur \"Générer la Charge de Paie\".",
          "Une charge globale \"Masse Salariale [Mois]\" est créée automatiquement.",
          "Cette charge apparaît instantanément sur le Tableau de Bord."
        ]
      },
      { type: 'heading', text: "Exports & Impression" },
      {
        type: 'list', items: [
          "Exporter CSV : fichier compatible Excel avec le détail des salaires.",
          "Imprimer : version imprimable épurée pour édition papier ou PDF."
        ]
      }
    ]
  },
  {
    id: 'users',
    icon: Users,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    activeBg: 'bg-amber-50/80 dark:bg-slate-800',
    activeBorder: 'border-amber-200 dark:border-slate-700/60',
    title: "Gestion des Utilisateurs",
    subtitle: "Contrôle d'accès, rôles et sécurité",
    content: [
      { type: 'paragraph', text: "Le module de gestion des utilisateurs permet aux administrateurs de créer, modifier, désactiver ou supprimer les accès à l'application Eco-Park." },
      { type: 'heading', text: "Niveaux d'Accès & Rôles" },
      {
        type: 'list', items: [
          "Admin / Gérant : Accès complet à tous les modules administratifs (Dashboard, Stocks, Achats, Finances, RH, Salaires, Paramètres et Documentation).",
          "Staff : Accès strictement limité au Planning hebdomadaire en lecture seule. Pas de barre latérale de navigation."
        ]
      },
      { type: 'heading', text: "Création d'un Utilisateur" },
      {
        type: 'steps', items: [
          "Cliquez sur Nouvel Utilisateur.",
          "Sélectionnez le Rôle (Admin ou Staff).",
          "Si le rôle choisi est Staff, sélectionnez obligatoirement l'Employé lié dans la liste déroulante. Son Nom complet et son Pôle seront automatiquement pré-remplis et verrouillés pour garantir la cohérence.",
          "Saisissez l'Adresse email unique.",
          "Attribuez un Mot de passe initial (min. 4 caractères).",
          "Validez pour créer le compte."
        ]
      },
      { type: 'heading', text: "Actions de Gestion" },
      {
        type: 'list', items: [
          "Modifier (✏️) : Permet de changer le nom, l'email, le rôle ou le pôle d'un utilisateur.",
          "Réinitialiser le mot de passe (🔑) : Permet d'attribuer un nouveau mot de passe si l'utilisateur l'a oublié.",
          "Activer / Désactiver (🔒/🔓) : Un compte désactivé ne peut plus se connecter à l'application. Les administrateurs ne peuvent pas désactiver leur propre compte.",
          "Supprimer (🗑️) : Supprime définitivement le compte utilisateur. Les administrateurs ne peuvent pas supprimer leur propre compte ni le dernier administrateur actif restant."
        ]
      },
      { type: 'alert', variant: 'important', text: "Sécurité : Afin d'éviter tout blocage du système, le serveur applique des gardes strictes pour empêcher l'auto-suppression et la suppression du dernier administrateur." }
    ]
  }
]

// ─── Data: Arabic translated manual sections ──────────────────────────────
const DOCS_AR = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    activeBg: 'bg-emerald-50/80 dark:bg-slate-800',
    activeBorder: 'border-emerald-200 dark:border-slate-700/60',
    title: "لوحة التحكم المالية",
    subtitle: "المؤشرات والرسوم البيانية وإدخال المداخيل",
    content: [
      { type: 'paragraph', text: "لوحة التحكم هي أداة اتخاذ القرار الرئيسية للمدير. حيث تلخص النشاط الاقتصادي للشهر المحدد." },
      { type: 'heading', text: "المؤشرات الرئيسية (KPIs)" },
      {
        type: 'kpis', items: [
          { label: "رقم المعاملات (CA)", desc: "إجمالي المبيعات المصرح بها خلال الشهر." },
          { label: "مشتريات المواد الأولية", desc: "إجمالي المشتريات من الموردين." },
          { label: "كتلة الأجور", desc: "التكلفة الإجمالية للرواتب الصافية خلال الشهر." },
          { label: "التكاليف والإيجارات", desc: "مجموع التكاليف الثابتة والمتغيرة." },
          { label: "الأرباح الصافية التقديرية", desc: "رقم المعاملات − المشتريات − الأجور − التكاليف. اللون الأخضر يمثل الربح، بينما يمثل اللون الأحمر عجزاً مالياً." }
        ]
      },
      { type: 'formula', text: "الأرباح الصافية = رقم المعاملات − مشتريات الموردين − كتلة الأجور − تكاليف التشغيل" },
      { type: 'heading', text: "الرسوم البيانية التفاعلية" },
      {
        type: 'list', items: [
          "التطور المالي: منحنى رقم المعاملات مقابل التكاليف على مدى الأشهر الستة الماضية.",
          "توزيع المصاريف: مخطط دائري لمختلف فئات النفقات."
        ]
      },
      { type: 'heading', text: "الإدخال السريع لرقم المعاملات" },
      {
        type: 'steps', items: [
          "اختر تاريخ التصريح (تلقائياً تاريخ اليوم).",
          "أدخل المبلغ بالدرهم المغربي (DH).",
          "أضف ملاحظة اختيارية (مثال: \"الخدمة ممتلئة في وجبة الغداء\").",
          "اضغط على تأكيد رقم المعاملات ليتم تحديث لوحة التحكم فوراً."
        ]
      }
    ]
  },
  {
    id: 'stock',
    icon: Package,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    activeBg: 'bg-blue-50/80 dark:bg-slate-800',
    activeBorder: 'border-blue-200 dark:border-slate-700/60',
    title: "المخازن وكتالوج المنتجات",
    subtitle: "الجرد، عتبات التنبيه وحركات المواد",
    content: [
      { type: 'heading', text: "كتالوج المنتجات (المرجع)" },
      { type: 'paragraph', text: "قبل تسجيل أي حركة للمخزون، يجب أن تكون المنتجات معرفة مسبقاً في الكتالوج." },
      {
        type: 'list', items: [
          "اسم المنتج (مثال: \"شرائح الدجاج\").",
          "الفئة (مثال: \"لحوم\"، \"بقالة\").",
          "القسم: وجبة الإفطار (PDJ)، البار، الكريب (Crep)، أو الكل (All).",
          "وحدة القياس (كجم، علبة، لتر، قطعة...).",
          "العتبة الحرجة: الحد الأدنى للكمية التي تفعل تنبيه قرب النفاد."
        ]
      },
      { type: 'alert', variant: 'info', text: "استخدم زر ✏️ (تعديل) أو 🗑️ (حذف) لإدارة بطاقة كل منتج." },
      { type: 'heading', text: "حركات المخزون (إدخال نهاية الخدمة)" },
      { type: 'alert', variant: 'important', text: "يتم الإدخال إلزامياً حسب القسم (وجبة الإفطار، البار، أو الكريب) لتسهيل العمل وتوزيع المهام على المسؤولين." },
      {
        type: 'steps', items: [
          "اختر التاريخ عبر شريط الأيام في الأعلى.",
          "اختر القسم المعني (مثال: البار).",
          "تحقق من \"المتبقي من الأمس\" — يتم جلبه تلقائياً.",
          "أدخل الإضافات (+) والاستهلاك (-).",
          "تحقق من المخزون المحسوب: المتبqui = الأمس + الإضافات − الاستهلاك.",
          "احفظ سطراً بسطر ✔️ أو الكل معاً عبر زر \"حفظ الكل\"."
        ]
      },
      { type: 'formula', text: "المتبقي اليوم = المتبقي من الأمس + الإضافات − الاستهلاك" },
      { type: 'alert', variant: 'warning', text: "إذا انخفض المخزون المحسوب عن العتبة الحرجة ← يظهر السطر باللون الأحمر ويومض تنبيه \"حرج\". ويظل التنبيه ظاهراً في لوحة التحكم." }
    ]
  },
  {
    id: 'purchases',
    icon: ShoppingCart,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/20',
    activeBg: 'bg-orange-50/80 dark:bg-slate-800',
    activeBorder: 'border-orange-200 dark:border-slate-700/60',
    title: "مشتريات الموردين",
    subtitle: "الفواتير، الموردون والتكاليف المتغيرة",
    content: [
      { type: 'paragraph', text: "هذا القسم يعوض ملف العمل ACHAT.xlsx. ويحتوي على علامتي تبويب: مشتريات الشهر وإدارة الموردين." },
      { type: 'heading', text: "إدارة الموردين" },
      {
        type: 'steps', items: [
          "اضغط على مورد جديد.",
          "أدخل الاسم، الهاتف، الفئة (لحوم، بقالة، مخبزة...).",
          "حدد طريقة الدفع الافتراضية (نقداً، شيك، تحويل بنكي).",
          "اضغط على تأكيد."
        ]
      },
      { type: 'heading', text: "إدخال عملية شراء" },
      {
        type: 'steps', items: [
          "تاريخ الشراء: تاريخ الإيصال أو التسليم.",
          "المورد: اختر من القائمة المنسدلة.",
          "المبلغ (درهم): المبلغ الإجمالي للفاتورة مع احتساب الرسوم.",
          "طريقة الدفع: تتكيف تلقائياً مع ملف المورد (يمكن تعديلها).",
          "رقم الفاتورة / الوصل: للمتابعة الحسابية.",
          "ملاحظة / تفاصيل: حدد المحتوى (مثال: \"لحم مفروم 5 كجم\").",
          "اضغط على تأكيد."
        ]
      },
      { type: 'alert', variant: 'tip', text: "يعرض أسفل الصفحة شريط مجاميع شبيه بـ Excel يحتوي على المجموع الدقيق لجميع مصاريف الموردين خلال الشهر." }
    ]
  },
  {
    id: 'expenses',
    icon: Receipt,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/20',
    activeBg: 'bg-purple-50/80 dark:bg-slate-800',
    activeBorder: 'border-purple-200 dark:border-slate-700/60',
    title: "المالية والتكاليف الثابتة",
    subtitle: "الإيجار، الفواتير، ومتابعة سجل المعاملات",
    content: [
      { type: 'paragraph', text: "يدير هذا القسم تكاليف الهيكلة (الإيجار، الماء، الكهرباء) والسجل الكامل لرقم المعاملات المصرح به." },
      { type: 'heading', text: "علامة التبويب 1 — التكاليف والمصاريف الثابتة" },
      {
        type: 'steps', items: [
          "اسم المصروف: اسم التكلفة (مثال: \"إيجار المحل لشهر يونيو\").",
          "المبلغ (درهم) والفئة: تكلفة ثابتة (إيجار، تأمين) أو تكلفة متغيرة.",
          "تاريخ الدفع: التاريخ الفعلي لتسديد المبلغ.",
          "اضغط على تأكيد لتسجيل المصروف في السجل الشهري."
        ]
      },
      { type: 'heading', text: "علامة التبويب 2 — متابعة سجل رقم المعاملات" },
      { type: 'paragraph', text: "قائمة يومية بجميع تصريحات المبيعات. يمكنك تعديل مبلغ خاطئ أو حذف تصريح مكرر عبر أيقونات التعديل ✏️ والحذف 🗑️ في نهاية السطر." }
    ]
  },
  {
    id: 'planning',
    icon: CalendarDays,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/20',
    activeBg: 'bg-cyan-50/80 dark:bg-slate-800',
    activeBorder: 'border-cyan-200 dark:border-slate-700/60',
    title: "جدول الحضور والموارد البشرية",
    subtitle: "الموظفون، الجدول الأسبوعي، والعطل",
    content: [
      { type: 'paragraph', text: "هذا القسم يعوض ملف العمل PLANNING21.xlsx. ويحتوي على علامتي تبويب: جدول الحضور وإدارة الموظفين." },
      { type: 'heading', text: "بطاقة موظف (إدارة الموظفين)" },
      {
        type: 'list', items: [
          "رقم التسجيل: رقم تعريفي فريد لكل موظف.",
          "قسم الخدمة: الصندوق، البار، الخدمة، المطبخ، الكريب (Creperie)، وجبة الإفطار (PDJ)، المساعد (Commis).",
          "الاسم الكامل والمنصب (مثال: \"نادل\").",
          "نوع الدفع — شهري (راتب ثابت) أو يومي (يحتسب بناءً على عدد أيام العمل الفعلي).",
          "الراتب الصافي (درهم): الراتب الشهري الصافي الأساسي.",
          "التسعيرة اليومية: قيمة يوم العمل (في حالة الدفع اليومي)."
        ]
      },
      { type: 'heading', text: "جدول الحضور — معاني الفترات (Shifts)" },
      {
        type: 'shifts', items: [
          { code: '***', label: 'Repos (REST)', desc: 'يوم راحة غير عملي' },
          { code: '07H00', label: 'Shift Matin', desc: 'فترة عمل صباحية' },
          { code: '11H00', label: 'Shift Midi', desc: 'فترة عمل منتصف النهار' },
          { code: '15H00', label: 'Shift Après-midi', desc: 'فترة عمل بعد الظهر' },
          { code: '15H00-FS', label: 'Fin de Service', desc: 'نهاية الخدمة' },
          { code: 'SOIR', label: 'Shift Soirée', desc: 'فترة عمل مسائية' },
          { code: 'CPR', label: 'Congé Payé', desc: 'عطلة سنوية مدفوعة الأجر' },
          { code: 'RCP', label: 'Récupération', desc: 'يوم استرجاع مستحق' },
          { code: 'CNG', label: 'Congé', desc: 'غياب غير مدفوع الأجر' },
        ]
      },
      { type: 'heading', text: "تعديل فترة العمل" },
      { type: 'paragraph', text: "اضغط على الخلية المقابلة ليوم عمل الموظف واختر الفترة الجديدة. يتم الحفظ تلقائياً وفوراً." },
      { type: 'alert', variant: 'info', text: "يسمح عداد RCP في نهاية السطر بمتابعة وتحديث رصيد أيام الاسترجاع المتراكمة للموظف. قم بتعديل القيمة مباشرة ليتم حفظها." }
    ]
  },
  {
    id: 'salaries',
    icon: Banknote,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-200 dark:border-yellow-500/20',
    activeBg: 'bg-yellow-50/80 dark:bg-slate-800',
    activeBorder: 'border-yellow-200 dark:border-slate-700/60',
    title: "كتلة الأجور والرواتب",
    subtitle: "حساب الرواتب، التسبيقات، التقييد المحاسبي، والتصدير",
    content: [
      { type: 'paragraph', text: "هذا القسم يعوض ملف العمل MASSE SALAIRE.xlsx. حيث يستخرج البيانات الفعلية للحضور لحساب الرواتب بشكل آلي." },
      { type: 'heading', text: "خطوات حساب الرواتب" },
      {
        type: 'steps', items: [
          "اضغط على الزر الأخضر \"توليد وحساب الرواتب\".",
          "يقوم النظام بفحص جدول الحضور للشهر ويحدد أيام العمل الفعلية.",
          "تظهر النتائج في الجدول مع التفاصيل الخاصة بكل موظف."
        ]
      },
      { type: 'heading', text: "التسبيقات على الراتب" },
      {
        type: 'steps', items: [
          "أدخل مبلغ التسبيق في عمود التسبيقات (بالدرهم).",
          "اضغط على زر التأكيد ✔️ على يمين السطر.",
          "يتم إعادة حساب الصافي المطلوب دفعه تلقائياً."
        ]
      },
      { type: 'formula', text: 'الصافي للتدفيع = الراتب المحسوب (النسبي) − التسبيقات' },
      { type: 'heading', text: "الإغلاق والتقييد المحاسبي" },
      {
        type: 'steps', items: [
          "اضغط على \"توليد مصروف الرواتب\".",
          "يتم إنشاء تكلفة إجمالية تلقائياً باسم \"كتلة أجور [الشهر]\".",
          "تظهر هذه التكلفة فوراً في لوحة التحكم المالية."
        ]
      },
      { type: 'heading', text: "التصدير والطباعة" },
      {
        type: 'list', items: [
          "تصدير CSV: ملف متوافق مع Excel يحتوي على تفاصيل الرواتب.",
          "طباعة: نسخة قابلة للطباعة بتنسيق نظيف للطباعة الورقية أو PDF."
        ]
      }
    ]
  },
  {
    id: 'users',
    icon: Users,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    activeBg: 'bg-amber-50/80 dark:bg-slate-800',
    activeBorder: 'border-amber-200 dark:border-slate-700/60',
    title: "إدارة المستخدمين",
    subtitle: "مراقبة الولوج، الأدوار والأمان",
    content: [
      { type: 'paragraph', text: "يسمح هذا القسم للمديرين بإنشاء، تعديل، تعطيل أو حذف حسابات الولوج إلى تطبيق Eco-Park." },
      { type: 'heading', text: "مستويات الولوج والأدوار" },
      {
        type: 'list', items: [
          "مدير (Admin / Gérant): صلاحية كاملة للوصول لجميع أقسام التطبيق.",
          "موظف (Staff): صلاحية مقيدة برؤية جدوله الأسبوعي فقط بصيغة القراءة. يختفي شريط التنقل الجانبي."
        ]
      },
      { type: 'heading', text: "إنشاء حساب مستخدم" },
      {
        type: 'steps', items: [
          "اضغط على مستخدم جديد.",
          "اختر الدور (مدير أو موظف).",
          "إذا كان الدور المختار هو موظف، اختر إلزامياً الموظف المرتبط به من القائمة المنسدلة (سيتم جلب الاسم والقسم وتثبيتهما تلقائياً لضمان تطابق البيانات).",
          "أدخل البريد الإلكتروني.",
          "حدد كلمة المرور (4 أحرف كحد أدنى).",
          "اضغط على تأكيد لإنشاء الحساب."
        ]
      },
      { type: 'heading', text: "عمليات الإدارة" },
      {
        type: 'list', items: [
          "تعديل (✏️): تغيير الاسم، البريد الإلكتروني، الدور أو القسم.",
          "إعادة تعيين كلمة المرور (🔑): تعيين كلمة مرور جديدة للمستخدم في حالة النسيان.",
          "تفعيل / تعطيل (🔒/🔓): الحساب المعطل لا يمكنه تسجيل الدخول. لا يمكن للمدير تعطيل حسابه الشخصي.",
          "حذف (🗑️): حذف الحساب نهائياً. لا يمكن للمدير حذف حسابه الخاص أو حذف آخر مدير نشط."
        ]
      },
      { type: 'alert', variant: 'important', text: "أمان: لتفادي انغلاق النظام، يفرض السيرفر قيوداً صارمة تمنع حذف الحساب الذاتي وحذف آخر مدير." }
    ]
  }
]

// ─── Sub-components (all theme-adaptive & RTL-ready) ─────────────────────────

function AlertBox({ variant, text, lang }) {
  const map = {
    important: {
      icon: AlertCircle,
      cls: 'border-amber-400/50 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300',
      label: lang === 'AR' ? 'هام' : 'Important'
    },
    warning: {
      icon: AlertTriangle,
      cls: 'border-red-400/50 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300',
      label: lang === 'AR' ? 'تنبيه' : 'Attention'
    },
    tip: {
      icon: Lightbulb,
      cls: 'border-emerald-400/50 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      label: lang === 'AR' ? 'نصيحة' : 'Astuce'
    },
    info: {
      icon: Info,
      cls: 'border-blue-400/50 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300',
      label: lang === 'AR' ? 'معلومات' : 'Info'
    },
  }
  const { icon: Icon, cls, label } = map[variant] || map.info
  return (
    <div className={cn('flex gap-3 rounded-lg border px-4 py-3.5 my-3', cls)}>
      <Icon size={18} className="mt-0.5 shrink-0 opacity-70" />
      <div>
        <span className="font-bold text-sm uppercase tracking-wide opacity-60 me-2">{label} —</span>
        <span className="text-base leading-relaxed">{text}</span>
      </div>
    </div>
  )
}

function FormulaBox({ text }) {
  return (
    <div className="my-4 rounded-xl border border-slate-300 dark:border-slate-650 bg-slate-100 dark:bg-slate-800/60 px-5 py-4 font-mono text-base text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
      <Hash size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
      <span>{text}</span>
    </div>
  )
}

function StepsList({ items, lang }) {
  return (
    <ol className="space-y-3 my-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-base text-slate-700 dark:text-slate-300">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold border border-emerald-300 dark:border-emerald-500/30 mt-0.5">
            {i + 1}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function BulletList({ items, lang }) {
  const ArrowIcon = lang === 'AR' ? ArrowLeft : ArrowRight;
  return (
    <ul className="space-y-2.5 my-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <ArrowIcon size={15} className="mt-1 shrink-0 text-slate-400 dark:text-slate-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function KPIGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
      {items.map((kpi, i) => (
        <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40 px-4 py-3.5">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{kpi.label}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{kpi.desc}</p>
        </div>
      ))}
    </div>
  )
}

function ShiftTable({ items, lang }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/50 my-4">
      <table className="w-full text-base">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60">
            <th className="text-left rtl:text-right px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{lang === 'AR' ? 'الرمز' : 'Code'}</th>
            <th className="text-left rtl:text-right px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{lang === 'AR' ? 'الفترة' : 'Désignation'}</th>
            <th className="text-left rtl:text-right px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{lang === 'AR' ? 'ملاحظة' : 'Remarque'}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3">
                <code className="rounded-md bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 text-sm font-mono text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-600/30">
                  {s.code}
                </code>
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{s.label}</td>
              <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-sm italic">{s.desc || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionContent({ content, lang }) {
  return (
    <div>
      {content.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return <p key={i} className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{block.text}</p>
          case 'heading':
            return (
              <h4 key={i} className="text-base font-bold text-slate-800 dark:text-white mt-6 mb-3 flex items-center gap-2">
                <span className="inline-block h-px flex-1 bg-slate-200 dark:bg-slate-700/60" />
                <span className="shrink-0">{block.text}</span>
                <span className="inline-block h-px flex-1 bg-slate-200 dark:bg-slate-700/60" />
              </h4>
            )
          case 'list': return <BulletList key={i} items={block.items} lang={lang} />
          case 'steps': return <StepsList key={i} items={block.items} lang={lang} />
          case 'alert': return <AlertBox key={i} variant={block.variant} text={block.text} lang={lang} />
          case 'formula': return <FormulaBox key={i} text={block.text} />
          case 'kpis': return <KPIGrid key={i} items={block.items} />
          case 'shifts': return <ShiftTable key={i} items={block.items} lang={lang} />
          default: return null
        }
      })}
    </div>
  )
}

// ─── Main Documentation Page ─────────────────────────────────────────────────
export default function Documentation() {
  const [lang, setLang] = useState('FR')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [expandedMobile, setExpandedMobile] = useState(null)
  const [search, setSearch] = useState('')

  const currentDocs = lang === 'FR' ? DOCS_FR : DOCS_AR

  const filtered = currentDocs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.subtitle.toLowerCase().includes(search.toLowerCase())
  )

  const activeDoc = currentDocs.find(s => s.id === activeSection)

  return (
    <div
      dir={lang === 'AR' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200"
    >
      {/* ── Header ── */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 transition-colors duration-200">
        <div className="min-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center shadow-sm">
              <BookOpen size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {lang === 'AR' ? "مركز التوثيق" : "Centre de Documentation"}
                </h1>
                <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  <Lock size={9} />
                  {lang === 'AR' ? "مشرف" : "Admin"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'AR' ? "دليل الاستخدام الكامل — نظام إدارة إيكو بارك v1.0" : "Manuel d'utilisation complet — Eco-Park Management System v1.0"}
              </p>
            </div>
          </div>

          {/* Language Switcher + Search */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Language switch */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <button
                onClick={() => { setLang('FR'); if (expandedMobile) setExpandedMobile(null); }}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  lang === 'FR'
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                Français
              </button>
              <button
                onClick={() => { setLang('AR'); if (expandedMobile) setExpandedMobile(null); }}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  lang === 'AR'
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                العربية
              </button>
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-60">
              <Search size={14} className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500", lang === 'AR' ? 'right-3' : 'left-3')} />
              <input
                type="text"
                placeholder={lang === 'AR' ? "بحث عن دليل..." : "Rechercher..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 py-1.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-emerald-400 dark:focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-300 dark:focus:ring-emerald-500/20 transition-all",
                  lang === 'AR' ? 'pr-9 pl-4' : 'pl-9 pr-4'
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-w-7xl mx-auto w-full px-6 py-6 gap-6">

        {/* ── Left Sidebar TOC ── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-1 self-start sticky top-24">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2">
            {lang === 'AR' ? "الأقسام" : "Modules"}
          </p>
          {filtered.map(section => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-left rtl:text-right transition-all duration-200 group border',
                  isActive
                    ? `${section.activeBg} ${section.activeBorder} shadow-sm`
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border-transparent'
                )}
              >
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border', section.bg, section.border)}>
                  <Icon size={17} className={section.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-sm font-semibold truncate transition-colors',
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                  )}>
                    {section.title}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{section.subtitle}</p>
                </div>
                {isActive && (
                  lang === 'AR'
                    ? <ChevronLeft size={14} className="text-emerald-500 shrink-0" />
                    : <ChevronRight size={14} className="text-emerald-500 shrink-0" />
                )}
              </button>
            )
          })}

          {/* Footer credit */}
          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={13} className="text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {lang === 'AR' ? "مستند" : "Document"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
              {lang === 'AR' ? (
                <>
                  تمت الصياغة بواسطة <span className="text-slate-600 dark:text-slate-400">G2G Tech</span> لصالح إيكو بارك<br />
                  الإصدار 1.0.0 — الإنتاج
                </>
              ) : (
                <>
                  Rédigé par <span className="text-slate-600 dark:text-slate-400">G2G Tech</span> pour Eco-Park<br />
                  Version 1.0.0 — Production
                </>
              )}
            </p>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0">

          {/* Desktop: single section view */}
          <div className="hidden lg:block">
            {activeDoc && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm transition-colors duration-200">
                {/* Section header */}
                <div className={cn('px-6 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4', activeDoc.bg)}>
                  <div className={cn('h-14 w-14 rounded-xl flex items-center justify-center border shadow-sm', activeDoc.bg, activeDoc.border)}>
                    <activeDoc.icon size={26} className={activeDoc.color} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{activeDoc.title}</h2>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-0.5">{activeDoc.subtitle}</p>
                  </div>
                </div>
                {/* Section body */}
                <div className="px-7 py-7">
                  <SectionContent content={activeDoc.content} lang={lang} />
                </div>
              </div>
            )}
          </div>

          {/* Mobile: accordion view */}
          <div className="lg:hidden space-y-3">
            {filtered.map(section => {
              const Icon = section.icon
              const isOpen = expandedMobile === section.id
              return (
                <div key={section.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setExpandedMobile(isOpen ? null : section.id)}
                    className="w-full flex items-center gap-3 px-4 py-4"
                  >
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border', section.bg, section.border)}>
                      <Icon size={16} className={section.color} />
                    </div>
                    <div className="flex-1 text-left rtl:text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{section.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{section.subtitle}</p>
                    </div>
                    {isOpen
                      ? <ChevronDown size={16} className="text-slate-400" />
                      : (lang === 'AR' ? <ChevronLeft size={16} className="text-slate-300 dark:text-slate-500" /> : <ChevronRight size={16} className="text-slate-300 dark:text-slate-500" />)
                    }
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <SectionContent content={section.content} lang={lang} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
                <Search size={24} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                {lang === 'AR' ? `لا توجد نتائج لـ "${search}"` : `Aucun résultat pour "${search}"`}
              </p>
              <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">
                {lang === 'AR' ? "حاول البحث عن مصطلح آخر" : "Essayez un autre terme de recherche"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
