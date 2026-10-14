// Test quadrilateral calculation methods
const a = 35 + 11/12; // 35.9167 (Top)
const d = 56 + 3/12;  // 56.25 (Left)
const c = 38;         // Bottom
const b = 64;         // Right

// 1. Average method:
const avgW = (a + c) / 2;
const avgL = (b + d) / 2;
const avgArea = avgW * avgL;

// 2. Brahmagupta (cyclic quad):
const s = (a + b + c + d) / 2;
const cyclicArea = Math.sqrt((s - a) * (s - b) * (s - c) * (s - d));

// 3. Trapezoid with Left and Right as bases or Top/Bottom as bases:
// If Left and Right are roughly vertical:
const h = Math.sqrt(d*d - Math.pow(((c-a)*0.5), 2));

console.log("Average method:", avgArea);
console.log("Cyclic quad:", cyclicArea);
console.log("Target area from image:", 2200.238);

// What diagonal produces 2200.238?
for (let diag = 60; diag < 80; diag += 0.05) {
  // Tri 1: a, d, diag
  if (a + d > diag && a + diag > d && d + diag > a) {
    const s1 = (a + d + diag) / 2;
    const a1 = Math.sqrt(s1 * (s1 - a) * (s1 - d) * (s1 - diag));
    // Tri 2: b, c, diag
    if (b + c > diag && b + diag > c && c + diag > b) {
      const s2 = (b + c + diag) / 2;
      const a2 = Math.sqrt(s2 * (s2 - b) * (s2 - c) * (s2 - diag));
      const tot = a1 + a2;
      if (Math.abs(tot - 2200.238) < 1.0) {
        console.log(`Matching diagonal ${diag.toFixed(2)} ft gives area ${tot.toFixed(3)} sq ft`);
        break;
      }
    }
  }
}
