// A prendre en compte

const { useState, useEffect, useMemo, useRef } = React;

function App() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("iPhone 8 Plus 256Go");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const chartContainer1Ref = useRef(null);
  const chartContainer2Ref = useRef(null);
  const consoleRef = useRef(null);

  useEffect(() => {
    fetch("predictions.json")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Erreur de chargement :", err));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBrand, selectedGrade]);

  const brands = useMemo(() => Array.from(new Set(data.map((d) => d.manufacturer))).sort(), [data]);
  const grades = useMemo(() => Array.from(new Set(data.map((d) => d.grade))).sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        item.product.toLowerCase().includes(search.toLowerCase()) ||
        item.idproduct.toLowerCase().includes(search.toLowerCase());
      const matchBrand = selectedBrand === "" || item.manufacturer === selectedBrand;
      const matchGrade = selectedGrade === "" || item.grade === selectedGrade;
      return matchSearch && matchBrand && matchGrade;
    });
  }, [data, search, selectedBrand, selectedGrade]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  useEffect(() => {
    if (window.MathJax && consoleRef.current) {
      window.MathJax.typesetPromise && window.MathJax.typesetPromise([consoleRef.current]);
    }
  }, [data]);

  const handleSelectProduct = (productName) => {
    setSearch(productName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // [A007] Thème & Design Moderne Highcharts
  const modernTheme = {
    colors: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'],
    chart: {
      backgroundColor: '#ffffff',
      style: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
      borderRadius: 12
    },
    title: {
      style: { color: '#0f172a', fontWeight: '700', fontSize: '15px' }
    },
    subtitle: {
      style: { color: '#64748b', fontSize: '12px' }
    },
    xAxis: {
      gridLineWidth: 1,
      gridLineColor: '#f1f5f9',
      lineColor: '#cbd5e1',
      tickColor: '#cbd5e1',
      labels: { style: { color: '#64748b', fontSize: '11px' } }
    },
    yAxis: {
      // [A008] Échelle de prix élargie et dynamique
      softMin: 0,
      maxPadding: 0.15,
      gridLineColor: '#f1f5f9',
      title: { style: { color: '#64748b', fontSize: '11px' } },
      labels: {
        style: { color: '#64748b', fontSize: '11px' },
        format: '{value} €'
      }
    },
    tooltip: {
      backgroundColor: '#0f172a',
      borderColor: '#1e293b',
      borderRadius: 8,
      style: { color: '#f8fafc', fontSize: '12px' },
      shadow: true
    },
    legend: {
      itemStyle: { color: '#334155', fontWeight: '500', fontSize: '11px' },
      itemHoverStyle: { color: '#0f172a' }
    },
    plotOptions: {
      spline: {
        marker: { enabled: true, radius: 4, symbol: 'circle' },
        lineWidth: 2.5
      },
      series: {
        animation: { duration: 600 }
      }
    }
  };

  // [A001 + A007 + A008] Graphique 1 : Hybride avec courbe lissée et échelle étendue
  useEffect(() => {
    if (!chartContainer1Ref.current || paginatedData.length === 0) return;

    const series = paginatedData.slice(0, 10).map((item) => ({
      name: `${item.product} (${item.grade})`,
      data: [
        [0, item.initial_price],
        [3, item.m3_hybrid],
        [6, item.m6_hybrid],
        [12, item.m12_hybrid],
        [24, item.m24_hybrid],
        [36, item.m36_hybrid]
      ]
    }));

    Highcharts.chart(chartContainer1Ref.current, Highcharts.merge(modernTheme, {
      chart: { type: 'spline', height: 340 },
      title: { text: 'Évolution Temporelle des Prix (Modèle Hybride/Réel)' },
      xAxis: {
        title: { text: 'Horizon (Mois)' },
        categories: ['M0 (Init)', 'M+3', 'M+6', 'M+12', 'M+24', 'M+36']
      },
      tooltip: { valueSuffix: ' €' },
      credits: { enabled: false },
      series: series
    }));
  }, [paginatedData]);

  // [A002 + A007 + A008] Graphique 2 : Comparaison Réel vs Théorie par Grade
  useEffect(() => {
    if (!chartContainer2Ref.current || paginatedData.length === 0) return;

    const series = [];
    const categories = ['M0', 'M+3', 'M+6', 'M+12', 'M+24', 'M+36'];

    paginatedData.slice(0, 15).forEach((item) => {
      const isGradeA = item.grade.trim().toUpperCase() === "A";

      series.push({
        name: `${item.product} [${item.grade}] - Hybride`,
        visible: isGradeA,
        dashStyle: 'Solid',
        data: [item.initial_price, item.m3_hybrid, item.m6_hybrid, item.m12_hybrid, item.m24_hybrid, item.m36_hybrid]
      });

      series.push({
        name: `${item.product} [${item.grade}] - Théorique Marque`,
        visible: isGradeA,
        dashStyle: 'ShortDash',
        data: [item.initial_price, item.m3_brand, item.m6_brand, item.m12_brand, item.m24_brand, item.m36_brand]
      });
    });

    Highcharts.chart(chartContainer2Ref.current, Highcharts.merge(modernTheme, {
      chart: { type: 'spline', height: 380 },
      title: { text: 'Comparaison Temporelle : Hybride vs Théorique Marque par Grade' },
      subtitle: { text: 'Affichage initial ciblé sur le Grade A' },
      xAxis: { categories: categories, title: { text: 'Horizon Temporel' } },
      tooltip: { valueSuffix: ' €', shared: true },
      credits: { enabled: false },
      series: series
    }));
  }, [paginatedData]);

  const renderDeltaBadge = (delta) => {
    if (delta === 0) return <span className="text-gray-400 font-mono text-xs">0.0%</span>;
    const isPositive = delta > 0;
    const color = isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50";
    const sign = isPositive ? "+" : "";
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${color}`}>
        {sign}{delta}%
      </span>
    );
  };

  const eqMinPrice = "$$P_{\\min} = \\max(30.00\\ \\text{€},\\, 0.15 \\times P_0)$$";
  const eqRate = "$$r = 1 - \\left(\\frac{P_{\\text{final}}}{P_{\\text{initial}}}\\right)^{\\frac{1}{\\text{années}}}$$";
  const eqProj = "$$P(M) = \\max\\left(P_{\\min},\\, P_{\\text{ancrage}} \\times (1 - r)^{\\frac{M}{12}}\\right)$$";
  const eqDelta = "$$\\Delta_{M} = \\frac{P_{\\text{hybride}}(M) - P_{\\text{marque}}(M)}{P_{\\text{marque}}(M)} \\times 100$$";

  const PaginationControls = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs">
      <div className="text-slate-500">
        Affichage de <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> à <strong>{Math.min(currentPage * itemsPerPage, filteredData.length)}</strong> sur <strong>{filteredData.length}</strong> éléments
      </div>
      <div className="flex items-center space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
        >
          &larr; Précédent
        </button>
        <span className="font-semibold text-slate-700 px-2">
          Page {currentPage} / {totalPages}
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
        >
          Suivant &rarr;
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-8">
      {/* En-tête */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord Argus &amp; Projections Long Terme (+3 à +36 Mois)</h1>
          <p className="text-sm text-slate-500">Comparaison entre Données Hybrides (Réelles + Projections) et Théorie Marque</p>
        </div>
        <div className="mt-4 md:mt-0 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200">
          Modèles filtrés : <strong>{filteredData.length}</strong> / {data.length}
        </div>
      </header>

      {/* Barre de filtres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Recherche</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Nom ou ID produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center"
                title="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Marque</label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les marques</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Grade</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLEAU 1 SECTION */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
        <div className="p-4 border-b border-slate-100">
          <div ref={chartContainer1Ref} className="w-full" />
        </div>

        <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center">
          <h2 className="font-semibold text-lg">Tableau 1 : Réel &amp; Projections Hybrides (Pondérées)</h2>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded">Prolongation des tendances réelles</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Produit</th>
                <th className="p-3">Marque</th>
                <th className="p-3">Taux Marque</th>
                <th className="p-3">Grade</th>
                <th className="p-3">P0 (Init)</th>
                <th className="p-3 bg-slate-100/60">M+3</th>
                <th className="p-3 bg-slate-100/60">M+6</th>
                <th className="p-3">M+12</th>
                <th className="p-3">M+24</th>
                <th className="p-3">M+36</th>
                <th className="p-3">P_min</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((item, idx) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-400 font-mono">{globalIndex}</td>
                    <td className="p-3 font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" onClick={() => handleSelectProduct(item.product)}>
                      {item.product}
                    </td>
                    <td className="p-3">{item.manufacturer}</td>
                    <td className="p-3 font-mono text-slate-600">{(item.brand_annual_rate * 100).toFixed(1)}%</td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">{item.grade}</span></td>
                    <td className="p-3 font-semibold">{item.initial_price} €</td>
                    <td className="p-3 bg-slate-50/60">
                      {item.m3_real !== null ? <span className="text-emerald-700 font-semibold">{item.m3_real} € (R)</span> : `${item.m3_hybrid} €`}
                    </td>
                    <td className="p-3 bg-slate-50/60">
                      {item.m6_real !== null ? <span className="text-emerald-700 font-semibold">{item.m6_real} € (R)</span> : `${item.m6_hybrid} €`}
                    </td>
                    <td className="p-3 font-medium text-slate-700">{item.m12_hybrid} €</td>
                    <td className="p-3 text-slate-600">{item.m24_hybrid} €</td>
                    <td className="p-3 text-slate-600">{item.m36_hybrid} €</td>
                    <td className="p-3 text-slate-400 font-mono">{item.p_min} €</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls />
      </section>

      {/* TABLEAU 2 SECTION */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
        <div className="p-4 border-b border-slate-100">
          <div ref={chartContainer2Ref} className="w-full" />
        </div>

        <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center">
          <h2 className="font-semibold text-lg">Tableau 2 : Modèle Théorique Marque &amp; Écarts (Δ)</h2>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded">Application stricte du taux de marque</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Produit</th>
                <th className="p-3">Taux Marque</th>
                <th className="p-3">P0 (Init)</th>
                <th className="p-3">M+3 (Δ)</th>
                <th className="p-3">M+6 (Δ)</th>
                <th className="p-3">M+12 (Δ)</th>
                <th className="p-3">M+24 (Δ)</th>
                <th className="p-3">M+36 (Δ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((item, idx) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-400 font-mono">{globalIndex}</td>
                    <td className="p-3 font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" onClick={() => handleSelectProduct(item.product)}>
                      {item.product}
                    </td>
                    <td className="p-3 text-slate-600 font-mono">{(item.brand_annual_rate * 100).toFixed(1)}%</td>
                    <td className="p-3 font-semibold">{item.initial_price} €</td>
                    <td className="p-3">{item.m3_brand} € <span className="ml-1">{renderDeltaBadge(item.delta_m3)}</span></td>
                    <td className="p-3">{item.m6_brand} € <span className="ml-1">{renderDeltaBadge(item.delta_m6)}</span></td>
                    <td className="p-3">{item.m12_brand} € <span className="ml-1">{renderDeltaBadge(item.delta_m12)}</span></td>
                    <td className="p-3">{item.m24_brand} € <span className="ml-1">{renderDeltaBadge(item.delta_m24)}</span></td>
                    <td className="p-3">{item.m36_brand} € <span className="ml-1">{renderDeltaBadge(item.delta_m36)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls />
      </section>

      {/* CONSOLE TEXTUELLE */}
      <footer ref={consoleRef} className="bg-slate-900 text-slate-200 rounded-xl p-6 font-mono text-xs shadow-lg space-y-4 border border-slate-800">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-slate-400">
          <span className="font-bold uppercase tracking-wider text-emerald-400">&gt; CONSOLE_SYNTHESE // METHODES_ET_CALCULS</span>
          <span>MathJax Engine 3.2.2</span>
        </div>

        <div className="space-y-4 text-slate-300">
          <div>
            <p className="text-emerald-400 font-bold mb-1">[1] Métriques de base &amp; Prix plancher</p>
            <p>Prix plancher défini pour chaque référence afin de garantir une valeur résiduelle minimale :</p>
            <div className="my-2 p-2 bg-slate-950 rounded border border-slate-800 overflow-x-auto">
              {eqMinPrice}
            </div>
          </div>

          <div>
            <p className="text-emerald-400 font-bold mb-1">[2] Taux de dépréciation annuel (r)</p>
            <p>Calcul du taux d'amortissement annuel composé basé sur le recul temporel réel :</p>
            <div className="my-2 p-2 bg-slate-950 rounded border border-slate-800 overflow-x-auto">
              {eqRate}
            </div>
            <p className="text-slate-400 text-[11px]">
              • r_produit : Encadré dans [0.05, 0.50] (si jours &ge; 30)<br/>
              • r_marque : Moyenne des r_produit encadrée dans [0.08, 0.45] (Default Global = 0.20)
            </p>
          </div>

          <div>
            <p className="text-emerald-400 font-bold mb-1">[3] Modèles de projection (M &in; &#123;3, 6, 12, 24, 36&#125; mois)</p>
            <p>Formule exponentielle générale d'amortissement :</p>
            <div className="my-2 p-2 bg-slate-950 rounded border border-slate-800 overflow-x-auto">
              {eqProj}
            </div>
          </div>

          <div>
            <p className="text-emerald-400 font-bold mb-1">[4] Mesure des écarts (&Delta;)</p>
            <p>Calcul de la déviation relative entre le modèle hybride (réel) et le modèle théorique marque :</p>
            <div className="my-2 p-2 bg-slate-950 rounded border border-slate-800 overflow-x-auto">
              {eqDelta}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);