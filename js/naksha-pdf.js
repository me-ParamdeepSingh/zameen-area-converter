/**
 * Naksha & PDF Map Generator Module
 * Generates CAD-quality architectural plot drawings with dimension lines,
 * dual arrowheads, area in Sq Ft & Gaj (Sq Yard), and exports high-res vector PDFs.
 */

import { jsPDF } from 'jspdf';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export class NakshaManager {
  /**
   * Parse dimension from Feet & Inches or Contractor decimal notation.
   * e.g., 35.11 -> 35 ft 11 in (35.9167 ft, "35'-11\"")
   *       56.3  -> 56 ft 3 in  (56.25 ft, "56'-3\"")
   *       38    -> 38 ft 0 in  (38.0 ft, "38'")
   *       64    -> 64 ft 0 in  (64.0 ft, "64'")
   */
  static parseDimension(val, isContractorFormat = true) {
    if (val == null || val === '') return { ft: 0, in: 0, decimal: 0, display: "0'" };
    
    if (typeof val === 'number') {
      val = val.toString();
    }

    val = val.trim();

    // Check if format is "35'-11\"" or "35' 11\""
    const ftInMatch = val.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft)?\s*(?:-\s*|\s+)?(?:(\d+(?:\.\d+)?)\s*(?:"|in)?)?$/i);
    if (ftInMatch && ftInMatch[2] !== undefined) {
      const ft = parseFloat(ftInMatch[1]) || 0;
      const inch = parseFloat(ftInMatch[2]) || 0;
      const decimal = ft + (inch / 12.0);
      const display = inch > 0 ? `${Math.round(ft)}'-${Math.round(inch)}"` : `${Math.round(ft)}'`;
      return { ft: Math.round(ft), in: Math.round(inch), decimal, display };
    }

    const num = parseFloat(val);
    if (isNaN(num)) return { ft: 0, in: 0, decimal: 0, display: "0'" };

    if (isContractorFormat && val.includes('.')) {
      const parts = val.split('.');
      const ft = parseInt(parts[0], 10) || 0;
      const inStr = parts[1] || '0';
      
      // In contractor notation: .11 is 11 in, .3 is 3 in, .6 is 6 in, .9 is 9 in
      let inch = parseInt(inStr, 10) || 0;
      if (inch > 11) {
        // If someone typed .30 or .75 as pure decimal
        const decVal = parseFloat(val);
        const inchCalc = Math.round((decVal - ft) * 12);
        return {
          ft,
          in: inchCalc,
          decimal: decVal,
          display: inchCalc > 0 ? `${ft}'-${inchCalc}"` : `${ft}'`
        };
      }
      const decimal = ft + (inch / 12.0);
      const display = inch > 0 ? `${ft}'-${inch}"` : `${ft}'`;
      return { ft, in: inch, decimal, display };
    }

    // Pure integer or decimal feet
    const ft = Math.floor(num);
    const inch = Math.round((num - ft) * 12);
    const display = inch > 0 ? `${ft}'-${inch}"` : `${ft}'`;
    return { ft, in: inch, decimal: num, display };
  }

  /**
   * Parse rough notes text string into 4 sides.
   * e.g., "Road 35.11, Gali 56.3, Back 38, Right 64"
   * or "35.11, 64, 38, 56.3"
   */
  static parseRoughNotes(notes) {
    if (!notes) return null;
    const text = notes.trim();

    // Look for named directions first
    const roadMatch = text.match(/(?:road|front|a|top|ਮੂਹਰੇ|ਸੜਕ)[\s:=]+([0-9.'"-]+)/i);
    const rightMatch = text.match(/(?:right|b|side\s*2|ਸੱਜੇ)[\s:=]+([0-9.'"-]+)/i);
    const backMatch = text.match(/(?:back|c|bottom|ਪਿੱਛੇ)[\s:=]+([0-9.'"-]+)/i);
    const leftMatch = text.match(/(?:left|d|gali|side\s*1|street|ਖੱਬੇ|ਗਲੀ)[\s:=]+([0-9.'"-]+)/i);

    if (roadMatch || backMatch || leftMatch || rightMatch) {
      return {
        top: roadMatch ? roadMatch[1] : null,
        right: rightMatch ? rightMatch[1] : null,
        bottom: backMatch ? backMatch[1] : null,
        left: leftMatch ? leftMatch[1] : null
      };
    }

    // Extract all numbers
    const numbers = text.match(/\d+(?:\.\d+)?(?:'-\d+")?/g);
    if (numbers && numbers.length >= 4) {
      return {
        top: numbers[0],
        right: numbers[1],
        bottom: numbers[2],
        left: numbers[3]
      };
    }

    return null;
  }

  /**
   * Compute 4-sided polygon vertices and area
   * Points:
   * P0: Top-Left
   * P1: Top-Right (at distance Top from P0)
   * P2: Bottom-Right
   * P3: Bottom-Left (at distance Left from P0)
   */
  static computePlotGeometry(sides, optionalDiag = 0) {
    const top = sides.top.decimal;
    const right = sides.right.decimal;
    const bottom = sides.bottom.decimal;
    const left = sides.left.decimal;

    if (top <= 0 || right <= 0 || bottom <= 0 || left <= 0) {
      return null;
    }

    // P0: Top-Left (0, 0)
    const p0 = { x: 0, y: 0 };
    // P1: Top-Right (top, 0)
    const p1 = { x: top, y: 0 };

    // P3: Bottom-Left along Left side.
    // In typical plots, Top and Left are approximately perpendicular.
    let leftAngle = Math.PI / 2; // 90 degrees
    let p3 = { x: 0, y: left };

    // Calculate distance between P1 and P3
    let d13 = Math.sqrt(p1.x * p1.x + p3.y * p3.y);

    // If explicit diagonal given:
    if (optionalDiag > 0 && optionalDiag < top + left && optionalDiag > Math.abs(top - left)) {
      d13 = optionalDiag;
      // Angle at P0 via law of cosines:
      const cosAngle = (top * top + left * left - d13 * d13) / (2 * top * left);
      leftAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      p3 = {
        x: -left * Math.cos(leftAngle),
        y: left * Math.sin(leftAngle)
      };
    }

    // Find P2 as intersection of Circle(P1, radius=right) and Circle(P3, radius=bottom)
    let p2 = null;
    const dx = p3.x - p1.x;
    const dy = p3.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= right + bottom && dist >= Math.abs(right - bottom)) {
      const a = (right * right - bottom * bottom + dist * dist) / (2 * dist);
      const h = Math.sqrt(Math.max(0, right * right - a * a));
      const xm = p1.x + (a * dx) / dist;
      const ym = p1.y + (a * dy) / dist;

      // Two possible intersection points; choose the one with larger x (outward right)
      const p2a = { x: xm + (h * dy) / dist, y: ym - (h * dx) / dist };
      const p2b = { x: xm - (h * dy) / dist, y: ym + (h * dx) / dist };
      p2 = p2a.x >= p2b.x ? p2a : p2b;
    } else {
      // Fallback: estimate near rectangle / trapezoid
      const avgW = (top + bottom) / 2;
      p2 = { x: p1.x + (bottom - top) * 0.5, y: (left + right) / 2 };
    }

    const points = [p0, p1, p2, p3];

    // Compute exact area via Shoelace formula
    let shoelace = 0;
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      shoelace += points[i].x * points[next].y - points[next].x * points[i].y;
    }
    let areaSqft = Math.abs(shoelace) / 2.0;

    // Average surveyor method for reference:
    const avgW = (top + bottom) / 2.0;
    const avgL = (left + right) / 2.0;
    const avgAreaSqft = avgW * avgL;

    // If shoelace calculation was degraded, fallback to average formula
    if (isNaN(areaSqft) || areaSqft <= 0) {
      areaSqft = avgAreaSqft;
    }

    const areaGaj = areaSqft / 9.0;
    const areaAcre = areaSqft / 43560.0;
    const areaSqm = areaSqft / 10.7639;

    // Bounding Box
    const minX = Math.min(p0.x, p1.x, p2.x, p3.x);
    const maxX = Math.max(p0.x, p1.x, p2.x, p3.x);
    const minY = Math.min(p0.y, p1.y, p2.y, p3.y);
    const maxY = Math.max(p0.y, p1.y, p2.y, p3.y);

    return {
      points,
      sides,
      areaSqft,
      areaGaj,
      areaAcre,
      areaSqm,
      avgAreaSqft,
      bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
    };
  }

  /**
   * Render CAD-style SVG preview matching the reference PDF map
   */
  static renderCADSvg(geom, options = {}) {
    if (!geom) return '<div class="naksha-empty">Please enter valid plot dimensions</div>';

    const {
      roadLabel = 'ROAD',
      galiLabel = 'GALI',
      backLabel = 'BACK',
      rightLabel = '',
      unitCategory = 'Punjab (1 Gaj = 9 sq ft)'
    } = options;

    const svgW = 540;
    const svgH = 680;
    const margin = 70; // margin for dimension lines and arrows

    const bounds = geom.bounds;
    const scaleX = (svgW - margin * 2) / (bounds.width || 1);
    const scaleY = (svgH - margin * 2) / (bounds.height || 1);
    const scale = Math.min(scaleX, scaleY);

    // Transform coordinate to SVG canvas (centered)
    const offsetX = (svgW - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = (svgH - bounds.height * scale) / 2 - bounds.minY * scale;

    const toSvg = (pt) => ({
      x: pt.x * scale + offsetX,
      y: pt.y * scale + offsetY
    });

    const pts = geom.points.map(toSvg);
    const [p0, p1, p2, p3] = pts;

    // Center of polygon for area text
    const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
    const cy = (p0.y + p1.y + p2.y + p3.y) / 4;

    const dimOffset = 30; // distance of dimension lines from plot edges

    // Top Dimension Line (Horizontal above P0-P1)
    const topY = Math.min(p0.y, p1.y) - dimOffset;
    // Bottom Dimension Line (below P3-P2)
    const botY = Math.max(p2.y, p3.y) + dimOffset;
    // Left Dimension Line (left of P0-P3)
    const leftX = Math.min(p0.x, p3.x) - dimOffset;
    // Right Dimension Line (right of P1-P2)
    const rightX = Math.max(p1.x, p2.x) + dimOffset;

    return `
      <svg viewBox="0 0 ${svgW} ${svgH}" class="cad-naksha-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 10 1 L 0 5 L 10 9 z" fill="#000000" />
          </marker>
          <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#000000" />
          </marker>
        </defs>

        <!-- Outer Sheet Border Frame -->
        <rect x="8" y="8" width="${svgW - 16}" height="${svgH - 16}" fill="#FFFFFF" stroke="#000000" stroke-width="1.2" />
        <rect x="14" y="14" width="${svgW - 28}" height="${svgH - 28}" fill="none" stroke="#CBD5E1" stroke-width="0.8" />

        <!-- North Direction Compass -->
        <g transform="translate(${svgW - 45}, 40)">
          <circle cx="0" cy="0" r="16" fill="#F8FAFC" stroke="#0F172A" stroke-width="1" />
          <polygon points="0,-14 4,-2 0,2 -4,-2" fill="#DC2626" />
          <polygon points="0,14 4,2 0,-2 -4,2" fill="#64748B" />
          <text x="0" y="-18" text-anchor="middle" font-size="10" font-weight="800" fill="#0F172A" font-family="sans-serif">N</text>
        </g>

        <!-- Extension Lines (thin dashed guides from corners to dimension lines) -->
        <line x1="${p0.x}" y1="${p0.y}" x2="${p0.x}" y2="${topY - 6}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2" />
        <line x1="${p1.x}" y1="${p1.y}" x2="${p1.x}" y2="${topY - 6}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2" />
        <line x1="${p3.x}" y1="${p3.y}" x2="${p3.x}" y2="${botY + 6}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2" />
        <line x1="${p2.x}" y1="${p2.y}" x2="${p2.x}" y2="${botY + 6}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2" />
        <line x1="${p0.x}" y1="${p0.y}" x2="${leftX - 6}" y2="${p0.y}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2" />
        <line x1="${p3.x}" y1="${p3.y}" x2="${leftX - 6}" y2="${p3.y}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2" />
        <line x1="${p1.x}" y1="${p1.y}" x2="${rightX + 6}" y2="${p1.y}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2" />
        <line x1="${p2.x}" y1="${p2.y}" x2="${rightX + 6}" y2="${p2.y}" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2" />

        <!-- Dimension Lines with Double Arrows -->
        <!-- TOP Dimension -->
        <line x1="${p0.x}" y1="${topY}" x2="${p1.x}" y2="${topY}" stroke="#000000" stroke-width="1.3" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <text x="${(p0.x + p1.x) / 2}" y="${topY - 8}" text-anchor="middle" font-size="14" font-weight="700" fill="#000000" font-family="'Courier New', Courier, monospace">
          ${geom.sides.top.display} ${roadLabel ? `(${roadLabel})` : ''}
        </text>

        <!-- BOTTOM Dimension -->
        <line x1="${p3.x}" y1="${botY}" x2="${p2.x}" y2="${botY}" stroke="#000000" stroke-width="1.3" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <text x="${(p3.x + p2.x) / 2}" y="${botY + 18}" text-anchor="middle" font-size="14" font-weight="700" fill="#000000" font-family="'Courier New', Courier, monospace">
          ${geom.sides.bottom.display} ${backLabel ? `(${backLabel})` : ''}
        </text>

        <!-- LEFT Dimension (Vertical) -->
        <line x1="${leftX}" y1="${p0.y}" x2="${leftX}" y2="${p3.y}" stroke="#000000" stroke-width="1.3" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <text x="${leftX - 10}" y="${(p0.y + p3.y) / 2}" text-anchor="middle" transform="rotate(-90 ${leftX - 10} ${(p0.y + p3.y) / 2})" font-size="14" font-weight="700" fill="#000000" font-family="'Courier New', Courier, monospace">
          ${geom.sides.left.display} ${galiLabel ? `(${galiLabel})` : ''}
        </text>

        <!-- RIGHT Dimension (Vertical) -->
        <line x1="${rightX}" y1="${p1.y}" x2="${rightX}" y2="${p2.y}" stroke="#000000" stroke-width="1.3" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
        <text x="${rightX + 18}" y="${(p1.y + p2.y) / 2}" text-anchor="middle" transform="rotate(90 ${rightX + 18} ${(p1.y + p2.y) / 2})" font-size="14" font-weight="700" fill="#000000" font-family="'Courier New', Courier, monospace">
          ${geom.sides.right.display} ${rightLabel ? `(${rightLabel})` : ''}
        </text>

        <!-- Plot Polygon (CAD Red Boundary Line matching image) -->
        <polygon points="${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" 
                 fill="rgba(220, 38, 38, 0.03)" 
                 stroke="#DC2626" 
                 stroke-width="2" 
                 stroke-linejoin="round" />

        <!-- Plot Corner Pins -->
        <circle cx="${p0.x}" cy="${p0.y}" r="3" fill="#DC2626" />
        <circle cx="${p1.x}" cy="${p1.y}" r="3" fill="#DC2626" />
        <circle cx="${p2.x}" cy="${p2.y}" r="3" fill="#DC2626" />
        <circle cx="${p3.x}" cy="${p3.y}" r="3" fill="#DC2626" />

        <!-- Center Text: TOTAL PLOT AREA in Bold Blue (matching reference image) -->
        <g transform="translate(${cx}, ${cy})">
          <text x="0" y="-8" text-anchor="middle" font-size="15" font-weight="800" fill="#1E3A8A" font-family="'Courier New', Courier, monospace" letter-spacing="0.5">
            TOTAL PLOT AREA=${geom.areaSqft.toFixed(3)} SQ FT
          </text>
          <text x="0" y="14" text-anchor="middle" font-size="14" font-weight="800" fill="#1E3A8A" font-family="'Courier New', Courier, monospace" letter-spacing="0.5">
            =${geom.areaGaj.toFixed(2)} SQ YARD
          </text>
        </g>
      </svg>
    `;
  }

  /**
   * Generate High-Quality Architectural Vector PDF using jsPDF
   */
  static generatePlotPDF(geom, plotInfo = {}, regionalText = '') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageW = 210;
    const pageH = 297;
    const margin = 12;

    // 1. Outer Sheet Border Frame (Double line architectural style)
    doc.setDrawColor(15, 23, 42); // slate-900
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.rect(margin + 2, margin + 2, pageW - (margin + 2) * 2, pageH - (margin + 2) * 2);

    // 2. Top Title Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('ZAMEEN NAKSHA & PLOT AREA REPORT', pageW / 2, margin + 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('State-Aware Revenue Verified Standards • 1 Gaj = 9 Sq Ft • Professional Land Survey', pageW / 2, margin + 15, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin + 5, margin + 18, pageW - margin - 5, margin + 18);

    // 3. Metadata Header Info Box
    const metaY = margin + 22;
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    const ownerName = plotInfo.ownerName || 'Standard Client / Plot Measurement';
    const location = plotInfo.location || 'Site Survey';
    const dateStr = plotInfo.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    doc.setFont('helvetica', 'bold');
    doc.text('Plot / Owner:', margin + 6, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(ownerName, margin + 30, metaY);

    doc.setFont('helvetica', 'bold');
    doc.text('Location / Khasra:', margin + 6, metaY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(location, margin + 38, metaY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', pageW - margin - 35, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, pageW - margin - 24, metaY);

    // 4. North Arrow in Top Right
    const compassX = pageW - margin - 15;
    const compassY = margin + 38;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.circle(compassX, compassY, 6);
    
    // North pointer
    doc.setFillColor(220, 38, 38);
    doc.triangle(compassX, compassY - 5, compassX - 2, compassY + 1, compassX + 2, compassY + 1, 'F');
    doc.setFillColor(100, 116, 139);
    doc.triangle(compassX, compassY + 5, compassX - 2, compassY - 1, compassX + 2, compassY - 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('N', compassX, compassY - 7, { align: 'center' });

    // 5. Draw CAD Plot inside dedicated canvas box
    // Drawing Box: X: margin + 10 to pageW - margin - 10, Y: metaY + 12 to metaY + 160
    const drawBox = {
      x: margin + 15,
      y: metaY + 12,
      w: pageW - (margin + 15) * 2,
      h: 135
    };

    const bounds = geom.bounds;
    const drawMargin = 18; // mm for dimension lines and arrows
    const scaleX = (drawBox.w - drawMargin * 2) / (bounds.width || 1);
    const scaleY = (drawBox.h - drawMargin * 2) / (bounds.height || 1);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = drawBox.x + (drawBox.w - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = drawBox.y + (drawBox.h - bounds.height * scale) / 2 - bounds.minY * scale;

    const toPdf = (pt) => ({
      x: pt.x * scale + offsetX,
      y: pt.y * scale + offsetY
    });

    const pts = geom.points.map(toPdf);
    const [p0, p1, p2, p3] = pts;

    // Plot boundary polygon (Thin Red Line matching reference image)
    doc.setDrawColor(220, 38, 38); // red-600
    doc.setLineWidth(0.5);
    doc.setFillColor(254, 242, 242); // very light red tint
    
    // Draw polygon
    doc.lines(
      [
        [p1.x - p0.x, p1.y - p0.y],
        [p2.x - p1.x, p2.y - p1.y],
        [p3.x - p2.x, p3.y - p2.y],
        [p0.x - p3.x, p0.y - p3.y]
      ],
      p0.x,
      p0.y,
      [1.0, 1.0],
      'FD',
      true
    );

    // Dimension offset in mm
    const dOffset = 7;

    // Top Dimension Line (Horizontal above P0-P1)
    const topY = Math.min(p0.y, p1.y) - dOffset;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(p0.x, topY, p1.x, topY);
    // Arrows
    this._drawArrow(doc, p0.x, topY, 'right');
    this._drawArrow(doc, p1.x, topY, 'left');
    // Dimension Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const topLabel = `${geom.sides.top.display}${plotInfo.roadLabel ? ' (' + plotInfo.roadLabel + ')' : ''}`;
    doc.text(topLabel, (p0.x + p1.x) / 2, topY - 2, { align: 'center' });

    // Bottom Dimension Line (below P3-P2)
    const botY = Math.max(p2.y, p3.y) + dOffset;
    doc.line(p3.x, botY, p2.x, botY);
    this._drawArrow(doc, p3.x, botY, 'right');
    this._drawArrow(doc, p2.x, botY, 'left');
    const botLabel = `${geom.sides.bottom.display}${plotInfo.backLabel ? ' (' + plotInfo.backLabel + ')' : ''}`;
    doc.text(botLabel, (p3.x + p2.x) / 2, botY + 4, { align: 'center' });

    // Left Dimension Line (left of P0-P3)
    const leftX = Math.min(p0.x, p3.x) - dOffset;
    doc.line(leftX, p0.y, leftX, p3.y);
    this._drawArrow(doc, leftX, p0.y, 'down');
    this._drawArrow(doc, leftX, p3.y, 'up');
    const leftLabel = `${geom.sides.left.display}${plotInfo.galiLabel ? ' (' + plotInfo.galiLabel + ')' : ''}`;
    doc.text(leftLabel, leftX - 2, (p0.y + p3.y) / 2, { align: 'center', angle: 90 });

    // Right Dimension Line (right of P1-P2)
    const rightX = Math.max(p1.x, p2.x) + dOffset;
    doc.line(rightX, p1.y, rightX, p2.y);
    this._drawArrow(doc, rightX, p1.y, 'down');
    this._drawArrow(doc, rightX, p2.y, 'up');
    const rightLabel = `${geom.sides.right.display}${plotInfo.rightLabel ? ' (' + plotInfo.rightLabel + ')' : ''}`;
    doc.text(rightLabel, rightX + 4, (p1.y + p2.y) / 2, { align: 'center', angle: 270 });

    // Center Blue Area Box inside Plot (exact match to image)
    const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
    const cy = (p0.y + p1.y + p2.y + p3.y) / 4;

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text(`TOTAL PLOT AREA=${geom.areaSqft.toFixed(3)} SQ FT`, cx, cy - 2, { align: 'center' });
    doc.text(`=${geom.areaGaj.toFixed(2)} SQ YARD`, cx, cy + 3.5, { align: 'center' });

    if (regionalText) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(59, 130, 246);
      doc.text(`(${regionalText})`, cx, cy + 8, { align: 'center' });
    }

    // 6. Detailed Measurement & Unit Breakdown Tables at Bottom
    const tableY = drawBox.y + drawBox.h + 10;

    // Left Table: Side Dimensions
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + 5, tableY, 85, 45, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('SIDE DIMENSIONS (ਮਾਪ)', margin + 8, tableY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    const rowH = 7.5;
    const sidesList = [
      { name: 'Side A (Front / Road):', val: geom.sides.top.display, dec: `${geom.sides.top.decimal.toFixed(2)} ft` },
      { name: 'Side B (Right):', val: geom.sides.right.display, dec: `${geom.sides.right.decimal.toFixed(2)} ft` },
      { name: 'Side C (Back):', val: geom.sides.bottom.display, dec: `${geom.sides.bottom.decimal.toFixed(2)} ft` },
      { name: 'Side D (Left / Gali):', val: geom.sides.left.display, dec: `${geom.sides.left.decimal.toFixed(2)} ft` }
    ];

    sidesList.forEach((s, idx) => {
      const y = tableY + 14 + idx * rowH;
      doc.text(s.name, margin + 8, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.val}  (${s.dec})`, margin + 80, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    });

    // Right Table: Converted Area in Standard Units
    const rTableX = pageW - margin - 90;
    doc.setFillColor(248, 250, 252);
    doc.rect(rTableX, tableY, 85, 45, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('AREA SUMMARY (ਕੁੱਲ ਰਕਬਾ)', rTableX + 3, tableY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    const areaList = [
      { label: 'Square Feet (ਵਰਗ ਫੁੱਟ):', val: `${geom.areaSqft.toLocaleString('en-IN', { maximumFractionDigits: 3 })} sq ft` },
      { label: 'Gaj / Sq Yard (ਵਰਗ ਗਜ਼):', val: `${geom.areaGaj.toFixed(2)} Gaj` },
      { label: 'Square Metres (ਵਰਗ ਮੀਟਰ):', val: `${geom.areaSqm.toFixed(2)} sq m` },
      { label: 'Acre (ਇੱਕੜ):', val: `${geom.areaAcre.toFixed(4)} Acre` }
    ];

    areaList.forEach((a, idx) => {
      const y = tableY + 14 + idx * rowH;
      doc.text(a.label, rTableX + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.text(a.val, rTableX + 82, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    });

    // 7. Footer Official Stamp & Disclaimer
    const footerY = pageH - margin - 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Calculated using official state revenue conversion matrices. Generated via Zameen Converter App.', pageW / 2, footerY, { align: 'center' });
    doc.text('Note: For legal mutation & registry, verify with your Tehsil / Patwari revenue record.', pageW / 2, footerY + 3.5, { align: 'center' });

    return doc;
  }

  /**
   * Helper to draw solid dimension arrows in jsPDF
   */
  static _drawArrow(doc, x, y, direction) {
    const s = 1.5; // arrow size mm
    doc.setFillColor(0, 0, 0);
    if (direction === 'right') {
      doc.triangle(x, y, x + s * 2, y - s, x + s * 2, y + s, 'F');
    } else if (direction === 'left') {
      doc.triangle(x, y, x - s * 2, y - s, x - s * 2, y + s, 'F');
    } else if (direction === 'up') {
      doc.triangle(x, y, x - s, y + s * 2, x + s, y + s * 2, 'F');
    } else if (direction === 'down') {
      doc.triangle(x, y, x - s, y - s * 2, x + s, y - s * 2, 'F');
    }
  }

  /**
   * Download PDF directly to the device's public Downloads folder
   */
  static async downloadPDF(doc, filename = 'Plot_Naksha_Report.pdf') {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();

      if (isNative) {
        // 1. Primary: Save directly to Android's public Downloads directory via native Downloader plugin
        try {
          const Downloader = registerPlugin('Downloader');
          const result = await Downloader.savePdfToDownloads({
            base64: pdfBase64,
            filename: filename,
            openAfterSave: true
          });
          if (result && result.success) {
            return { success: true, method: 'native_downloads', path: result.path };
          }
        } catch (pluginErr) {
          console.warn('Native Downloader plugin failed, falling back to Filesystem', pluginErr);
        }

        // 2. Secondary: Fallback to Capacitor Filesystem in Documents
        try {
          const writeRes = await Filesystem.writeFile({
            path: filename,
            data: pdfBase64,
            directory: Directory.Documents
          });
          return { success: true, method: 'filesystem_documents', uri: writeRes.uri };
        } catch (fsErr) {
          console.warn('Filesystem.Documents failed, trying ExternalStorage', fsErr);
          const writeRes = await Filesystem.writeFile({
            path: filename,
            data: pdfBase64,
            directory: Directory.ExternalStorage
          });
          return { success: true, method: 'filesystem_external', uri: writeRes.uri };
        }
      } else {
        // Standard Web Browser Download
        doc.save(filename);
        return { success: true, method: 'browser_download' };
      }
    } catch (err) {
      console.warn('Download PDF failed, fallback to doc.save', err);
      doc.save(filename);
      return { success: true, method: 'browser_fallback' };
    }
  }

  /**
   * Share PDF via WhatsApp, Email, Drive, etc.
   */
  static async sharePDF(doc, filename = 'Plot_Naksha_Report.pdf') {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();

      if (isNative) {
        // Write to Cache so it can be shared safely via FileProvider
        const result = await Filesystem.writeFile({
          path: filename,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Plot Naksha & Area Report',
          text: 'Here is the Plot Measurement & Naksha PDF report.',
          url: result.uri,
          dialogTitle: 'Share Plot PDF via'
        });
        return { success: true, method: 'native_share', uri: result.uri };
      } else {
        // Web share API if supported
        if (navigator.share && navigator.canShare) {
          const blob = doc.output('blob');
          const file = new File([blob], filename, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Plot Naksha & Area Report',
              files: [file]
            });
            return { success: true, method: 'web_share' };
          }
        }
        // Fallback to downloading
        doc.save(filename);
        return { success: true, method: 'browser_download' };
      }
    } catch (err) {
      console.warn('Share PDF failed', err);
      return { success: false, error: err };
    }
  }

  /**
   * Backward-compatible export method
   */
  static async exportPDF(doc, filename = 'Plot_Naksha_Report.pdf', isShare = false) {
    if (isShare) {
      return this.sharePDF(doc, filename);
    } else {
      return this.downloadPDF(doc, filename);
    }
  }
}

