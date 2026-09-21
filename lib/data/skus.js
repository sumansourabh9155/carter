// RAW INPUTS ONLY. CM1/CM2/CM3 are NEVER stored — the margin engine derives them.
//
// Fields are tagged by source:
//   [Shopify]  fetched automatically — read-only in the app
//   [Merchant] the data Shopify can't give us — collected on /data-collection.
//              These power true margin AND the forecasting/prediction models.
//
//   units, revenue, onHand ........ [Shopify]
//   manufacturingCost (per unit) .. [Merchant] core COGS; costSource flags real vs estimated
//   deliveryCost (per unit) ....... [Merchant] true fulfilment cost (not what's charged)
//   packagingCost (per unit) ...... [Merchant] optional, adds to landed cost
//   dutiesPct ..................... [Merchant] optional import duty %
//   fees, returns, adSpend ........ [Shopify / ads] totals
//   overheadAlloc ................. allocated fixed overhead
//   leadTimeDays, moq, safetyStockDays ... [Merchant] supply/reorder model
//   supplier, paymentTerms, depositPct ... [Merchant] cash-flow model
//   launchDate, seasonality, isSubscription ... [Merchant] demand model
//   targetMarginPct, priceFloor ... [Merchant] pricing optimization
//   prev { units, revenue, fees, returns, adSpend } ... [Shopify / ads] the SAME
//              raw inputs for the PRIOR 30-day window. Only raw inputs are
//              stored — prior CM1/CM2/CM-ROAS are re-derived by the very same
//              margin engine (lib/compute/margin.js), so a delta can never
//              disagree with the current-period number it is compared against.
//              Ad spend moves on its own budget cycle rather than tracking
//              demand, which is what makes the CM-ROAS delta informative.
//
// null = not yet collected (drives the data-completeness flow).

export const SKUS = [
  {
    id: "p1", name: "Performance Leggings — Black", sku: "CA-LEG-BLK", category: "Bottoms", image: "🩱",
    units: 978, revenue: 42180, onHand: 1200,
    manufacturingCost: 12.94, costSource: "real", deliveryCost: 3.54, packagingCost: null, dutiesPct: null,
    fees: 1225, returns: 1266, adSpend: 6327, overheadAlloc: 4218,
    leadTimeDays: 30, moq: 500, safetyStockDays: 14,
    supplier: "Hangzhou Apparel Co.", paymentTerms: "Net 30", depositPct: 30,
    launchDate: "2024-08-15", seasonality: "None", isSubscription: false,
    targetMarginPct: 55, priceFloor: 32,
    trendPct: 3.2, spark: [21, 22, 20, 23, 24, 23, 25],
    prev: { units: 948, revenue: 40872, fees: 1187, returns: 1227, adSpend: 7632 },
  },
  {
    id: "p2", name: "Cloud 7 Sports Bra", sku: "CA-BRA-CL7", category: "Tops", image: "👙",
    units: 713, revenue: 27840, onHand: 380,
    manufacturingCost: 9.76, costSource: "real", deliveryCost: 3.13, packagingCost: null, dutiesPct: null,
    fees: 808, returns: 835, adSpend: 4176, overheadAlloc: 2784,
    leadTimeDays: 35, moq: 300, safetyStockDays: 14,
    supplier: "Hangzhou Apparel Co.", paymentTerms: "Net 30", depositPct: 30,
    launchDate: "2024-09-01", seasonality: "None", isSubscription: false,
    targetMarginPct: 60, priceFloor: 28,
    trendPct: 4.1, spark: [14, 15, 15, 16, 17, 17, 18],
    prev: { units: 685, revenue: 26744, fees: 776, returns: 802, adSpend: 3423 },
  },
  {
    id: "p3", name: "Pro Compression Shorts", sku: "CA-SHT-CMP", category: "Bottoms", image: "🩳",
    units: 1082, revenue: 30960, onHand: 1500,
    manufacturingCost: 10.30, costSource: "real", deliveryCost: 2.43, packagingCost: null, dutiesPct: null,
    fees: 898, returns: 929, adSpend: 4644, overheadAlloc: 3096,
    leadTimeDays: 28, moq: 600, safetyStockDays: 10,
    supplier: "Shenzhen Active", paymentTerms: "Net 60", depositPct: 25,
    launchDate: "2024-06-10", seasonality: "Summer", isSubscription: false,
    targetMarginPct: 50, priceFloor: 22,
    trendPct: -0.6, spark: [16, 16, 15, 16, 15, 15, 15],
    prev: { units: 1089, revenue: 31147, fees: 903, returns: 935, adSpend: 4723 },
  },
  {
    id: "p4", name: "Thermal Running Jacket", sku: "CA-JKT-THM", category: "Outerwear", image: "🧥",
    units: 240, revenue: 21600, onHand: 90,
    manufacturingCost: 40.50, costSource: "real", deliveryCost: 9.0, packagingCost: null, dutiesPct: null,
    fees: 627, returns: 648, adSpend: 3240, overheadAlloc: 2160,
    leadTimeDays: 45, moq: 200, safetyStockDays: 21,
    supplier: "Shenzhen Active", paymentTerms: "Net 60", depositPct: 25,
    launchDate: "2024-10-01", seasonality: "Winter", isSubscription: false,
    targetMarginPct: 45, priceFloor: 65,
    trendPct: -2.7, spark: [9, 9, 8, 8, 8, 7, 7],
    prev: { units: 247, revenue: 22199, fees: 644, returns: 666, adSpend: 3829 },
  },
  {
    id: "p5", name: "Yoga Flow Tank — 2-Pack", sku: "CA-TNK-YG2", category: "Tops", image: "🎽",
    // Cost is an ESTIMATE and most operational data is MISSING — the prime "complete me" SKU.
    units: 576, revenue: 17280, onHand: 540,
    manufacturingCost: 15.0, costSource: "estimated", deliveryCost: 2.7, packagingCost: null, dutiesPct: null,
    fees: 501, returns: 519, adSpend: 2592, overheadAlloc: 1728,
    leadTimeDays: null, moq: null, safetyStockDays: null,
    supplier: null, paymentTerms: null, depositPct: null,
    launchDate: null, seasonality: null, isSubscription: false,
    targetMarginPct: null, priceFloor: null,
    trendPct: -0.9, spark: [10, 10, 10, 9, 10, 9, 9],
    prev: { units: 581, revenue: 17437, fees: 506, returns: 524, adSpend: 2685 },
  },
  {
    id: "p6", name: "Recovery Slides", sku: "CA-SLD-RCV", category: "Footwear", image: "🩴",
    units: 432, revenue: 8640, onHand: 60, // low stock + high velocity → stockout risk
    manufacturingCost: 13.0, costSource: "real", deliveryCost: 2.0, packagingCost: null, dutiesPct: null,
    fees: 251, returns: 519, adSpend: 1728, overheadAlloc: 864,
    leadTimeDays: 30, moq: null, safetyStockDays: null,
    supplier: "Bali Footwear", paymentTerms: null, depositPct: null,
    launchDate: "2024-07-20", seasonality: "Summer", isSubscription: false,
    targetMarginPct: 40, priceFloor: 16,
    trendPct: -6.4, spark: [4, 3, 2, 1, 0, -1, -1],
    prev: { units: 462, revenue: 9231, fees: 268, returns: 554, adSpend: 1520 },
  },
  {
    id: "p7", name: "Seamless Leggings — Navy", sku: "CA-LEG-NVY", category: "Bottoms", image: "🩱",
    units: 640, revenue: 27520, onHand: 820,
    manufacturingCost: 13.1, costSource: "real", deliveryCost: 3.4, packagingCost: null, dutiesPct: null,
    fees: 798, returns: 1100, adSpend: 4400, overheadAlloc: 2752,
    leadTimeDays: 30, moq: 500, safetyStockDays: 14,
    supplier: "Hangzhou Apparel Co.", paymentTerms: "Net 30", depositPct: 30,
    launchDate: "2024-08-20", seasonality: "None", isSubscription: false,
    targetMarginPct: 55, priceFloor: 32,
    trendPct: 6.0, spark: [18, 19, 20, 21, 22, 23, 24],
    prev: { units: 604, revenue: 25962, fees: 753, returns: 1038, adSpend: 4805 },
  },
  {
    id: "p8", name: "Featherweight Hoodie", sku: "CA-HDY-FW", category: "Outerwear", image: "🧥",
    units: 410, revenue: 32800, onHand: 260,
    manufacturingCost: 28.0, costSource: "real", deliveryCost: 6.5, packagingCost: null, dutiesPct: null,
    fees: 951, returns: 1500, adSpend: 5200, overheadAlloc: 3280,
    leadTimeDays: 40, moq: 250, safetyStockDays: 21,
    supplier: "Shenzhen Active", paymentTerms: "Net 60", depositPct: 25,
    launchDate: "2024-09-15", seasonality: "Winter", isSubscription: false,
    targetMarginPct: 50, priceFloor: 58,
    trendPct: 9.0, spark: [12, 13, 14, 15, 16, 18, 19],
    prev: { units: 376, revenue: 30092, fees: 872, returns: 1376, adSpend: 6281 },
  },
  {
    id: "p9", name: "Everyday Joggers", sku: "CA-JOG-EVD", category: "Bottoms", image: "🩳",
    units: 920, revenue: 36800, onHand: 1400,
    manufacturingCost: 12.5, costSource: "real", deliveryCost: 3.2, packagingCost: null, dutiesPct: null,
    fees: 1067, returns: 1472, adSpend: 5500, overheadAlloc: 3680,
    leadTimeDays: 28, moq: 600, safetyStockDays: 10,
    supplier: "Shenzhen Active", paymentTerms: "Net 60", depositPct: 25,
    launchDate: "2024-05-01", seasonality: "None", isSubscription: false,
    targetMarginPct: 52, priceFloor: 28,
    trendPct: 2.0, spark: [20, 20, 21, 20, 21, 22, 22],
    prev: { units: 902, revenue: 36078, fees: 1046, returns: 1443, adSpend: 5310 },
  },
  {
    id: "p10", name: "Performance Socks — 3-Pack", sku: "CA-SOK-3PK", category: "Accessories", image: "🧦",
    units: 1500, revenue: 22500, onHand: 3000,
    manufacturingCost: 5.2, costSource: "real", deliveryCost: 1.4, packagingCost: null, dutiesPct: null,
    fees: 653, returns: 700, adSpend: 2700, overheadAlloc: 2250,
    leadTimeDays: 25, moq: 1000, safetyStockDays: 7,
    supplier: "Bali Footwear", paymentTerms: "Net 30", depositPct: 20,
    launchDate: "2024-06-01", seasonality: "None", isSubscription: true,
    targetMarginPct: 45, priceFloor: 12,
    trendPct: 4.0, spark: [13, 13, 14, 14, 15, 15, 16],
    prev: { units: 1442, revenue: 21635, fees: 628, returns: 673, adSpend: 3208 },
  },
  {
    id: "p11", name: "Quilted Training Vest", sku: "CA-VST-QLT", category: "Outerwear", image: "🦺",
    units: 180, revenue: 16200, onHand: 70,
    manufacturingCost: 38.0, costSource: "real", deliveryCost: 8.0, packagingCost: null, dutiesPct: null,
    fees: 470, returns: 900, adSpend: 2600, overheadAlloc: 1620,
    leadTimeDays: 45, moq: 200, safetyStockDays: 21,
    supplier: "Shenzhen Active", paymentTerms: "Net 60", depositPct: 25,
    launchDate: "2024-10-10", seasonality: "Winter", isSubscription: false,
    targetMarginPct: 45, priceFloor: 65,
    trendPct: -4.0, spark: [8, 8, 7, 7, 7, 6, 6],
    prev: { units: 188, revenue: 16875, fees: 490, returns: 938, adSpend: 3248 },
  },
  {
    id: "p12", name: "Grip Training Gloves", sku: "CA-GLV-GRP", category: "Accessories", image: "🧤",
    // Estimated cost + most operational data missing — drags model readiness down.
    units: 540, revenue: 13500, onHand: 900,
    manufacturingCost: 8.5, costSource: "estimated", deliveryCost: 2.0, packagingCost: null, dutiesPct: null,
    fees: 392, returns: 540, adSpend: 2000, overheadAlloc: 1350,
    leadTimeDays: null, moq: null, safetyStockDays: null,
    supplier: null, paymentTerms: null, depositPct: null,
    launchDate: null, seasonality: null, isSubscription: false,
    targetMarginPct: null, priceFloor: null,
    trendPct: -1.0, spark: [9, 9, 9, 8, 9, 8, 8],
    prev: { units: 545, revenue: 13636, fees: 396, returns: 545, adSpend: 2297 },
  },
  {
    id: "p13", name: "Hydro Flask Bottle 750ml", sku: "CA-BTL-750", category: "Accessories", image: "🥤",
    units: 760, revenue: 22800, onHand: 1100,
    manufacturingCost: 9.0, costSource: "real", deliveryCost: 3.5, packagingCost: null, dutiesPct: null,
    fees: 661, returns: 460, adSpend: 3000, overheadAlloc: 2280,
    leadTimeDays: 35, moq: 500, safetyStockDays: 14,
    supplier: "Bali Footwear", paymentTerms: "Net 30", depositPct: 20,
    launchDate: "2024-07-05", seasonality: "Summer", isSubscription: false,
    targetMarginPct: 55, priceFloor: 22,
    trendPct: 12.0, spark: [12, 13, 15, 16, 18, 20, 22],
    prev: { units: 679, revenue: 20357, fees: 590, returns: 411, adSpend: 2577 },
  },
  {
    id: "p14", name: "Studio Wrap Jacket", sku: "CA-JKT-STW", category: "Outerwear", image: "🧥",
    // High return rate erodes margin — a "hero by revenue" that's thin after returns.
    units: 150, revenue: 18000, onHand: 40,
    manufacturingCost: 55.0, costSource: "real", deliveryCost: 9.0, packagingCost: null, dutiesPct: null,
    fees: 522, returns: 1300, adSpend: 2900, overheadAlloc: 1800,
    leadTimeDays: 50, moq: 150, safetyStockDays: 28,
    supplier: "Shenzhen Active", paymentTerms: "Net 60", depositPct: 30,
    launchDate: "2024-11-01", seasonality: "Winter", isSubscription: false,
    targetMarginPct: 42, priceFloor: 90,
    trendPct: -10.0, spark: [10, 9, 8, 7, 6, 5, 4],
    prev: { units: 167, revenue: 20000, fees: 580, returns: 1444, adSpend: 2680 },
  },
  {
    id: "p15", name: "Compression Calf Sleeves", sku: "CA-CLF-CMP", category: "Accessories", image: "🦵",
    units: 430, revenue: 10750, onHand: 600,
    manufacturingCost: 7.0, costSource: "real", deliveryCost: 1.8, packagingCost: null, dutiesPct: null,
    fees: 312, returns: 320, adSpend: 1500, overheadAlloc: 1075,
    leadTimeDays: 30, moq: 500, safetyStockDays: 10,
    supplier: "Bali Footwear", paymentTerms: "Net 30", depositPct: 20,
    launchDate: "2024-06-20", seasonality: "Summer", isSubscription: false,
    targetMarginPct: 50, priceFloor: 18,
    trendPct: 3.0, spark: [9, 9, 10, 10, 10, 11, 11],
    prev: { units: 417, revenue: 10437, fees: 303, returns: 311, adSpend: 1575 },
  },
  {
    id: "p16", name: "Lightweight Running Cap", sku: "CA-CAP-RUN", category: "Accessories", image: "🧢",
    // Low stock vs velocity → stockout risk; partial operational data.
    units: 680, revenue: 13600, onHand: 200,
    manufacturingCost: 6.5, costSource: "real", deliveryCost: 1.6, packagingCost: null, dutiesPct: null,
    fees: 394, returns: 410, adSpend: 2200, overheadAlloc: 1360,
    leadTimeDays: 30, moq: null, safetyStockDays: null,
    supplier: "Bali Footwear", paymentTerms: null, depositPct: null,
    launchDate: "2024-07-15", seasonality: "Summer", isSubscription: false,
    targetMarginPct: 50, priceFloor: 14,
    trendPct: 1.0, spark: [10, 10, 10, 10, 10, 11, 10],
    prev: { units: 673, revenue: 13465, fees: 390, returns: 406, adSpend: 2085 },
  },
];

export const STORE = {
  name: "Coastal Active",
  platform: "Shopify",
  plan: "Growth",
  currency: "USD",
};
