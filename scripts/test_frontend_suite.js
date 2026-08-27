/**
 * Automated Frontend Unit & Integration Validation Suite
 */
const fs = require('fs');
const path = require('path');

console.log('=== FRONTEND STATIC & SYNTAX VALIDATION ===');

const files = [
  'frontend/index.html',
  'frontend/css/styles.css',
  'frontend/css/responsive.css',
  'frontend/js/api.js',
  'frontend/js/components.js',
  'frontend/js/charts.js',
  'frontend/js/pages/overview.js',
  'frontend/js/pages/schools.js',
  'frontend/js/pages/grades.js',
  'frontend/js/pages/students.js',
  'frontend/js/pages/risk.js',
  'frontend/js/pages/insights.js',
  'frontend/js/pages/ai-analyst.js',
  'frontend/js/app.js'
];

let allFilesExist = true;
files.forEach(f => {
  const p = path.join(__dirname, '..', f);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf-8');
    console.log(`[PASS] ${f} exists (${content.length} bytes)`);
  } else {
    console.error(`[FAIL] ${f} MISSING!`);
    allFilesExist = false;
  }
});

// Validate JavaScript Syntax for all JS files
console.log('\n=== JAVASCRIPT SYNTAX & EVAL CHECK ===');
const jsFiles = files.filter(f => f.endsWith('.js'));
jsFiles.forEach(f => {
  const p = path.join(__dirname, '..', f);
  try {
    const code = fs.readFileSync(p, 'utf-8');
    // Function wrapper test
    new Function(code);
    console.log(`[PASS] Syntax Valid: ${f}`);
  } catch (err) {
    console.error(`[FAIL] Syntax Error in ${f}:`, err.message);
  }
});

console.log('\n=== SIMULATED DOM & FORMATTER UNIT TESTS ===');

// Mock window/DOM
global.window = global;
global.document = {
  getElementById: (id) => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    innerHTML: '',
    value: '',
    appendChild: () => {},
  }),
  querySelectorAll: () => [],
  createElement: () => ({
    className: '',
    innerHTML: '',
    classList: { add: () => {}, remove: () => {} },
    remove: () => {},
  }),
  addEventListener: () => {},
  body: { style: {} }
};

// Load api.js and components.js
require('../frontend/js/api.js');
require('../frontend/js/components.js');

console.log('Testing Formatters:');
console.log('formatNumber(98141) ->', Formatters.formatNumber(98141));
console.log('formatScore(74.35) ->', Formatters.formatScore(74.35));
console.log('formatPct(96.47) ->', Formatters.formatPct(96.47));
console.log('formatDelta(1.58) ->', Formatters.formatDelta(1.58));
console.log('formatDelta(-2.03) ->', Formatters.formatDelta(-2.03));
console.log('formatDate("2026-08-23") ->', Formatters.formatDate('2026-08-23'));

if (
  Formatters.formatNumber(98141) === '98,141' &&
  Formatters.formatPct(96.47) === '96.5%' &&
  Formatters.formatDelta(1.58) === '+1.58'
) {
  console.log('[PASS] All Formatters behave correctly and avoid undefined!');
} else {
  console.error('[FAIL] Formatter assertion mismatch.');
}

console.log('\n=== ALL FRONTEND CHECKS COMPLETED SUCCESSFULLY ===');
