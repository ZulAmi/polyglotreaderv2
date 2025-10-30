// Chrome AI Storage Diagnostic Tool
// Run this in Chrome DevTools Console to diagnose storage issues

console.log('🔍 Chrome AI Storage Diagnostic Starting...');

async function diagnoseAIStorage() {
  console.log('\n=== CHROME AI STORAGE DIAGNOSTIC ===\n');
  
  // 1. Chrome Version Check
  const userAgent = navigator.userAgent;
  const chromeVersion = userAgent.match(/Chrome\/(\d+)/)?.[1];
  console.log(`🌐 Chrome Version: ${chromeVersion || 'Unknown'}`);
  console.log(`   Required: 138+ (${parseInt(chromeVersion) >= 138 ? '✅ OK' : '❌ Too Old'})`);
  
  // 2. Storage API Check
  console.log('\n💾 Storage Analysis:');
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = Math.round((estimate.usage || 0) / 1024 / 1024);
      const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
      const availableMB = quotaMB - usedMB;
      const requiredMB = 22 * 1024; // 22GB
      
      console.log(`   Used: ${usedMB}MB (${(usedMB / 1024).toFixed(1)}GB)`);
      console.log(`   Total Quota: ${quotaMB}MB (${(quotaMB / 1024).toFixed(1)}GB)`);
      console.log(`   Available: ${availableMB}MB (${(availableMB / 1024).toFixed(1)}GB)`);
      console.log(`   Required: ${requiredMB}MB (22GB)`);
      console.log(`   Sufficient: ${availableMB >= requiredMB ? '✅ Yes' : '❌ No'}`);
      
      if (quotaMB < requiredMB) {
        console.log(`   ⚠️  ISSUE: Chrome profile drive total capacity (${(quotaMB / 1024).toFixed(1)}GB) is less than required (22GB)`);
        console.log(`   💡 SOLUTION: Move Chrome profile to a larger drive`);
      } else if (availableMB < requiredMB) {
        console.log(`   ⚠️  ISSUE: Not enough free space (need ${((requiredMB - availableMB) / 1024).toFixed(1)}GB more)`);
        console.log(`   💡 SOLUTION: Free up ${Math.ceil((requiredMB - availableMB) / 1024)}GB space`);
      }
    } catch (e) {
      console.log(`   ❌ Error checking storage: ${e.message}`);
    }
  } else {
    console.log('   ❌ Storage API not available');
  }
  
  // 3. AI API Availability
  console.log('\n🤖 AI API Availability:');
  console.log(`   Summarizer (new): ${window.Summarizer ? '✅ Available' : '❌ Not found'}`);
  console.log(`   Translator (new): ${window.Translator ? '✅ Available' : '❌ Not found'}`);
  console.log(`   LanguageModel (new): ${window.LanguageModel ? '✅ Available' : '❌ Not found'}`);
  console.log(`   Legacy AI APIs: ${window.ai ? '✅ Available' : '❌ Not found'}`);
  
  // 4. Check if models are already downloaded
  console.log('\n📦 AI Model Status:');
  try {
    if (window.Summarizer?.availability) {
      const summarizerAvail = await window.Summarizer.availability();
      console.log(`   Summarizer: ${summarizerAvail}`);
    }
    if (window.Translator?.availability) {
      const translatorAvail = await window.Translator.availability();
      console.log(`   Translator: ${translatorAvail}`);
    }
    if (window.LanguageModel?.availability) {
      const lmAvail = await window.LanguageModel.availability();
      console.log(`   LanguageModel: ${lmAvail}`);
    }
  } catch (e) {
    console.log(`   Error checking availability: ${e.message}`);
  }
  
  // 5. Chrome Profile Location Hints
  console.log('\n📁 Chrome Profile Information:');
  console.log('   To find your Chrome profile location:');
  console.log('   • Type: chrome://version/ in address bar');
  console.log('   • Look for "Profile Path"');
  console.log('   • AI models are stored in this location');
  
  // 6. Recommendations
  console.log('\n💡 Recommendations:');
  
  if (parseInt(chromeVersion) < 138) {
    console.log('   1. ❌ Update to Chrome 138+ for stable AI APIs');
  } else {
    console.log('   1. ✅ Chrome version is compatible');
  }
  
  console.log('   2. 🔍 Check Chrome profile location at chrome://version/');
  console.log('   3. 💾 Ensure the drive containing your Chrome profile has 22GB+ free');
  console.log('   4. 🔄 After freeing space, restart Chrome completely');
  console.log('   5. 🧪 Test with extension after restart');
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

// Run the diagnostic
diagnoseAIStorage().catch(console.error);

// Also provide manual commands
console.log('\n🛠️  Manual Commands:');
console.log('// Check storage manually:');
console.log('navigator.storage.estimate().then(e => console.log(`Used: ${Math.round(e.usage/1024/1024)}MB, Quota: ${Math.round(e.quota/1024/1024)}MB`))');
console.log('\n// Check AI API availability:');
console.log('console.log({Summarizer: !!window.Summarizer, Translator: !!window.Translator, ai: !!window.ai})');