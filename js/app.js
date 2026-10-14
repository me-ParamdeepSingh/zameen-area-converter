/**
 * Zameen Area Converter — Main Application Controller
 */

import { LandConverter } from './converter.js';
import { StorageManager } from './storage.js';
import { translations } from './i18n.js';
import { PlotCalculatorUI } from './plot-calculator.js';
import { PriceCalculatorUI } from './price-ui.js';
import { ReferenceUI } from './reference-ui.js';
import { NakshaManager } from './naksha-pdf.js';

// Capacitor Native Mobile Plugins
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

class ZameenApp {
  constructor() {
    this.converter = null;
    this.prefs = StorageManager.getPrefs();
    this.activeTab = 'converter';
    this.activeFilter = 'all';
    this.unitsData = null;
    this.plotCalc = null;
    this.priceCalc = null;
    this.refUI = null;
    this.debounceTimer = null;
    this.currentNakshaGeom = null;
  }

  async init() {
    try {
      const response = await fetch('/data/units.json');
      this.unitsData = await response.json();
    } catch (err) {
      console.error('Failed to load units.json', err);
      // Fallback
      return;
    }

    this.converter = new LandConverter(this.unitsData);

    // Apply initial theme
    this.applyTheme(this.prefs.theme);

    // Setup sub-controllers
    this.plotCalc = new PlotCalculatorUI(this.converter, StorageManager, (areaSqft, targetTab) => {
      if (targetTab === 'price') {
        this.switchTab('price');
        this.priceCalc.setAreaFromOutside(areaSqft);
      } else if (targetTab === 'converter') {
        this.switchTab('converter');
        const gaj = areaSqft / 9.0;
        const heroInput = document.getElementById('hero-number-input');
        const unitDropdown = document.getElementById('from-unit-dropdown');
        if (heroInput) heroInput.value = Math.round(gaj * 100) / 100;
        if (unitDropdown) unitDropdown.value = 'gaj';
        this.runConversion();
      }
    });

    this.priceCalc = new PriceCalculatorUI(this.converter, StorageManager, this);
    this.refUI = new ReferenceUI(this.converter, StorageManager, this);

    this.setupUI();
    this.applyLanguage(this.prefs.lang);
    this.plotCalc.init();
    this.priceCalc.init();
    this.refUI.init();
    this.runConversion();

    // Native Mobile lifecycle integrations
    try {
      await SplashScreen.hide();
    } catch (e) {
      // Running in browser
    }

    try {
      App.addListener('backButton', () => {
        const activeModal = document.querySelector('.modal-backdrop.active');
        if (activeModal) {
          activeModal.classList.remove('active');
        } else if (this.activeTab !== 'converter') {
          this.switchTab('converter');
        }
      });
    } catch (e) {
      // Browser fallback
    }
  }

  setupUI() {
    this.populateStateDropdown();
    this.updateVariantChips();
    this.populateFromUnitsDropdown();
    this.bindEvents();
    this.updateTrustCue();
  }

  bindEvents() {
    // 1. Language switcher chips
    document.querySelectorAll('.lang-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const lang = chip.dataset.lang;
        this.applyLanguage(lang);
      });
    });

    // 2. State dropdown change
    const stateSelect = document.getElementById('state-dropdown');
    if (stateSelect) {
      stateSelect.addEventListener('change', (e) => {
        const regionId = e.target.value;
        const region = this.converter.getRegion(regionId);
        this.prefs.regionId = regionId;
        this.prefs.variant = region.defaultVariant || 'standard';
        this.prefs.unitId = region.defaultUnit || 'sqft';
        StorageManager.savePrefs(this.prefs);

        this.updateVariantChips();
        this.populateFromUnitsDropdown();
        this.updateTrustCue();
        this.runConversion();
        this.refUI.render();
        this.priceCalc.populateUnitsDropdown();
        this.priceCalc.recalculate();
      });
    }

    // 3. Hero input & clear
    const heroInput = document.getElementById('hero-number-input');
    if (heroInput) {
      heroInput.addEventListener('input', () => {
        this.runConversion();
      });
      // Focus on start
      setTimeout(() => heroInput.focus(), 300);
    }

    const clearBtn = document.getElementById('clear-input-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (heroInput) {
          heroInput.value = '';
          heroInput.focus();
          this.runConversion();
        }
      });
    }

    // 4. From unit dropdown
    const unitDropdown = document.getElementById('from-unit-dropdown');
    if (unitDropdown) {
      unitDropdown.addEventListener('change', (e) => {
        this.prefs.unitId = e.target.value;
        StorageManager.savePrefs(this.prefs);
        this.runConversion();
      });
    }

    // 5. Preset chips (1, 2, 5, 10, 50, 100)
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.dataset.val;
        if (heroInput) {
          heroInput.value = val;
          this.runConversion();
        }
      });
    });

    // 6. Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter = chip.dataset.cat;
        this.runConversion();
      });
    });

    // 7. Bottom navigation dock tabs
    document.querySelectorAll('.nav-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        this.switchTab(target);
      });
    });

    // 8. History & Favorites modals
    document.getElementById('btn-history')?.addEventListener('click', () => this.openHistoryModal());
    document.getElementById('btn-favorites')?.addEventListener('click', () => this.openFavoritesModal());
    document.getElementById('btn-share')?.addEventListener('click', () => this.openShareModal());
    document.getElementById('btn-disclaimer')?.addEventListener('click', () => this.openDisclaimerModal());
    document.getElementById('btn-settings')?.addEventListener('click', () => this.openSettingsModal());

    // 9. Modal backdrop dismissal
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
      modal.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      });
    });

    // 10. Copy Share Text Button
    document.getElementById('btn-copy-share')?.addEventListener('click', () => {
      const shareText = document.getElementById('share-text-area')?.value;
      if (shareText) {
        navigator.clipboard.writeText(shareText);
        this.showToast(this.t('copySuccess'));
      }
    });

    // 11. Clear History
    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
      StorageManager.clearHistory();
      this.openHistoryModal();
      this.showToast(this.t('historyCleared'));
    });

    // 12. CAD Naksha Modal Triggers & Controls
    document.getElementById('banner-open-naksha')?.addEventListener('click', () => this.openNakshaModal());
    document.getElementById('btn-cta-naksha')?.addEventListener('click', () => this.openNakshaModal());
    document.getElementById('btn-open-naksha')?.addEventListener('click', () => this.openNakshaModal());

    const nakshaInputs = [
      'naksha-top-ft', 'naksha-top-in', 'naksha-top-label',
      'naksha-right-ft', 'naksha-right-in', 'naksha-right-label',
      'naksha-bot-ft', 'naksha-bot-in', 'naksha-bot-label',
      'naksha-left-ft', 'naksha-left-in', 'naksha-left-label',
      'naksha-diag-ft', 'naksha-diag-in',
      'naksha-owner-input', 'naksha-loc-input'
    ];

    nakshaInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.renderNakshaPreview());
        el.addEventListener('change', () => this.renderNakshaPreview());
      }
    });

    // Sample Photo Demo (Road 35.11, Gali 56.3, Back 38, Right 64)
    document.getElementById('btn-naksha-sample')?.addEventListener('click', () => {
      this.loadNakshaSamplePhoto();
    });

    // Auto-fill from rough notes
    document.getElementById('btn-naksha-autofill')?.addEventListener('click', () => {
      const rawText = document.getElementById('naksha-rough-input')?.value;
      if (rawText) {
        const parsed = NakshaManager.parseRoughNotes(rawText);
        if (parsed) {
          if (parsed.top) {
            const p = NakshaManager.parseDimension(parsed.top);
            document.getElementById('naksha-top-ft').value = p.ft;
            document.getElementById('naksha-top-in').value = p.in;
          }
          if (parsed.right) {
            const p = NakshaManager.parseDimension(parsed.right);
            document.getElementById('naksha-right-ft').value = p.ft;
            document.getElementById('naksha-right-in').value = p.in;
          }
          if (parsed.bottom) {
            const p = NakshaManager.parseDimension(parsed.bottom);
            document.getElementById('naksha-bot-ft').value = p.ft;
            document.getElementById('naksha-bot-in').value = p.in;
          }
          if (parsed.left) {
            const p = NakshaManager.parseDimension(parsed.left);
            document.getElementById('naksha-left-ft').value = p.ft;
            document.getElementById('naksha-left-in').value = p.in;
          }
          this.renderNakshaPreview();
          this.showToast('Parsed & filled plot dimensions!');
        } else {
          this.showToast('Could not detect 4 numbers. Try format: 35.11, 64, 38, 56.3');
        }
      }
    });

    // Download PDF Button
    document.getElementById('btn-download-pdf')?.addEventListener('click', () => {
      this.exportNaksha(false);
    });

    // Share PDF Button
    document.getElementById('btn-share-pdf')?.addEventListener('click', () => {
      this.exportNaksha(true);
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const activePane = document.getElementById(`tab-${tabId}`);
    if (activePane) activePane.classList.add('active');

    // Trigger recalculation if needed
    if (tabId === 'reference') this.refUI.render();
    if (tabId === 'plot') this.plotCalc.recalculate();
    if (tabId === 'price') this.priceCalc.recalculate();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  populateStateDropdown() {
    const select = document.getElementById('state-dropdown');
    if (!select) return;

    const lang = this.prefs.lang || 'en';
    select.innerHTML = this.converter.regions.map(r => `
      <option value="${r.id}" ${r.id === this.prefs.regionId ? 'selected' : ''}>
        ${r.name[lang] || r.name.en}
      </option>
    `).join('');
  }

  updateVariantChips() {
    const container = document.getElementById('variant-chips-container');
    const row = document.getElementById('variant-selector-row');
    if (!container || !row) return;

    const region = this.converter.getRegion(this.prefs.regionId);
    const variants = region.variants || [];

    if (variants.length <= 1) {
      row.style.display = 'none';
      return;
    }

    row.style.display = 'flex';
    const lang = this.prefs.lang || 'en';

    container.innerHTML = variants.map(v => `
      <button class="variant-chip ${v.id === this.prefs.variant ? 'active' : ''}" data-variant="${v.id}" title="${v.note || ''}">
        ${v.name[lang] || v.name.en}
      </button>
    `).join('');

    container.querySelectorAll('.variant-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.prefs.variant = chip.dataset.variant;
        StorageManager.savePrefs(this.prefs);
        this.updateVariantChips();
        this.populateFromUnitsDropdown();
        this.updateTrustCue();
        this.runConversion();
        this.refUI.render();
      });
    });
  }

  populateFromUnitsDropdown() {
    const select = document.getElementById('from-unit-dropdown');
    if (!select) return;

    const lang = this.prefs.lang || 'en';
    const { all } = this.converter.getUnitsForRegion(this.prefs.regionId, this.prefs.variant);

    select.innerHTML = all.map(u => `
      <option value="${u.id}" ${u.id === this.prefs.unitId ? 'selected' : ''}>
        ${u.name[lang] || u.name.en} (${u.symbol})
      </option>
    `).join('');

    // Ensure selected unit exists
    if (!all.some(u => u.id === this.prefs.unitId)) {
      this.prefs.unitId = all[0].id;
      select.value = all[0].id;
      StorageManager.savePrefs(this.prefs);
    }
  }

  updateTrustCue() {
    const badge = document.getElementById('trust-badge');
    const sourceText = document.getElementById('trust-source-text');
    if (!badge || !sourceText) return;

    const region = this.converter.getRegion(this.prefs.regionId);
    const lang = this.prefs.lang || 'en';
    const currentUnitId = this.prefs.unitId;

    let unit = region.units.find(u => u.id === currentUnitId);
    if (!unit) {
      unit = this.converter.universalUnits.find(u => u.id === currentUnitId);
    }

    const isVerified = unit ? unit.verified !== false : true;
    const source = unit ? unit.source : 'Revenue Standard';

    badge.className = `trust-badge ${isVerified ? 'verified' : 'unverified'}`;
    badge.innerHTML = isVerified ? `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
      <span>${this.t('verifyBadge')}</span>
    ` : `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${this.t('unverifiedBadge')}</span>
    `;

    sourceText.textContent = `${this.t('basedOn')} ${region.name[lang] || region.name.en} • ${source}`;
  }

  runConversion() {
    const heroInput = document.getElementById('hero-number-input');
    const resultsContainer = document.getElementById('results-list-container');
    if (!heroInput || !resultsContainer) return;

    const rawVal = heroInput.value.trim();
    if (!rawVal || isNaN(rawVal) || Number(rawVal) <= 0) {
      resultsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; padding: var(--space-8); text-align: center; color: var(--text-muted);">
          <svg style="width: 48px; height: 48px; margin-bottom: 8px; opacity: 0.4;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <p style="font-size: var(--text-base); font-weight: 600;">${this.t('enterArea')}</p>
          <p style="font-size: var(--text-xs); margin-top: 4px;">Type any number above to view real-time state conversions</p>
        </div>
      `;
      return;
    }

    const val = Number(rawVal);
    const fromUnitId = this.prefs.unitId;
    const regionId = this.prefs.regionId;
    const variant = this.prefs.variant;
    const lang = this.prefs.lang || 'en';

    const results = this.converter.convertAll(val, fromUnitId, regionId, variant);

    // Filter by active category chip
    const filtered = results.filter(r => {
      if (this.activeFilter === 'all') return true;
      return r.category === this.activeFilter;
    });

    resultsContainer.innerHTML = filtered.map(item => `
      <div class="result-card ${item.isCurrent ? 'highlight' : ''}" data-unit="${item.id}" data-val="${item.formattedValue}" data-name="${item.name[lang] || item.name.en}">
        <div class="result-header">
          <span class="result-unit-title">${item.name[lang] || item.name.en}</span>
          <span class="result-symbol">${item.symbol}</span>
        </div>
        <div class="result-value-row">
          <div class="result-value">${item.formattedValue}</div>
          <div class="copy-badge" title="Copy value">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </div>
        </div>
        <div class="result-formula">
          ${item.description || `1 ${item.symbol} = ${this.converter.formatNumber(item.sqft)} sq ft`}
        </div>
      </div>
    `).join('');

    // Attach click-to-copy handler on cards
    resultsContainer.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', () => {
        const valToCopy = card.dataset.val;
        const name = card.dataset.name;
        navigator.clipboard.writeText(valToCopy);
        this.showToast(`${name}: ${valToCopy} ${this.t('copiedRow')}`);
        this.triggerHaptic();
      });
    });

    // Record into history after debouncing
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      StorageManager.addHistory({
        value: val,
        unitId: fromUnitId,
        regionId: regionId,
        variant: variant,
        topResult: results[0] ? `${results[0].formattedValue} ${results[0].symbol}` : ''
      });
    }, 1200);
  }

  openHistoryModal() {
    const modal = document.getElementById('history-modal');
    const body = document.getElementById('history-modal-body');
    if (!modal || !body) return;

    const history = StorageManager.getHistory();
    const lang = this.prefs.lang || 'en';

    if (history.length === 0) {
      body.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: var(--space-6);">${this.t('emptyHistory')}</p>`;
    } else {
      body.innerHTML = history.map(item => {
        const date = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const region = this.converter.getRegion(item.regionId);
        const regionName = region.name[lang] || region.name.en;
        return `
          <div class="history-item-row" data-val="${item.value}" data-unit="${item.unitId}" data-region="${item.regionId}" data-variant="${item.variant}">
            <div>
              <div style="font-weight: 700; font-size: var(--text-sm);">${this.converter.formatNumber(item.value)} ${item.unitId}</div>
              <div class="history-meta">${regionName} • ${date}</div>
            </div>
            <div style="font-size: var(--text-xs); color: var(--primary); font-weight: 600;">Tap to reload ↺</div>
          </div>
        `;
      }).join('');

      body.querySelectorAll('.history-item-row').forEach(row => {
        row.addEventListener('click', () => {
          const val = row.dataset.val;
          const unit = row.dataset.unit;
          const reg = row.dataset.region;
          const vari = row.dataset.variant;

          this.prefs.regionId = reg;
          this.prefs.variant = vari;
          this.prefs.unitId = unit;
          StorageManager.savePrefs(this.prefs);

          const heroInput = document.getElementById('hero-number-input');
          const stateSelect = document.getElementById('state-dropdown');
          if (heroInput) heroInput.value = val;
          if (stateSelect) stateSelect.value = reg;

          this.updateVariantChips();
          this.populateFromUnitsDropdown();
          this.updateTrustCue();
          this.runConversion();
          modal.classList.remove('active');
          this.switchTab('converter');
        });
      });
    }

    modal.classList.add('active');
  }

  openFavoritesModal() {
    const modal = document.getElementById('favorites-modal');
    const body = document.getElementById('favorites-modal-body');
    if (!modal || !body) return;

    const favorites = StorageManager.getFavorites();
    const heroInput = document.getElementById('hero-number-input');
    const currentVal = parseFloat(heroInput?.value || 0);

    let html = '';

    if (currentVal > 0) {
      html += `
        <div style="margin-bottom: var(--space-4); padding: var(--space-3); background: var(--surface-secondary); border-radius: var(--radius-sm); border: 1px dashed var(--border);">
          <div style="font-size: var(--text-xs); font-weight: 700; margin-bottom: 6px; color: var(--primary);">Save Current Conversion:</div>
          <div style="font-size: var(--text-sm); font-weight: 700; margin-bottom: 8px;">${currentVal} ${this.prefs.unitId} (${this.prefs.regionId})</div>
          <button id="btn-save-current-fav" class="primary-btn" style="width: 100%; padding: 8px;">
            ★ ${this.t('saveFavorite')}
          </button>
        </div>
      `;
    }

    if (favorites.length === 0) {
      html += `<p style="color: var(--text-muted); text-align: center; padding: var(--space-4);">${this.t('emptyFavorites')}</p>`;
    } else {
      html += favorites.map(fav => `
        <div class="history-item-row" data-id="${fav.id}">
          <div>
            <div style="font-weight: 700; font-size: var(--text-sm);">${fav.label || 'Saved Land Area'}</div>
            <div class="history-meta">${fav.value} ${fav.unitId} • ${fav.regionId}</div>
          </div>
          <button class="icon-btn del-fav-btn" data-id="${fav.id}" style="color: var(--danger); width: 28px; height: 28px;">
            ✕
          </button>
        </div>
      `).join('');
    }

    body.innerHTML = html;

    // Attach save button
    document.getElementById('btn-save-current-fav')?.addEventListener('click', () => {
      const label = prompt(this.t('favoriteNamePrompt'), 'My Land Deal');
      if (label) {
        StorageManager.addFavorite({
          label,
          value: currentVal,
          unitId: this.prefs.unitId,
          regionId: this.prefs.regionId,
          variant: this.prefs.variant
        });
        this.openFavoritesModal();
        this.showToast('Saved to Favorites!');
      }
    });

    // Attach delete buttons
    body.querySelectorAll('.del-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        StorageManager.removeFavorite(id);
        this.openFavoritesModal();
      });
    });

    modal.classList.add('active');
  }

  openShareModal() {
    const modal = document.getElementById('share-modal');
    const container = document.getElementById('share-preview-content');
    const textArea = document.getElementById('share-text-area');
    if (!modal || !container || !textArea) return;

    const heroInput = document.getElementById('hero-number-input');
    const val = parseFloat(heroInput?.value || 1);
    const region = this.converter.getRegion(this.prefs.regionId);
    const results = this.converter.convertAll(val, this.prefs.unitId, this.prefs.regionId, this.prefs.variant);
    const lang = this.prefs.lang || 'en';

    // Summary Card HTML
    container.innerHTML = `
      <div class="share-preview-card">
        <div class="share-brand">ZAMEEN CONVERTER • ${region.name[lang] || region.name.en}</div>
        <div class="share-hero-number">${this.converter.formatNumber(val)} ${this.prefs.unitId.toUpperCase()}</div>
        <div class="share-grid">
          ${results.slice(0, 6).map(r => `
            <div class="share-unit-item">
              <div>${r.name[lang] || r.name.en}:</div>
              <div class="share-unit-val">${r.formattedValue} ${r.symbol}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Text formatted output
    let text = `📐 Land Area Conversion Summary (${region.name[lang] || region.name.en})\n`;
    text += `Base Value: ${this.converter.formatNumber(val)} ${this.prefs.unitId}\n`;
    text += `----------------------------------------\n`;
    results.forEach(r => {
      text += `• ${r.name.en} (${r.symbol}): ${r.formattedValue}\n`;
    });
    text += `----------------------------------------\n`;
    text += `Computed via Zameen Converter (State-Aware Land Calculator)\n`;

    textArea.value = text;
    modal.classList.add('active');
  }

  openDisclaimerModal() {
    const modal = document.getElementById('disclaimer-modal');
    if (modal) modal.classList.add('active');
  }

  openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('active');

    // Theme selector
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = this.prefs.theme;
      themeSelect.onchange = (e) => {
        this.prefs.themeExplicitlySet = true;
        this.applyTheme(e.target.value);
      };
    }
  }

  applyTheme(theme) {
    this.prefs.theme = theme;
    StorageManager.savePrefs(this.prefs);

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (theme === 'system') {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    // Native mobile status bar styling
    try {
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      StatusBar.setBackgroundColor({ color: isDark ? '#0B0F19' : '#FFFFFF' });
    } catch (e) {}
  }

  async triggerHaptic() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      if (navigator.vibrate) navigator.vibrate(25);
    }
  }

  applyLanguage(lang) {
    this.prefs.lang = lang;
    StorageManager.savePrefs(this.prefs);

    document.querySelectorAll('.lang-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.lang === lang);
    });

    document.documentElement.lang = lang;

    // Translate DOM elements marked with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const text = this.t(key);
      if (text) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // Re-render dynamic components
    this.populateStateDropdown();
    this.updateVariantChips();
    this.populateFromUnitsDropdown();
    this.updateTrustCue();
    this.runConversion();
    if (this.plotCalc) this.plotCalc.recalculate();
    if (this.priceCalc) {
      this.priceCalc.populateUnitsDropdown();
      this.priceCalc.recalculate();
    }
    if (this.refUI) this.refUI.render();
  }

  t(key) {
    const lang = this.prefs.lang || 'en';
    const dict = translations[lang] || translations.en;
    return dict[key] || translations.en[key] || key;
  }

  openNakshaModal() {
    const modal = document.getElementById('naksha-modal');
    if (!modal) return;
    modal.classList.add('active');

    // If inputs are at 0, load defaults
    const topFt = document.getElementById('naksha-top-ft')?.value;
    if (!topFt || topFt === '0') {
      this.loadNakshaSamplePhoto();
    } else {
      this.renderNakshaPreview();
    }
  }

  loadNakshaSamplePhoto() {
    // Exact values from user's handwritten notepad photo:
    // Road: 35.11, Gali: 56.3, Back: 38, Right: 64
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal('naksha-top-ft', '35');
    setVal('naksha-top-in', '11');
    setVal('naksha-top-label', 'ROAD');

    setVal('naksha-right-ft', '64');
    setVal('naksha-right-in', '0');
    setVal('naksha-right-label', 'SIDE');

    setVal('naksha-bot-ft', '38');
    setVal('naksha-bot-in', '0');
    setVal('naksha-bot-label', 'BACK');

    setVal('naksha-left-ft', '56');
    setVal('naksha-left-in', '3');
    setVal('naksha-left-label', 'GALI');

    setVal('naksha-diag-ft', '');
    setVal('naksha-diag-in', '');

    setVal('naksha-owner-input', 'Plot Site Measurement');
    setVal('naksha-loc-input', 'Road & Gali Frontage');

    this.renderNakshaPreview();
    this.showToast(this.t('loadSample'));
  }

  renderNakshaPreview() {
    const container = document.getElementById('naksha-svg-container');
    if (!container) return;

    const getDim = (ftId, inId) => {
      const ft = parseFloat(document.getElementById(ftId)?.value || 0);
      const inch = parseFloat(document.getElementById(inId)?.value || 0);
      const decimal = ft + (inch / 12.0);
      const display = inch > 0 ? `${Math.round(ft)}'-${Math.round(inch)}"` : `${Math.round(ft)}'`;
      return { ft: Math.round(ft), in: Math.round(inch), decimal, display };
    };

    const top = getDim('naksha-top-ft', 'naksha-top-in');
    const right = getDim('naksha-right-ft', 'naksha-right-in');
    const bottom = getDim('naksha-bot-ft', 'naksha-bot-in');
    const left = getDim('naksha-left-ft', 'naksha-left-in');

    const diagFt = parseFloat(document.getElementById('naksha-diag-ft')?.value || 0);
    const diagIn = parseFloat(document.getElementById('naksha-diag-in')?.value || 0);
    const optionalDiag = diagFt > 0 ? diagFt + (diagIn / 12.0) : 0;

    const geom = NakshaManager.computePlotGeometry({ top, right, bottom, left }, optionalDiag);
    this.currentNakshaGeom = geom;

    if (!geom) {
      container.innerHTML = '<div style="padding: 20px; color: var(--text-muted); font-size: 13px;">Please enter valid side dimensions (greater than 0)</div>';
      return;
    }

    const roadLabel = document.getElementById('naksha-top-label')?.value || 'ROAD';
    const galiLabel = document.getElementById('naksha-left-label')?.value || 'GALI';
    const backLabel = document.getElementById('naksha-bot-label')?.value || 'BACK';
    const rightLabel = document.getElementById('naksha-right-label')?.value || '';

    const svgHtml = NakshaManager.renderCADSvg(geom, {
      roadLabel,
      galiLabel,
      backLabel,
      rightLabel
    });

    container.innerHTML = svgHtml;
  }

  async exportNaksha(isShare = false) {
    if (!this.currentNakshaGeom) {
      this.renderNakshaPreview();
    }
    if (!this.currentNakshaGeom) {
      this.showToast('Please enter valid side dimensions first');
      return;
    }

    const ownerName = document.getElementById('naksha-owner-input')?.value || 'Client Plot';
    const location = document.getElementById('naksha-loc-input')?.value || 'Survey Site';
    const roadLabel = document.getElementById('naksha-top-label')?.value || 'ROAD';
    const galiLabel = document.getElementById('naksha-left-label')?.value || 'GALI';
    const backLabel = document.getElementById('naksha-bot-label')?.value || 'BACK';
    const rightLabel = document.getElementById('naksha-right-label')?.value || '';

    const prefs = StorageManager.getPrefs();
    const regionId = prefs.regionId || 'punjab';
    const variant = prefs.variant || 'standard';

    // Regional area text
    let regionalText = '';
    if (this.converter) {
      const converted = this.converter.convertAll(this.currentNakshaGeom.areaSqft, 'sqft', regionId, variant);
      const topReg = converted.find(u => u.category === 'regional');
      if (topReg) {
        regionalText = `${topReg.name.en}: ${topReg.formattedValue}`;
      }
    }

    const doc = NakshaManager.generatePlotPDF(
      this.currentNakshaGeom,
      {
        ownerName,
        location,
        roadLabel,
        galiLabel,
        backLabel,
        rightLabel
      },
      regionalText
    );

    const safeName = ownerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Naksha_${safeName}_${Date.now()}.pdf`;

    if (isShare) {
      this.showToast('Preparing PDF for sharing...');
      const result = await NakshaManager.sharePDF(doc, filename);
      if (result && result.success) {
        this.showToast(this.t('shareSuccess'));
      }
    } else {
      this.showToast('Saving PDF to Downloads folder...');
      const result = await NakshaManager.downloadPDF(doc, filename);
      if (result && result.success) {
        this.showToast(this.t('downloadSuccess'));
      } else {
        this.showToast('PDF downloaded successfully!');
      }
    }
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease-out';
      setTimeout(() => toast.remove(), 200);
    }, 2200);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const app = new ZameenApp();
  app.init();
});
