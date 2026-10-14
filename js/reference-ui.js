/**
 * Reference & Cheat-Sheet UI Controller
 * State-aware conversion tables, standard multipliers, and revenue glossary
 */

export class ReferenceUI {
  constructor(converter, storage, i18nManager) {
    this.converter = converter;
    this.storage = storage;
    this.i18n = i18nManager;
  }

  init() {
    this.render();
  }

  render() {
    this.renderFormulas();
    this.renderMultipliersTable();
    this.renderGlossary();
  }

  renderFormulas() {
    const container = document.getElementById('ref-formulas-container');
    if (!container) return;

    const prefs = this.storage.getPrefs();
    const region = this.converter.getRegion(prefs.regionId);
    const lang = prefs.lang || 'en';

    let items = [];

    if (region.id === 'punjab' || region.id === 'haryana') {
      items = [
        { title: "1 Acre / Killa (ਏਕੜ / ਕਿੱਲਾ)", formula: "8 Kanal = 160 Marla = 43,560 sq ft (4,840 Gaj)" },
        { title: "1 Kanal (ਕਨਾਲ / कनाल)", formula: "20 Marla = 605 Gaj = 5,445 sq ft" },
        { title: "1 Marla (ਮਰਲਾ / मरला)", formula: "9 Sarsahi = 30.25 Gaj = 272.25 sq ft" },
        { title: "1 Sarsahi (ਸਰਸਾਹੀ)", formula: "1 Karam × 1 Karam (5.5 ft × 5.5 ft) = 30.25 sq ft" },
        { title: "1 Murabba (ਮੁਰੱਬਾ)", formula: "25 Killas / Acres = 1,089,000 sq ft" },
        { title: "1 Gaj / Sq Yard (ਗਜ਼)", formula: "9 sq ft = 0.836 sq m" }
      ];
    } else if (region.id === 'up') {
      items = [
        { title: "1 Pucca Bigha (पक्का बीघा)", formula: "20 Biswa = 3,025 Gaj = 27,225 sq ft = 2,529.28 sq m" },
        { title: "1 Pucca Biswa (पक्का बिस्वा)", formula: "20 Biswansi = 151.25 Gaj = 1,361.25 sq ft" },
        { title: "1 Biswansi (बिस्वांसी)", formula: "20 Kachwansi = 68.0625 sq ft" },
        { title: "1 Kachha Bigha (कच्चा बीघा)", formula: "1/3 of Pucca Bigha = 1,008.33 Gaj = 9,075 sq ft" },
        { title: "1 Acre (एकड़)", formula: "1.6 Pucca Bigha = 4.8 Kachha Bigha = 43,560 sq ft" },
        { title: "1 Gaj (वर्ग गज़)", formula: "9 sq ft = 3 ft × 3 ft" }
      ];
    } else if (region.id === 'rajasthan') {
      items = [
        { title: "1 Pucca Bigha (पक्का बीघा)", formula: "165 ft × 165 ft = 3,025 Gaj = 27,225 sq ft" },
        { title: "1 Biswa (बिस्वा)", formula: "1/20 Bigha = 151.25 Gaj = 1,361.25 sq ft" },
        { title: "1 Kachha Bigha (कच्चा बीघा)", formula: "132 ft × 132 ft = 1,936 Gaj = 17,424 sq ft (0.40 Acre)" },
        { title: "1 Acre (एकड़)", formula: "1.6 Pucca Bigha = 2.5 Kachha Bigha = 43,560 sq ft" }
      ];
    } else if (region.id === 'bihar') {
      items = [
        { title: "1 Bigha (बीघा)", formula: "20 Kattha = 3,025 Gaj = 27,225 sq ft" },
        { title: "1 Kattha (कट्ठा)", formula: "20 Dhur = 151.25 Gaj = 1,361.25 sq ft" },
        { title: "1 Dhur (धूर)", formula: "20 Dhurki = 68.0625 sq ft = 7.56 Gaj" },
        { title: "1 Acre (एकड़)", formula: "1.6 Bigha = 32 Kattha = 43,560 sq ft" }
      ];
    } else if (region.id === 'gujarat') {
      items = [
        { title: "1 Vigha / Bigha (વીઘા)", formula: "16 Guntha = 1,936 Gaj = 17,424 sq ft = 1,618.74 sq m" },
        { title: "1 Guntha (ગુંઠા)", formula: "121 Gaj (33 ft × 33 ft) = 1,089 sq ft" },
        { title: "1 Vassa (વસા)", formula: "1/20 Vigha = 871.2 sq ft" },
        { title: "1 Acre (એਕਰ)", formula: "2.5 Vigha = 40 Guntha = 43,560 sq ft" }
      ];
    } else if (region.id === 'maharashtra') {
      items = [
        { title: "1 Guntha (गुंठा)", formula: "121 Gaj (33 ft × 33 ft) = 1,089 sq ft = 101.17 sq m" },
        { title: "1 Aana (आना)", formula: "2.5 Guntha = 2,722.5 sq ft" },
        { title: "1 Acre (एकड़)", formula: "40 Guntha = 16 Aana = 43,560 sq ft" }
      ];
    } else if (region.id === 'south_india') {
      items = [
        { title: "1 Cent (சென்ட் / సెంట్)", formula: "1/100 Acre = 435.6 sq ft = 48.4 Gaj = 40.468 sq m" },
        { title: "1 Ground (கிரவுண்ட்)", formula: "2,400 sq ft = 266.67 Gaj = 222.96 sq m (Urban TN)" },
        { title: "1 Ankanam (అంకణం)", formula: "72 sq ft = 8 Gaj = 6.69 sq m (AP / Rayalaseema)" },
        { title: "1 Guntha (గుంట / ಗುಂಟೆ)", formula: "1,089 sq ft = 121 Gaj (KA / Telangana)" }
      ];
    } else {
      items = [
        { title: "1 Hill Bigha (पहाड़ी बीघा)", formula: "20 Biswa = 1,008.33 Gaj = 9,075 sq ft = 843.09 sq m" },
        { title: "1 Biswa (बिस्वा)", formula: "20 Biswansi = 453.75 sq ft = 50.42 Gaj" },
        { title: "1 Acre (एकड़)", formula: "4.8 Hill Bigha = 43,560 sq ft" }
      ];
    }

    container.innerHTML = items.map(item => `
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 8px;">
        <div style="font-size: var(--text-sm); font-weight: 700; color: var(--primary);">${item.title}</div>
        <div style="font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; font-weight: 600;">${item.formula}</div>
      </div>
    `).join('');
  }

  renderMultipliersTable() {
    const tableBody = document.getElementById('ref-multipliers-body');
    if (!tableBody) return;

    const prefs = this.storage.getPrefs();
    const region = this.converter.getRegion(prefs.regionId);
    const { all } = this.converter.getUnitsForRegion(region.id, prefs.variant);
    const primaryRegional = all.find(u => u.category === 'regional') || all[1];

    const values = [1, 2, 5, 10, 20, 50];

    tableBody.innerHTML = values.map(val => {
      const sqft = val * primaryRegional.sqft;
      const gaj = sqft / 9.0;
      const acre = sqft / 43560.0;
      const sqm = sqft / 10.7639104;

      return `
        <tr>
          <td><strong>${val} ${primaryRegional.symbol}</strong></td>
          <td>${this.converter.formatNumber(sqft, 2)} sq ft</td>
          <td>${this.converter.formatNumber(gaj, 2)} Gaj</td>
          <td>${this.converter.formatNumber(acre, 4)} Acre</td>
          <td>${this.converter.formatNumber(sqm, 2)} m²</td>
        </tr>
      `;
    }).join('');
  }

  renderGlossary() {
    const container = document.getElementById('ref-glossary-container');
    if (!container) return;

    const terms = [
      {
        term: "Patwari (पटवारी / ਪਟਵਾਰੀ)",
        desc: "The primary village revenue official in Northern India responsible for surveying land holdings, maintaining Jamabandi records, and executing mutations."
      },
      {
        term: "Jamabandi / ROR (जमाबंदी / ਜਮ੍ਹਾਂਬੰਦੀ)",
        desc: "The statutory Record of Rights (ROR) of a village, specifying land ownership shares, field numbers (Khasra), tenancy, and land cultivation."
      },
      {
        term: "Khasra (खसरा / ਖਸਰਾ)",
        desc: "The unique survey or plot number assigned to an agricultural parcel on the village settlement cadastre map (Shajra)."
      },
      {
        term: "Khatauni (खतौनी / ਖਤੌਨੀ)",
        desc: "A register containing the account of each landholder in a village showing total land area owned across various khasra numbers."
      },
      {
        term: "Karam / Gatha (करम / ਕਰਮ / गट्ठा)",
        desc: "A traditional wooden measurement rod used by patwaris. In Punjab & Haryana, 1 Karam is standard 66 inches (5.5 ft); in UP, 1 Gatha is 99 inches (8.25 ft)."
      },
      {
        term: "Jarib (जरीब / ਜਰੀਬ)",
        desc: "A revenue surveyor's chain containing 100 links. In the Gunter system, 1 Jarib = 66 feet; in the Shahjahani system (UP), 1 Jarib = 165 feet (55 yards)."
      },
      {
        term: "Inteqal / Mutation (दाखिल ख़ारिज / ਇੰਤਕਾਲ)",
        desc: "The formal administrative process of updating revenue records to transfer ownership rights following a sale, gift, or inheritance."
      },
      {
        term: "Girdawari (गिरदावरी / ਗਿਰਦਾਵਰੀ)",
        desc: "Bi-annual field crop harvest inspection conducted by the patwari to record the crops sown and tenant possession on each khasra."
      }
    ];

    container.innerHTML = terms.map(t => `
      <div class="glossary-card">
        <div class="glossary-term">${t.term}</div>
        <div class="glossary-desc">${t.desc}</div>
      </div>
    `).join('');
  }
}
