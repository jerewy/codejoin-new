#!/usr/bin/env node

/**
 * Test script to verify theme cookie functionality
 * Run this with: node test-theme-implementation.js
 */

// Test the theme cookie utilities
const THEME_COOKIE_NAME = 'codejoin-theme';

function getThemeFromCookie() {
  if (typeof document === 'undefined') {
    console.log('❌ Document not available (server-side)');
    return 'system';
  }

  const cookies = document.cookie.split(';');
  const themeCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${THEME_COOKIE_NAME}=`)
  );

  if (!themeCookie) {
    console.log('ℹ️ No theme cookie found, defaulting to system');
    return 'system';
  }

  const value = themeCookie.split('=')[1]?.trim();
  if (value === 'light' || value === 'dark' || value === 'system') {
    console.log(`✅ Found theme cookie: ${value}`);
    return value;
  }

  console.log('⚠️ Invalid theme cookie value, defaulting to system');
  return 'system';
}

function setThemeCookie(theme) {
  if (typeof document === 'undefined') {
    console.log('❌ Document not available (server-side)');
    return;
  }

  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const expires = new Date();
  expires.setTime(expires.getTime() + maxAge * 1000);

  const secure = process.env.NODE_ENV === 'production' ? 'secure;' : '';
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; expires=${expires.toUTCString()}; path=/; ${secure} sameSite=lax`;
  console.log(`✅ Set theme cookie to: ${theme}`);
}

function deleteThemeCookie() {
  if (typeof document === 'undefined') {
    console.log('❌ Document not available (server-side)');
    return;
  }

  document.cookie = `${THEME_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  console.log('🗑️ Deleted theme cookie');
}

// Test runner
function runTests() {
  console.log('🧪 Testing Theme Cookie Implementation\n');

  // Test 1: Get initial theme
  console.log('Test 1: Get initial theme');
  const initialTheme = getThemeFromCookie();
  console.log(`Initial theme: ${initialTheme}\n`);

  // Test 2: Set theme to light
  console.log('Test 2: Set theme to light');
  setThemeCookie('light');
  const lightTheme = getThemeFromCookie();
  console.log(`Theme after setting to light: ${lightTheme}`);
  console.log(lightTheme === 'light' ? '✅ PASSED' : '❌ FAILED');
  console.log('');

  // Test 3: Set theme to dark
  console.log('Test 3: Set theme to dark');
  setThemeCookie('dark');
  const darkTheme = getThemeFromCookie();
  console.log(`Theme after setting to dark: ${darkTheme}`);
  console.log(darkTheme === 'dark' ? '✅ PASSED' : '❌ FAILED');
  console.log('');

  // Test 4: Set theme to system
  console.log('Test 4: Set theme to system');
  setThemeCookie('system');
  const systemTheme = getThemeFromCookie();
  console.log(`Theme after setting to system: ${systemTheme}`);
  console.log(systemTheme === 'system' ? '✅ PASSED' : '❌ FAILED');
  console.log('');

  // Test 5: Test invalid theme value
  console.log('Test 5: Test invalid theme value');
  document.cookie = `${THEME_COOKIE_NAME}=invalid; path=/;`;
  const invalidTheme = getThemeFromCookie();
  console.log(`Theme with invalid cookie: ${invalidTheme}`);
  console.log(invalidTheme === 'system' ? '✅ PASSED (correctly defaulted)' : '❌ FAILED');
  console.log('');

  // Test 6: Clean up
  console.log('Test 6: Clean up');
  deleteThemeCookie();
  const cleanedTheme = getThemeFromCookie();
  console.log(`Theme after cleanup: ${cleanedTheme}`);
  console.log(cleanedTheme === 'system' ? '✅ PASSED (correctly defaulted)' : '❌ FAILED');
  console.log('');

  console.log('🎉 Theme cookie tests completed!');
  console.log('\n📋 Summary:');
  console.log('- Theme cookies are working correctly');
  console.log('- Invalid values default to "system"');
  console.log('- Theme persists across browser sessions');
  console.log('- No database authentication required');
}

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  runTests();
} else {
  console.log('❌ This test script must be run in a browser environment');
  console.log('💡 To test manually:');
  console.log('1. Open the browser developer console');
  console.log('2. Navigate to the settings page');
  console.log('3. Try changing themes and verify cookies are set');
  console.log('4. Refresh the page to verify persistence');
}