/**
 * Zameen Converter — Core Conversion Engine & Plot Calculator Logic
 * Implements high-precision floating point calculations with Indian numbering conventions.
 */

export class LandConverter {
  constructor(unitsData) {
    this.data = unitsData;
    this.universalUnits = unitsData.universalUnits || [];
    this.regions = unitsData.regions || [];
    this.unitMap = new Map();
    this._buildUnitIndex();
  }

  _buildUnitIndex() {
    this.unitMap.clear();

    // Universal units indexed by unitId
    for (const unit of this.universalUnits) {
      this.unitMap.set(`universal:${unit.id}`, unit);
    }

    // Regional units indexed by regionId:unitId:variant
    for (const region of this.regions) {
      for (const unit of region.units) {
        const variant = unit.variant || 'standard';
        this.unitMap.set(`${region.id}:${unit.id}:${variant}`, unit);
        // Also map without variant for fallback
        if (!this.unitMap.has(`${region.id}:${unit.id}`)) {
          this.unitMap.set(`${region.id}:${unit.id}`, unit);
        }
      }
    }
  }

  getRegion(regionId) {
    return this.regions.find(r => r.id === regionId) || this.regions[0];
  }

  /**
   * Returns all units available for a specific region and variant
   */
  getUnitsForRegion(regionId, variantId = null) {
    const region = this.getRegion(regionId);
    const activeVariant = variantId || region.defaultVariant || 'standard';

    // Filter regional units matching the variant or where variant isn't constrained
    const regionalUnits = region.units.filter(u => {
      if (!u.variant) return true;
      return u.variant === activeVariant;
    });

    return {
      universal: this.universalUnits,
      regional: regionalUnits,
      all: [...this.universalUnits, ...regionalUnits]
    };
  }

  /**
   * Retrieves unit multiplier in square feet
   */
  getUnitMultiplier(unitId, regionId, variant = 'standard') {
    // 1. Check universal
    if (this.unitMap.has(`universal:${unitId}`)) {
      return this.unitMap.get(`universal:${unitId}`).sqft;
    }

    // 2. Check region with variant
    const regionKey = `${regionId}:${unitId}:${variant}`;
    if (this.unitMap.has(regionKey)) {
      return this.unitMap.get(regionKey).sqft;
    }

    // 3. Check region fallback
    if (this.unitMap.has(`${regionId}:${unitId}`)) {
      return this.unitMap.get(`${regionId}:${unitId}`).sqft;
    }

    // 4. Fallback search across region units
    const region = this.getRegion(regionId);
    const found = region.units.find(u => u.id === unitId);
    if (found) return found.sqft;

    throw new Error(`Unit '${unitId}' not recognized for region '${regionId}'`);
  }

  /**
   * Convert value from one unit to another
   */
  convert(value, fromUnitId, fromRegionId, toUnitId, toRegionId = fromRegionId, variant = 'standard') {
    if (value === null || value === undefined || isNaN(value)) {
      return 0;
    }
    const num = Number(value);
    if (num === 0) return 0;

    const fromSqft = this.getUnitMultiplier(fromUnitId, fromRegionId, variant);
    const toSqft = this.getUnitMultiplier(toUnitId, toRegionId, variant);

    const areaInSqft = num * fromSqft;
    return areaInSqft / toSqft;
  }

  /**
   * Convert a single input value into all relevant units for the given region
   */
  convertAll(value, fromUnitId, regionId, variant = null) {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return [];
    }

    const region = this.getRegion(regionId);
    const activeVariant = variant || region.defaultVariant || 'standard';
    const { all } = this.getUnitsForRegion(regionId, activeVariant);
    const fromMultiplier = this.getUnitMultiplier(fromUnitId, regionId, activeVariant);
    const areaInSqft = num * fromMultiplier;

    return all.map(unit => {
      const convertedValue = areaInSqft / unit.sqft;
      return {
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        category: unit.category,
        sqft: unit.sqft,
        verified: unit.verified !== false,
        source: unit.source,
        description: unit.description,
        value: convertedValue,
        formattedValue: this.formatNumber(convertedValue),
        isCurrent: unit.id === fromUnitId
      };
    });
  }

  /**
   * Indian number format formatter (e.g., 1,45,200.50)
   * Trims trailing decimals appropriately (up to 4 places)
   */
  formatNumber(val, maxDecimals = 4) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    const num = Number(val);
    if (num === 0) return '0';

    // Round to maxDecimals
    const factor = Math.pow(10, maxDecimals);
    const rounded = Math.round((num + Number.EPSILON) * factor) / factor;

    const parts = rounded.toString().split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    const isNegative = intPart.startsWith('-');
    if (isNegative) intPart = intPart.substring(1);

    // Indian grouping: last 3 digits, then groups of 2
    if (intPart.length > 3) {
      const last3 = intPart.substring(intPart.length - 3);
      const remaining = intPart.substring(0, intPart.length - 3);
      const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      intPart = `${formattedRemaining},${last3}`;
    }

    const formatted = isNegative ? `-${intPart}` : intPart;
    return decPart ? `${formatted}.${decPart}` : formatted;
  }

  /**
   * Formats Indian currency (e.g. ₹ 1,45,20,000)
   */
  formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return '₹ 0';
    const num = Math.round(Number(val));
    return `₹ ${this.formatNumber(num, 0)}`;
  }

  /**
   * Indian verbal representation (e.g. 1.25 Crore, 45 Lakh, 50 Thousand)
   */
  toIndianWords(amount, lang = 'en') {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return '';

    const crore = 10000000;
    const lakh = 100000;
    const thousand = 1000;

    let res = '';
    if (num >= crore) {
      const crVal = (num / crore).toFixed(2).replace(/\.00$/, '');
      if (lang === 'hi') res = `${crVal} करोड़`;
      else if (lang === 'pa') res = `${crVal} ਕਰੋੜ`;
      else res = `${crVal} Crore`;
    } else if (num >= lakh) {
      const lkVal = (num / lakh).toFixed(2).replace(/\.00$/, '');
      if (lang === 'hi') res = `${lkVal} लाख`;
      else if (lang === 'pa') res = `${lkVal} ਲੱਖ`;
      else res = `${lkVal} Lakh`;
    } else if (num >= thousand) {
      const thVal = (num / thousand).toFixed(2).replace(/\.00$/, '');
      if (lang === 'hi') res = `${thVal} हज़ार`;
      else if (lang === 'pa') res = `${thVal} ਹਜ਼ਾਰ`;
      else res = `${thVal} Thousand`;
    } else {
      res = this.formatNumber(Math.round(num), 0);
    }
    return res;
  }

  /**
   * Calculate Plot Area:
   * - Rectangle: length × width (with unit conversion to sq ft)
   * - Triangle: 3 sides Heron's formula: sqrt(s*(s-a)*(s-b)*(s-c))
   * - 4-Sided Irregular Plot: sides a, b, c, d and diagonal d1:
   *   Triangulation = Heron(a, b, d1) + Heron(c, d, d1)
   */
  calculatePlotArea(params) {
    const { shape, inputUnit = 'feet', ...dims } = params;

    // Multiplier to convert linear input into feet
    let toFeet = 1.0;
    if (inputUnit === 'yards' || inputUnit === 'gaj') toFeet = 3.0;
    else if (inputUnit === 'metres') toFeet = 3.28084;
    else if (inputUnit === 'karam') toFeet = 5.5;

    if (shape === 'rectangle') {
      const l = Number(dims.length) * toFeet;
      const w = Number(dims.width) * toFeet;
      if (l <= 0 || w <= 0 || isNaN(l) || isNaN(w)) return 0;
      return l * w; // returns area in sq ft
    }

    if (shape === 'triangle') {
      const a = Number(dims.sideA) * toFeet;
      const b = Number(dims.sideB) * toFeet;
      const c = Number(dims.sideC) * toFeet;

      if (a <= 0 || b <= 0 || c <= 0) return 0;
      // Triangle inequality check
      if (a + b <= c || a + c <= b || b + c <= a) {
        throw new Error('Invalid triangle: Sum of any two sides must exceed the third side.');
      }
      const s = (a + b + c) / 2.0;
      return Math.sqrt(s * (s - a) * (s - b) * (s - c));
    }

    if (shape === 'irregular4') {
      const a = Number(dims.sideA) * toFeet;
      const b = Number(dims.sideB) * toFeet;
      const c = Number(dims.sideC) * toFeet;
      const d = Number(dims.sideD) * toFeet;
      const diag = Number(dims.diagonal) * toFeet;

      if (a <= 0 || b <= 0 || c <= 0 || d <= 0 || diag <= 0) return 0;

      // Check triangle 1 (a, b, diag)
      if (a + b <= diag || a + diag <= b || b + diag <= a) {
        throw new Error('Invalid geometry for Triangle 1 (Sides A, B, and Diagonal)');
      }
      // Check triangle 2 (c, d, diag)
      if (c + d <= diag || c + diag <= d || d + diag <= c) {
        throw new Error('Invalid geometry for Triangle 2 (Sides C, D, and Diagonal)');
      }

      const s1 = (a + b + diag) / 2.0;
      const area1 = Math.sqrt(s1 * (s1 - a) * (s1 - b) * (s1 - diag));

      const s2 = (c + d + diag) / 2.0;
      const area2 = Math.sqrt(s2 * (s2 - c) * (s2 - d) * (s2 - diag));

      return area1 + area2;
    }

    return 0;
  }

  /**
   * Plot Price Engine
   * mode: 'direct' -> area + rate/unit => total price
   * mode: 'reverse' -> total price + area => rate per unit across all units
   */
  calculatePlotPrice(params) {
    const {
      mode = 'direct',
      area,
      unitId,
      regionId,
      variant = 'standard',
      rate = 0,
      totalPrice = 0
    } = params;

    const multiplier = this.getUnitMultiplier(unitId, regionId, variant);
    const areaSqft = Number(area) * multiplier;

    if (mode === 'direct') {
      const total = Number(area) * Number(rate);
      return {
        totalPrice: total,
        totalPriceFormatted: this.formatCurrency(total),
        inWords: this.toIndianWords(total),
        areaSqft: areaSqft
      };
    }

    if (mode === 'reverse') {
      const price = Number(totalPrice);
      if (price <= 0 || areaSqft <= 0) {
        return { rates: [] };
      }

      const units = this.getUnitsForRegion(regionId, variant).all;
      const rates = units.map(u => {
        const unitArea = areaSqft / u.sqft;
        const ratePerUnit = price / unitArea;
        return {
          unitId: u.id,
          name: u.name,
          symbol: u.symbol,
          rate: ratePerUnit,
          formattedRate: this.formatCurrency(ratePerUnit)
        };
      });

      return {
        totalPrice: price,
        totalPriceFormatted: this.formatCurrency(price),
        inWords: this.toIndianWords(price),
        rates
      };
    }
  }
}
