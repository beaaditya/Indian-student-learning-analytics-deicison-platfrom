/**
 * Syntax & Module Integrity Validator for Frontend Files
 */
const fs = require('fs');
const path = require('path');

const filesToValidate = [
  'frontend/js/api.js',
  'frontend/js/components.js',
  'frontend/js/charts.js',
  'frontend/js/app.js',
  'frontend/js/pages/overview.js',
  'frontend/js/pages/schools.js',
  'frontend/js/pages/grades.js',
  'frontend/js/pages/students.js',
  'frontend/js/pages/risk.js',
  'frontend/js/pages/insights.js',
  'frontend/js/pages/ai-analyst.js'
];

console.log('=== VALIDATING FRONTEND JS SYNTAX ===');
let hasError = false;

filesToValidate.forEach(file => {
  const fullPath = path.resolve(file);
  try {
    const code = fs.readFileSync(fullPath, 'utf8');
    new Function(code);
    console.log(`[PASS] ${file}`);
  } catch (err) {
    console.error(`[FAIL] ${file}: ${err.message}`);
    hasError = true;
  }
});

console.log('=====================================');
if (!hasError) {
  console.log('ALL FRONTEND JS FILES PASSED SYNTAX VALIDATION!');
  process.exit(0);
} else {
  console.error('SYNTAX ERRORS DETECTED!');
  process.exit(1);
}
