/**
 * Plot Price Calculator UI Controller
 * Direct mode (Area × Rate) and Reverse mode (Total Price -> Rate comparison across units)
 * Includes Indian Currency formatting, In-Words, and Stamp Duty / Registration Breakdown
 */

export class PriceCalculatorUI {
  constructor(converter, storage, i18nManager) {
    this.converter = converter;
    this.storage = storage;
    this.i18n = i18nManager;
    this.mode = 'direct'; // 'direct' | 'reverse'
  }

  init() {
    this.bindEvents();
    this.populateUnitsDropdown();
    this.recalculate();
  }

  bindEvents() {
    const directBtn = document.getElementById('price-mode-direct');
    const reverseBtn = document.getElementById('price-mode-reverse');

    if (directBtn && reverseBtn) {
      directBtn.addEventListener('click', () => {
        this.setMode('direct');
      });
      reverseBtn.addEventListener('click', () => {
        this.setMode('reverse');
      });
    }

    // Input listeners
    const inputs = [
      'price-area-input',
      'price-unit-select',
      'price-rate-input',
      'price-total-input',
      'duty-stamp-pct',
      'duty-reg-pct'
    ];

    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.recalculate());
        el.addEventListener('change', () => this.recalculate());
      }
    });
  }

  setMode(mode) {
    this.mode = mode;
    document.getElementById('price-mode-direct')?.classList.toggle('active', mode === 'direct');
    document.getElementById('price-mode-reverse')?.classList.toggle('active', mode === 'reverse');

    const directGroup = document.getElementById('price-direct-inputs');
    const reverseGroup = document.getElementById('price-reverse-inputs');
    const reverseResults = document.getElementById('price-reverse-results');
    const dutyBox = document.getElementById('duty-calculator-box');

    if (directGroup) directGroup.style.display = mode === 'direct' ? 'grid' : 'none';
    if (reverseGroup) reverseGroup.style.display = mode === 'reverse' ? 'grid' : 'none';
    if (reverseResults) reverseResults.style.display = mode === 'reverse' ? 'block' : 'none';
    if (dutyBox) dutyBox.style.display = mode === 'direct' ? 'block' : 'none';

    this.recalculate();
  }

  populateUnitsDropdown() {
    const selects = [document.getElementById('price-unit-select'), document.getElementById('price-rev-unit-select')];
    const prefs = this.storage.getPrefs();
    const { all } = this.converter.getUnitsForRegion(prefs.regionId, prefs.variant);
    const lang = prefs.lang || 'en';

    selects.forEach(select => {
      if (!select) return;
      select.innerHTML = all.map(u => `
        <option value="${u.id}">${u.name[lang] || u.name.en} (${u.symbol})</option>
      `).join('');
      // Default to Gaj if present
      if (all.some(u => u.id === 'gaj')) {
        select.value = 'gaj';
      }
    });
  }

  setAreaFromOutside(sqftValue) {
    const prefs = this.storage.getPrefs();
    // Default converted to Gaj
    const gajVal = sqftValue / 9.0;
    const directArea = document.getElementById('price-area-input');
    const revArea = document.getElementById('price-rev-area-input');

    if (directArea) directArea.value = Math.round(gajVal * 100) / 100;
    if (revArea) revArea.value = Math.round(gajVal * 100) / 100;

    const unitSelect = document.getElementById('price-unit-select');
    if (unitSelect) unitSelect.value = 'gaj';

    this.recalculate();
  }

  recalculate() {
    const prefs = this.storage.getPrefs();
    const regionId = prefs.regionId;
    const variant = prefs.variant;
    const lang = prefs.lang || 'en';

    if (this.mode === 'direct') {
      const area = parseFloat(document.getElementById('price-area-input')?.value || 0);
      const unitId = document.getElementById('price-unit-select')?.value || 'gaj';
      const rate = parseFloat(document.getElementById('price-rate-input')?.value || 0);

      const res = this.converter.calculatePlotPrice({
        mode: 'direct',
        area,
        unitId,
        regionId,
        variant,
        rate
      });

      const amountEl = document.getElementById('price-hero-amount');
      const wordsEl = document.getElementById('price-in-words');

      if (amountEl) amountEl.textContent = res.totalPriceFormatted;
      if (wordsEl) {
        const words = this.converter.toIndianWords(res.totalPrice, lang);
        wordsEl.textContent = words ? `(${words})` : '';
      }

      // Stamp duty calculation
      const stampPct = parseFloat(document.getElementById('duty-stamp-pct')?.value || 6);
      const regPct = parseFloat(document.getElementById('duty-reg-pct')?.value || 1);

      const stampDuty = Math.round(res.totalPrice * (stampPct / 100));
      const regFee = Math.round(res.totalPrice * (regPct / 100));
      const grandTotal = res.totalPrice + stampDuty + regFee;

      const stampValEl = document.getElementById('duty-stamp-val');
      const regValEl = document.getElementById('duty-reg-val');
      const grandEl = document.getElementById('duty-grand-total');

      if (stampValEl) stampValEl.textContent = this.converter.formatCurrency(stampDuty);
      if (regValEl) regValEl.textContent = this.converter.formatCurrency(regFee);
      if (grandEl) grandEl.textContent = this.converter.formatCurrency(grandTotal);

    } else if (this.mode === 'reverse') {
      const totalPrice = parseFloat(document.getElementById('price-rev-total')?.value || 0);
      const area = parseFloat(document.getElementById('price-rev-area-input')?.value || 0);
      const unitId = document.getElementById('price-rev-unit-select')?.value || 'gaj';

      const res = this.converter.calculatePlotPrice({
        mode: 'reverse',
        totalPrice,
        area,
        unitId,
        regionId,
        variant
      });

      const listEl = document.getElementById('price-rates-grid');
      if (!listEl) return;

      if (!res || !res.rates || res.rates.length === 0) {
        listEl.innerHTML = `<p style="color: var(--text-muted); font-size: var(--text-xs);">Enter total deal amount and area to view equivalent unit rates.</p>`;
        return;
      }

      listEl.innerHTML = res.rates.map(r => `
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 10px 14px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: var(--text-sm); font-weight: 700; color: var(--text-secondary);">${r.name[lang] || r.name.en}</div>
            <div style="font-size: var(--text-xs); color: var(--text-muted);">per ${r.symbol}</div>
          </div>
          <div style="font-size: var(--text-base); font-weight: 800; color: var(--primary);">
            ${r.formattedRate}
          </div>
        </div>
      `).join('');
    }
  }
}
