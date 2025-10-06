# Docker Connection Fix Verification

This script tests the Docker connection fixes to ensure error logging is properly rate limited and doesn't cause infinite loops.

const DockerService = require('./code-execution-backend/src/services/dockerService');

async function testDockerConnectionFixes() {
  console.log('🧪 Testing Docker connection fixes...\n');

  const dockerService = new DockerService();

  console.log('1. Initial connection test (may fail if Docker is not running):');
  try {
    await dockerService.testConnection();
    console.log('✅ Docker connection successful');
  } catch (error) {
    console.log(`❌ Docker connection failed: ${error.message}`);
    console.log(`   Error code: ${error.code}`);
  }

  console.log('\n2. Checking connection state:');
  const state = dockerService.getConnectionState();
  console.log('Connection state:', {
    isAvailable: state.isAvailable,
    consecutiveFailures: state.consecutiveFailures,
    backoffMs: state.backoffMs,
    lastChecked: state.lastChecked ? new Date(state.lastChecked).toISOString() : null
  });

  console.log('\n3. Rapid connection tests (should be rate limited):');
  const startTime = Date.now();
  let errorCount = 0;

  for (let i = 0; i < 10; i++) {
    try {
      await dockerService.testConnection();
      console.log(`Test ${i + 1}: ✅ Success`);
    } catch (error) {
      errorCount++;
      console.log(`Test ${i + 1}: ❌ ${error.code} - ${error.message}`);
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`\n4. Results after 10 rapid tests:`);
  console.log(`   Total duration: ${duration}ms`);
  console.log(`   Errors encountered: ${errorCount}`);
  console.log(`   Average per test: ${Math.round(duration / 10)}ms`);

  console.log('\n5. Final connection state:');
  const finalState = dockerService.getConnectionState();
  console.log('Final state:', {
    isAvailable: finalState.isAvailable,
    consecutiveFailures: finalState.consecutiveFailures,
    backoffMs: finalState.backoffMs,
    lastChecked: finalState.lastChecked ? new Date(finalState.lastChecked).toISOString() : null
  });

  console.log('\n✅ Test completed. Check the logs to see if error spamming was prevented.');
}

// Only run if this file is executed directly
if (require.main === module) {
  testDockerConnectionFixes().catch(console.error);
}

module.exports = { testDockerConnectionFixes };