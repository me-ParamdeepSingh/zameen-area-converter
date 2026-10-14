import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LandConverter } from '../js/converter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawData = fs.readFileSync(path.join(__dirname, '../data/units.json'), 'utf8');
const unitsData = JSON.parse(rawData);
const converter = new LandConverter(unitsData);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertClose(actual, expected, tolerance = 0.001, message = '') {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tolerance;
  assert(ok, `${message} (Expected ~${expected}, got ${actual}, diff ${diff.toFixed(6)})`);
}

console.log('\n--- Test Suite 1: Spec Section 6.2 Universal Values ---');
assertClose(converter.getUnitMultiplier('acre', 'punjab'), 43560, 0.001, '1 Acre must be 43,560 sq ft');
assertClose(converter.getUnitMultiplier('gaj', 'punjab'), 9, 0.001, '1 Gaj (Sq Yard) must be 9 sq ft');
assertClose(converter.getUnitMultiplier('sqm', 'punjab'), 10.76391, 0.01, '1 Sq Metre must be ~10.7639 sq ft');
assertClose(converter.getUnitMultiplier('hectare', 'punjab'), 107639.1, 1.0, '1 Hectare must be ~107,639.1 sq ft');

console.log('\n--- Test Suite 2: Spec Section 6.3 North-India Seed Values ---');
// Punjab Kanal / Marla
const kanalSqft = converter.getUnitMultiplier('kanal', 'punjab', 'standard');
const marlaSqft = converter.getUnitMultiplier('marla', 'punjab', 'standard');
assertClose(kanalSqft, 5445, 0.001, '1 Kanal (Punjab) must be 5,445 sq ft');
assertClose(marlaSqft, 272.25, 0.001, '1 Marla (Punjab) must be 272.25 sq ft');
assertClose(kanalSqft / marlaSqft, 20, 0.0001, '1 Kanal must equal 20 Marla');
assertClose(43560 / kanalSqft, 8, 0.0001, '1 Acre must equal 8 Kanal');

// Uttar Pradesh Pucca Bigha & Biswa
const upBigha = converter.getUnitMultiplier('bigha_pucca', 'up', 'pucca');
const upBiswa = converter.getUnitMultiplier('biswa_pucca', 'up', 'pucca');
assertClose(upBigha, 27225, 0.001, 'UP Pucca Bigha must be 27,225 sq ft');
assertClose(upBiswa, 1361.25, 0.001, 'UP Biswa must be 1,361.25 sq ft');
assertClose(upBigha / upBiswa, 20, 0.0001, 'UP Pucca Bigha must equal 20 Biswa');

// Variants testing
console.log('\n--- Test Suite 3: State Variants Handling ---');
// UP Kachha Bigha
const upKachhaBigha = converter.getUnitMultiplier('bigha_kachha', 'up', 'kachha');
assertClose(upKachhaBigha, 9075, 0.001, 'UP Kachha Bigha must be 9,075 sq ft (1/3 of Pucca Bigha)');
assertClose(upBigha / upKachhaBigha, 3, 0.0001, 'UP Pucca Bigha must be exactly 3× Kachha Bigha');

// Punjab Old Marla
const punjabOldMarla = converter.getUnitMultiplier('marla_old', 'punjab', 'old_settlement');
assertClose(punjabOldMarla, 225, 0.001, 'Punjab Old Settlement Marla must be 225 sq ft');

// Rajasthan Pucca vs Kachha Bigha
const rajPucca = converter.getUnitMultiplier('bigha_pucca_raj', 'rajasthan', 'pucca');
const rajKachha = converter.getUnitMultiplier('bigha_kachha_raj', 'rajasthan', 'kachha');
assertClose(rajPucca, 27225, 0.001, 'Rajasthan Pucca Bigha must be 27,225 sq ft');
assertClose(rajKachha, 17424, 0.001, 'Rajasthan Kachha Bigha must be 17,424 sq ft');

console.log('\n--- Test Suite 4: Conversion Round-Trip Accuracy (A -> B -> A) ---');
const testUnits = [
  { id: 'acre', region: 'punjab' },
  { id: 'kanal', region: 'punjab' },
  { id: 'marla', region: 'punjab' },
  { id: 'gaj', region: 'punjab' },
  { id: 'bigha_pucca', region: 'up' },
  { id: 'biswa_pucca', region: 'up' },
  { id: 'sqft', region: 'punjab' },
  { id: 'sqm', region: 'punjab' }
];

const testVal = 13.5;
for (let i = 0; i < testUnits.length; i++) {
  for (let j = 0; j < testUnits.length; j++) {
    const uA = testUnits[i];
    const uB = testUnits[j];
    const converted = converter.convert(testVal, uA.id, uA.region, uB.id, uB.region);
    const roundTrip = converter.convert(converted, uB.id, uB.region, uA.id, uA.region);
    assertClose(roundTrip, testVal, 0.0001, `Round trip ${uA.id} -> ${uB.id} -> ${uA.id}`);
  }
}

console.log('\n--- Test Suite 5: Indian Number and Currency Formatting ---');
assert(converter.formatNumber(1000) === '1,000', 'Format 1000 -> 1,000');
assert(converter.formatNumber(100000) === '1,00,000', 'Format 100000 -> 1,00,000 (1 Lakh)');
assert(converter.formatNumber(10000000) === '1,00,00,000', 'Format 10000000 -> 1,00,00,000 (1 Crore)');
assert(converter.formatNumber(14520500.5) === '1,45,20,500.5', 'Format 14520500.5 -> 1,45,20,500.5');
assert(converter.formatCurrency(1250000) === '₹ 12,50,000', 'Format currency ₹ 12,50,000');
assert(converter.toIndianWords(15000000, 'en').includes('Crore'), 'Words format includes Crore');
assert(converter.toIndianWords(500000, 'hi').includes('लाख'), 'Hindi words format includes लाख');

console.log('\n--- Test Suite 6: Plot Area Engine ---');
// Rectangle: 60 ft x 30 ft = 1800 sq ft (200 sq yards / Gaj)
const rectArea = converter.calculatePlotArea({
  shape: 'rectangle',
  inputUnit: 'feet',
  length: 60,
  width: 30
});
assertClose(rectArea, 1800, 0.001, 'Rectangle 60ft x 30ft = 1800 sq ft');

// Rectangle in Yards: 20 yd x 10 yd = 60 ft x 30 ft = 1800 sq ft
const rectYardsArea = converter.calculatePlotArea({
  shape: 'rectangle',
  inputUnit: 'yards',
  length: 20,
  width: 10
});
assertClose(rectYardsArea, 1800, 0.001, 'Rectangle 20yd x 10yd in yards = 1800 sq ft');

// Triangle: 3, 4, 5 (right triangle area = 6 sq ft)
const triArea = converter.calculatePlotArea({
  shape: 'triangle',
  inputUnit: 'feet',
  sideA: 3,
  sideB: 4,
  sideC: 5
});
assertClose(triArea, 6, 0.001, 'Triangle (3, 4, 5) area = 6 sq ft');

// Irregular 4-sided Plot: two right triangles sharing diagonal 5
// Triangle 1: (3, 4, 5) -> area 6
// Triangle 2: (5, 12, 13) -> area 30
// Total area = 36 sq ft
const irregArea = converter.calculatePlotArea({
  shape: 'irregular4',
  inputUnit: 'feet',
  sideA: 3,
  sideB: 4,
  sideC: 12,
  sideD: 13,
  diagonal: 5
});
assertClose(irregArea, 36, 0.001, 'Irregular 4-sided plot triangulation area = 36 sq ft');

console.log('\n--- Test Suite 7: Plot Price Engine ---');
// Direct: 200 Gaj @ ₹15,000 / Gaj = ₹30,00,000 (30 Lakh)
const priceDirect = converter.calculatePlotPrice({
  mode: 'direct',
  area: 200,
  rate: 15000,
  unitId: 'gaj',
  regionId: 'punjab'
});
assert(priceDirect.totalPrice === 3000000, 'Plot price direct calculation: ₹30,00,000');

// Reverse: Total ₹30,00,000 for 1800 sq ft -> Rate per Gaj should be ₹15,000
const priceReverse = converter.calculatePlotPrice({
  mode: 'reverse',
  area: 1800,
  unitId: 'sqft',
  regionId: 'punjab',
  totalPrice: 3000000
});
const gajRate = priceReverse.rates.find(r => r.unitId === 'gaj');
assertClose(gajRate.rate, 15000, 0.01, 'Reverse price calculation gives ₹15,000/Gaj');

console.log(`\n========================================`);
console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
