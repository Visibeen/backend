/**
 * Test Phone Number Formatting
 * Run: node test-phone-format.js
 */

// Simulate the formatPhoneNumber function
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Remove all non-numeric characters except leading +
  let formatted = phoneNumber.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1);
  }
  
  // Remove leading 0 from Indian numbers (09418245371 -> 9418245371)
  if (formatted.startsWith('0') && formatted.length === 11) {
    formatted = formatted.substring(1); // Remove leading 0
  }
  
  // Ensure it has country code (if it doesn't start with country code, assume India +91)
  if (formatted.length === 10) {
    formatted = '91' + formatted; // Add India country code
  }
  
  // Handle case where number already has 91 but with leading 0 (9109418245371)
  if (formatted.startsWith('910') && formatted.length === 13) {
    formatted = '91' + formatted.substring(3); // Remove the 0 after 91
  }
  
  return formatted;
}

// Test cases
const testCases = [
  { input: '09418245371', expected: '919418245371', description: 'Indian number with leading 0' },
  { input: '9418245371', expected: '919418245371', description: 'Indian number without country code' },
  { input: '+919418245371', expected: '919418245371', description: 'Indian number with +91' },
  { input: '919418245371', expected: '919418245371', description: 'Indian number with 91' },
  { input: '+91 9418245371', expected: '919418245371', description: 'Indian number with +91 and space' },
  { input: '0 9418245371', expected: '919418245371', description: 'Indian number with 0 and space' },
  { input: '9876543210', expected: '919876543210', description: 'Another Indian number' },
  { input: '09876543210', expected: '919876543210', description: 'Another Indian number with 0' },
  { input: '+91-9418-245-371', expected: '919418245371', description: 'Indian number with dashes' },
  { input: '(0)9418245371', expected: '919418245371', description: 'Indian number with parentheses' }
];

console.log('\n📱 Phone Number Formatting Tests\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = formatPhoneNumber(test.input);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`\nTest ${index + 1}: ${test.description}`);
  console.log(`Input:    "${test.input}"`);
  console.log(`Expected: "${test.expected}"`);
  console.log(`Result:   "${result}"`);
  console.log(`Status:   ${status}`);
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Summary: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
  console.log('🎉 All tests passed! Phone number formatting is working correctly.\n');
} else {
  console.log('⚠️  Some tests failed. Please review the formatting logic.\n');
}
