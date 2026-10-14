import { NakshaManager } from '../js/naksha-pdf.js';

const top = NakshaManager.parseDimension('35.11', true);
const right = NakshaManager.parseDimension('64', true);
const bottom = NakshaManager.parseDimension('38', true);
const left = NakshaManager.parseDimension('56.3', true);

console.log('Parsed Top:', top);
console.log('Parsed Right:', right);
console.log('Parsed Bottom:', bottom);
console.log('Parsed Left:', left);

const geom = NakshaManager.computePlotGeometry({ top, right, bottom, left });
console.log('Computed Geometry Area Sqft:', geom.areaSqft);
console.log('Computed Area Gaj:', geom.areaGaj);

const svg = NakshaManager.renderCADSvg(geom);
console.log('SVG length:', svg.length);

const doc = NakshaManager.generatePlotPDF(geom, {
  ownerName: 'Test Plot Ludhiana',
  location: 'Model Town',
  roadLabel: 'ROAD',
  galiLabel: 'GALI',
  backLabel: 'BACK'
}, 'Punjab: 8.8 Marla');

const pdfData = doc.output('datauristring');
console.log('PDF Generated successfully! Length:', pdfData.length);
