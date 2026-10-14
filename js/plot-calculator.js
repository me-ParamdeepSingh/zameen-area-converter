/**
 * Plot Area Calculator & SVG Diagram Generator
 * Supports Rectangle, Triangle (Heron's), and Irregular 4-Sided Plots (Triangulation)
 */

export class PlotCalculatorUI {
  constructor(converter, storage, onAreaCalculated) {
    this.converter = converter;
    this.storage = storage;
    this.onAreaCalculated = onAreaCalculated;
    this.currentShape = 'rectangle';
    this.dimensionUnit = 'feet';
    this.lastAreaSqft = 0;
  }

  init() {
    this.bindEvents();
    this.renderInputs();
    this.recalculate();
  }

  bindEvents() {
    const shapeTabs = document.querySelectorAll('.shape-tab');
    shapeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const shape = tab.dataset.shape;
        this.setShape(shape);
      });
    });

    const dimUnitSelect = document.getElementById('dim-unit-select');
    if (dimUnitSelect) {
      dimUnitSelect.addEventListener('change', (e) => {
        this.dimensionUnit = e.target.value;
        this.recalculate();
      });
    }

    const sendPriceBtn = document.getElementById('btn-send-price');
    if (sendPriceBtn) {
      sendPriceBtn.addEventListener('click', () => {
        if (this.lastAreaSqft > 0 && typeof this.onAreaCalculated === 'function') {
          this.onAreaCalculated(this.lastAreaSqft, 'price');
        }
      });
    }

    const sendConvBtn = document.getElementById('btn-send-converter');
    if (sendConvBtn) {
      sendConvBtn.addEventListener('click', () => {
        if (this.lastAreaSqft > 0 && typeof this.onAreaCalculated === 'function') {
          this.onAreaCalculated(this.lastAreaSqft, 'converter');
        }
      });
    }
  }

  setShape(shape) {
    this.currentShape = shape;
    document.querySelectorAll('.shape-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.shape === shape);
    });
    this.renderInputs();
    this.recalculate();
  }

  renderInputs() {
    const container = document.getElementById('plot-inputs-grid');
    if (!container) return;

    if (this.currentShape === 'rectangle') {
      container.innerHTML = `
        <div class="input-field-wrapper">
          <label class="input-field-label" data-i18n="length">Length</label>
          <input type="number" step="any" id="plot-length" class="standard-input" value="60" placeholder="e.g. 60">
        </div>
        <div class="input-field-wrapper">
          <label class="input-field-label" data-i18n="width">Width</label>
          <input type="number" step="any" id="plot-width" class="standard-input" value="30" placeholder="e.g. 30">
        </div>
      `;
    } else if (this.currentShape === 'triangle') {
      container.innerHTML = `
        <div class="input-field-wrapper">
          <label class="input-field-label" data-i18n="sideA">Side A</label>
          <input type="number" step="any" id="plot-sideA" class="standard-input" value="40" placeholder="e.g. 40">
        </div>
        <div class="input-field-wrapper">
          <label class="input-field-label" data-i18n="sideB">Side B</label>
          <input type="number" step="any" id="plot-sideB" class="standard-input" value="50" placeholder="e.g. 50">
        </div>
        <div class="input-field-wrapper" style="grid-column: span 2;">
          <label class="input-field-label" data-i18n="sideC">Side C</label>
          <input type="number" step="any" id="plot-sideC" class="standard-input" value="60" placeholder="e.g. 60">
        </div>
      `;
    } else if (this.currentShape === 'irregular4') {
      container.innerHTML = `
        <div class="input-field-wrapper">
          <label class="input-field-label" data-i18n="sideA">Side A (Front)</label>
          <input type="number" step="any" id="plot-sideA" class="standard-input" value="45" placeholder="e.g. 45">
        </div>
        <div class="input-field-wrapper">
          <label class="input-field-label" data-i18n="sideB">Side B (Right)</label>
          <input type="number" step="any" id="plot-sideB" class="standard-input" value="60" placeholder="e.g. 60">
        </div>
        <div class="input-field-wrapper">
          <label class="input-field-label" data-i18n="sideC">Side C (Back)</label>
          <input type="number" step="any" id="plot-sideC" class="standard-input" value="40" placeholder="e.g. 40">
        </div>
        <div class="input-field-wrapper">
          <label class="input-field-label" data-i18n="sideD">Side D (Left)</label>
          <input type="number" step="any" id="plot-sideD" class="standard-input" value="65" placeholder="e.g. 65">
        </div>
        <div class="input-field-wrapper" style="grid-column: span 2;">
          <label class="input-field-label" data-i18n="diagonal">Diagonal (Triangulation Line)</label>
          <input type="number" step="any" id="plot-diag" class="standard-input" value="70" placeholder="e.g. 70">
        </div>
      `;
    }

    // Attach input listeners
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => this.recalculate());
    });
  }

  recalculate() {
    let areaSqft = 0;
    let errorMsg = null;

    try {
      if (this.currentShape === 'rectangle') {
        const l = parseFloat(document.getElementById('plot-length')?.value || 0);
        const w = parseFloat(document.getElementById('plot-width')?.value || 0);
        areaSqft = this.converter.calculatePlotArea({
          shape: 'rectangle',
          inputUnit: this.dimensionUnit,
          length: l,
          width: w
        });
        this.renderSVGDiagram({ shape: 'rectangle', l, w });
      } else if (this.currentShape === 'triangle') {
        const a = parseFloat(document.getElementById('plot-sideA')?.value || 0);
        const b = parseFloat(document.getElementById('plot-sideB')?.value || 0);
        const c = parseFloat(document.getElementById('plot-sideC')?.value || 0);
        areaSqft = this.converter.calculatePlotArea({
          shape: 'triangle',
          inputUnit: this.dimensionUnit,
          sideA: a,
          sideB: b,
          sideC: c
        });
        this.renderSVGDiagram({ shape: 'triangle', a, b, c });
      } else if (this.currentShape === 'irregular4') {
        const a = parseFloat(document.getElementById('plot-sideA')?.value || 0);
        const b = parseFloat(document.getElementById('plot-sideB')?.value || 0);
        const c = parseFloat(document.getElementById('plot-sideC')?.value || 0);
        const d = parseFloat(document.getElementById('plot-sideD')?.value || 0);
        const diag = parseFloat(document.getElementById('plot-diag')?.value || 0);
        areaSqft = this.converter.calculatePlotArea({
          shape: 'irregular4',
          inputUnit: this.dimensionUnit,
          sideA: a,
          sideB: b,
          sideC: c,
          sideD: d,
          diagonal: diag
        });
        this.renderSVGDiagram({ shape: 'irregular4', a, b, c, d, diag });
      }
    } catch (err) {
      errorMsg = err.message;
    }

    this.lastAreaSqft = areaSqft;
    this.displayResults(areaSqft, errorMsg);
  }

  displayResults(areaSqft, errorMsg) {
    const resultBox = document.getElementById('plot-result-display');
    const breakdowns = document.getElementById('plot-breakdown-list');
    if (!resultBox || !breakdowns) return;

    if (errorMsg) {
      resultBox.innerHTML = `<span style="color: var(--danger); font-size: var(--text-sm);">⚠️ ${errorMsg}</span>`;
      breakdowns.innerHTML = '';
      return;
    }

    if (areaSqft <= 0) {
      resultBox.innerHTML = `0 sq ft`;
      breakdowns.innerHTML = '';
      return;
    }

    const prefs = this.storage.getPrefs();
    const regionId = prefs.regionId;
    const variant = prefs.variant;

    // Convert to Gaj (Sq Yd), regional unit (Kanal or Bigha or Guntha), and Acre
    const gaj = areaSqft / 9.0;
    const acre = areaSqft / 43560.0;
    const convertedUnits = this.converter.convertAll(areaSqft, 'sqft', regionId, variant);

    resultBox.innerHTML = `
      <div style="display: flex; align-items: baseline; gap: 8px;">
        <span>${this.converter.formatNumber(areaSqft)}</span>
        <span style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">sq ft (वर्ग फ़ुट)</span>
      </div>
      <div style="font-size: var(--text-base); color: var(--primary); font-weight: 700; margin-top: 4px;">
        = ${this.converter.formatNumber(gaj)} Gaj / Sq Yd (गज़)
      </div>
    `;

    // Render regional unit badges
    const topRegional = convertedUnits.filter(u => u.category === 'regional').slice(0, 4);
    let badgesHtml = topRegional.map(u => `
      <div style="background: var(--surface); border: 1px solid var(--border); padding: 6px 10px; border-radius: var(--radius-sm); font-size: var(--text-xs);">
        <span style="color: var(--text-muted);">${u.name.en}:</span>
        <strong style="color: var(--text-primary); margin-left: 4px;">${u.formattedValue}</strong>
      </div>
    `).join('');

    badgesHtml += `
      <div style="background: var(--surface); border: 1px solid var(--border); padding: 6px 10px; border-radius: var(--radius-sm); font-size: var(--text-xs);">
        <span style="color: var(--text-muted);">Acre (एकड़):</span>
        <strong style="color: var(--text-primary); margin-left: 4px;">${this.converter.formatNumber(acre, 4)}</strong>
      </div>
    `;

    breakdowns.innerHTML = badgesHtml;
  }

  renderSVGDiagram(data) {
    const preview = document.getElementById('plot-svg-container');
    if (!preview) return;

    const unit = this.dimensionUnit === 'feet' ? 'ft' : this.dimensionUnit === 'yards' ? 'yd' : 'm';

    if (data.shape === 'rectangle') {
      const l = data.l || 60;
      const w = data.w || 30;
      preview.innerHTML = `
        <svg viewBox="0 0 300 150" class="plot-svg-diagram">
          <defs>
            <linearGradient id="rectGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4F46E5" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#059669" stop-opacity="0.2"/>
            </linearGradient>
          </defs>
          <rect x="50" y="25" width="200" height="100" rx="4" fill="url(#rectGrad)" stroke="#4F46E5" stroke-width="2.5" />
          <!-- Labels -->
          <text x="150" y="18" fill="#4F46E5" font-size="12" font-weight="700" text-anchor="middle">${l} ${unit} (Length)</text>
          <text x="150" y="140" fill="#4F46E5" font-size="11" font-weight="600" text-anchor="middle">${l} ${unit}</text>
          <text x="260" y="78" fill="#059669" font-size="12" font-weight="700" text-anchor="start">${w} ${unit}</text>
          <text x="40" y="78" fill="#059669" font-size="12" font-weight="700" text-anchor="end">${w} ${unit}</text>
          <circle cx="50" cy="25" r="4" fill="#4F46E5"/>
          <circle cx="250" cy="25" r="4" fill="#4F46E5"/>
          <circle cx="250" cy="125" r="4" fill="#4F46E5"/>
          <circle cx="50" cy="125" r="4" fill="#4F46E5"/>
        </svg>
      `;
    } else if (data.shape === 'triangle') {
      preview.innerHTML = `
        <svg viewBox="0 0 300 150" class="plot-svg-diagram">
          <polygon points="150,20 40,130 260,130" fill="rgba(79, 70, 229, 0.2)" stroke="#4F46E5" stroke-width="2.5" stroke-linejoin="round"/>
          <text x="85" y="65" fill="#4F46E5" font-size="11" font-weight="700">A: ${data.a} ${unit}</text>
          <text x="215" y="65" fill="#4F46E5" font-size="11" font-weight="700">B: ${data.b} ${unit}</text>
          <text x="150" y="145" fill="#059669" font-size="11" font-weight="700" text-anchor="middle">C: ${data.c} ${unit}</text>
          <circle cx="150" cy="20" r="4" fill="#4F46E5"/>
          <circle cx="40" cy="130" r="4" fill="#4F46E5"/>
          <circle cx="260" cy="130" r="4" fill="#4F46E5"/>
        </svg>
      `;
    } else if (data.shape === 'irregular4') {
      preview.innerHTML = `
        <svg viewBox="0 0 300 150" class="plot-svg-diagram">
          <!-- Polygon -->
          <polygon points="50,45 220,20 255,125 70,135" fill="rgba(79, 70, 229, 0.18)" stroke="#4F46E5" stroke-width="2" />
          <!-- Diagonal -->
          <line x1="50" y1="45" x2="255" y2="125" stroke="#D97706" stroke-width="2" stroke-dasharray="4,4" />
          <!-- Labels -->
          <text x="135" y="24" fill="#4F46E5" font-size="10" font-weight="700">A: ${data.a} ${unit}</text>
          <text x="245" y="70" fill="#4F46E5" font-size="10" font-weight="700">B: ${data.b} ${unit}</text>
          <text x="160" y="145" fill="#4F46E5" font-size="10" font-weight="700">C: ${data.c} ${unit}</text>
          <text x="45" y="95" fill="#4F46E5" font-size="10" font-weight="700">D: ${data.d} ${unit}</text>
          <text x="140" y="75" fill="#D97706" font-size="10" font-weight="800">Diag: ${data.diag} ${unit}</text>
          <circle cx="50" cy="45" r="4" fill="#4F46E5"/>
          <circle cx="220" cy="20" r="4" fill="#4F46E5"/>
          <circle cx="255" cy="125" r="4" fill="#4F46E5"/>
          <circle cx="70" cy="135" r="4" fill="#4F46E5"/>
        </svg>
      `;
    }
  }
}
