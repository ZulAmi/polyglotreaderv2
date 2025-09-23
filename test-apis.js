// Quick test script to check if the extension APIs are working
console.log('🧪 Testing PolyglotReader Extension APIs');
console.log('==========================================');

// Test if new Chrome AI APIs are available
console.log('\n🔍 API Availability Check:');
console.log('window.LanguageModel:', typeof window.LanguageModel);
console.log('window.Translator:', typeof window.Translator);
console.log('window.ai:', typeof window.ai);

// Test Language Model if available
if (window.LanguageModel?.create) {
  console.log('\n🧠 Testing LanguageModel API...');
  window.LanguageModel.create()
    .then(session => {
      console.log('✅ LanguageModel created successfully');
      return session.prompt('Hello, how are you?');
    })
    .then(response => {
      console.log('✅ LanguageModel response:', response);
    })
    .catch(error => {
      console.log('❌ LanguageModel test failed:', error.message);
    });
}

// Test Translator if available
if (window.Translator?.create) {
  console.log('\n🌐 Testing Translator API...');
  window.Translator.create({ sourceLanguage: 'en', targetLanguage: 'es' })
    .then(translator => {
      console.log('✅ Translator created successfully');
      return translator.translate('Hello world');
    })
    .then(result => {
      console.log('✅ Translation result:', result);
    })
    .catch(error => {
      console.log('❌ Translator test failed:', error.message);
    });
}

// Instructions
console.log('\n📋 To test the extension:');
console.log('1. Make sure this script shows ✅ for API creation');
console.log('2. Highlight any text on this page');
console.log('3. Look for the PolyglotReader tooltip to appear');
console.log('4. Try different learning modes in the tooltip');

// Auto-select some text for testing
setTimeout(() => {
  const testText = 'Hello world, this is a test for translation.';
  console.log(`\n🎯 Auto-selecting test text: "${testText}"`);
  
  // Create a temporary element with test text
  const testElement = document.createElement('div');
  testElement.textContent = testText;
  testElement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ffffcc;
    padding: 20px;
    border: 2px solid #ffcc00;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(testElement);
  
  // Auto-select the text
  const range = document.createRange();
  range.selectNodeContents(testElement);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  
  console.log('✅ Test text selected! Look for PolyglotReader tooltip.');
  
  // Remove the test element after 10 seconds
  setTimeout(() => {
    testElement.remove();
    selection.removeAllRanges();
  }, 10000);
}, 2000);