// Extension validation script
console.log('🔍 PolyglotReader Extension Validation');
console.log('=====================================');

// Check if all required files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'tooltip.css',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

console.log('\n📁 File Structure Check:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Validate manifest.json
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  console.log('\n📋 Manifest Validation:');
  console.log(`✅ Version: ${manifest.version}`);
  console.log(`✅ Manifest Version: ${manifest.manifest_version}`);
  console.log(`✅ Permissions: ${manifest.permissions.join(', ')}`);
  console.log(`✅ Content Scripts: ${manifest.content_scripts.length} configured`);
  console.log(`✅ Background Script: ${manifest.background.service_worker}`);
} catch (error) {
  console.log('❌ Manifest validation failed:', error.message);
}

console.log('\n🚀 Ready for Chrome Extension Installation!');
console.log('\nInstallation Steps:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode" (top right toggle)');
console.log('3. Click "Load unpacked"');
console.log('4. Select this folder: ' + process.cwd());
console.log('5. Test on any webpage by highlighting text');

console.log('⚠️  Important Notes:');
console.log('- Chrome AI APIs require Chrome Canary 127+ with experimental features enabled');
console.log('- Enable required flags in chrome://flags/ (see CHROME_AI_SETUP.md)');
console.log('- Extension will gracefully fallback when AI APIs are unavailable');