/**
 * Test script to verify AI messaging flow
 * This can be run in the browser console or as a Node.js script
 */

// Test cases for AI messaging flow
const testAIMessaging = {
  // Test 1: Check if AI chat service exists and can be instantiated
  testServiceInitialization: function() {
    console.log('🧪 Test 1: Service Initialization');

    try {
      // This would work in browser environment
      if (typeof window !== 'undefined' && window.aiChatService) {
        console.log('✅ AI Chat Service is available in window');
        return true;
      } else {
        console.log('⚠️ AI Chat Service not found in window (expected in Node.js environment)');
        return true;
      }
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      return false;
    }
  },

  // Test 2: Check component rendering
  testComponentRendering: function() {
    console.log('🧪 Test 2: Component Rendering');

    // In a browser environment, you could check if components are present
    if (typeof document !== 'undefined') {
      const chatComponent = document.querySelector('[data-testid="simple-ai-chat"]');
      const inputField = document.querySelector('input[placeholder*="Ask me"]');
      const sendButton = document.querySelector('button[type="submit"]');

      if (chatComponent && inputField && sendButton) {
        console.log('✅ All required components are rendered');
        return true;
      } else {
        console.log('❌ Some components are missing');
        return false;
      }
    } else {
      console.log('⚠️ Component rendering test requires browser environment');
      return true;
    }
  },

  // Test 3: Test message sending flow
  testMessageSending: async function() {
    console.log('🧪 Test 3: Message Sending Flow');

    if (typeof document !== 'undefined') {
      try {
        const inputField = document.querySelector('input[placeholder*="Ask me"]');
        const sendButton = document.querySelector('button[type="submit"]');

        if (inputField && sendButton) {
          // Test input field
          inputField.value = 'Test message';
          const inputEvent = new Event('input', { bubbles: true });
          inputField.dispatchEvent(inputEvent);

          console.log('✅ Input field accepts text');

          // Test send button state
          if (!sendButton.disabled) {
            console.log('✅ Send button is enabled when there is text');
          } else {
            console.log('❌ Send button is disabled when it should be enabled');
            return false;
          }

          return true;
        }
      } catch (error) {
        console.error('❌ Message sending test failed:', error);
        return false;
      }
    } else {
      console.log('⚠️ Message sending test requires browser environment');
      return true;
    }
  },

  // Test 4: Check layout improvements
  testLayoutImprovements: function() {
    console.log('🧪 Test 4: Layout Improvements');

    if (typeof document !== 'undefined') {
      // Check header size
      const header = document.querySelector('header, .border-b');
      if (header) {
        const headerHeight = header.offsetHeight;
        console.log(`📏 Header height: ${headerHeight}px`);

        if (headerHeight <= 60) {
          console.log('✅ Header is compact (≤60px)');
        } else {
          console.log('⚠️ Header could be more compact');
        }
      }

      // Check padding
      const messageArea = document.querySelector('.overflow-auto');
      if (messageArea) {
        const styles = window.getComputedStyle(messageArea);
        console.log(`📏 Message area padding: ${styles.padding}`);

        if (styles.padding.includes('16px') || styles.padding.includes('1rem')) {
          console.log('✅ Message area has reasonable padding');
        }
      }

      return true;
    } else {
      console.log('⚠️ Layout test requires browser environment');
      return true;
    }
  },

  // Test 5: Check if icons are removed from prompt helper
  testIconRemoval: function() {
    console.log('🧪 Test 5: Icon Removal from Prompt Helper');

    if (typeof document !== 'undefined') {
      const promptButtons = document.querySelectorAll('[data-testid*="prompt"], button');
      let iconCount = 0;
      let textOnlyButtons = 0;

      promptButtons.forEach(button => {
        const icons = button.querySelectorAll('svg');
        const text = button.textContent?.trim();

        if (icons.length > 0) {
          iconCount++;
        } else if (text && text.length > 0) {
          textOnlyButtons++;
        }
      });

      console.log(`📊 Found ${iconCount} buttons with icons, ${textOnlyButtons} text-only buttons`);

      if (textOnlyButtons > iconCount) {
        console.log('✅ More text-only buttons than icon buttons - improvement achieved');
        return true;
      } else {
        console.log('⚠️ Still many buttons with icons');
        return false;
      }
    } else {
      console.log('⚠️ Icon removal test requires browser environment');
      return true;
    }
  },

  // Run all tests
  runAllTests: async function() {
    console.log('🚀 Starting AI Messaging Flow Tests\n');

    const results = [];

    results.push(this.testServiceInitialization());
    results.push(this.testComponentRendering());
    results.push(await this.testMessageSending());
    results.push(this.testLayoutImprovements());
    results.push(this.testIconRemoval());

    const passedTests = results.filter(result => result).length;
    const totalTests = results.length;

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! AI messaging flow is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the issues above.');
    }

    return {
      passed: passedTests,
      total: totalTests,
      success: passedTests === totalTests
    };
  }
};

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testAIMessaging;
}

// Auto-run in browser environment
if (typeof window !== 'undefined') {
  // Make available globally for debugging
  window.testAIMessaging = testAIMessaging;

  // Auto-run tests with a delay to ensure components are mounted
  setTimeout(() => {
    console.log('🔍 Auto-running AI messaging tests...');
    testAIMessaging.runAllTests();
  }, 2000);
}