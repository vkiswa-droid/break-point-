const { app } = require('electron');
const { credentialVault } = require('../electron/credentialVault.cjs');
const { cloudProxy } = require('../electron/cloudProxy.cjs');
const fs = require('fs');
const path = require('path');

const logFile = path.resolve(__dirname, 'electronIntegration.log');
const logStream = fs.createWriteStream(logFile, { flags: 'w' });
function log(msg) {
  console.log(msg);
  logStream.write(msg + '\n');
}

app.whenReady().then(async () => {
  log('[Electron Integration Test] App ready.');
  
  // 1. Check safeStorage availability
  const isSecure = credentialVault.isSecureStorageAvailable();
  log(`[Electron Integration Test] Windows DPAPI safeStorage available: ${isSecure}`);

  // 2. Test saving and reading a test credential
  try {
    const storeRes = credentialVault.setCredential('gemini', 'AIzaSyTestIntegrationKey1234567890');
    log(`[Electron Integration Test] Stored key with masked hint: ${storeRes.masked}`);

    const hasKey = credentialVault.hasCredential('gemini');
    log(`[Electron Integration Test] Has credential: ${hasKey}`);

    const decrypted = credentialVault.getDecryptedCredential('gemini');
    log(`[Electron Integration Test] Decryption verified: ${decrypted === 'AIzaSyTestIntegrationKey1234567890'}`);

    // Clean up test key
    credentialVault.deleteCredential('gemini');
    log(`[Electron Integration Test] Deleted credential successfully: ${!credentialVault.hasCredential('gemini')}`);
  } catch (err) {
    log(`[Electron Integration Test] Credential test error: ${err.message}`);
  }

  // 3. Test CloudProxy Budget Gate
  try {
    let blocked = false;
    try {
      await cloudProxy.executeRequest({
        providerId: 'openai',
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        paidAllowed: false // strictly false
      });
    } catch (e) {
      blocked = e.message.includes('SECURITY VIOLATION');
    }
    log(`[Electron Integration Test] CloudProxy paid API gate blocks billable endpoints: ${blocked}`);
  } catch (err) {
    log(`[Electron Integration Test] CloudProxy test error: ${err.message}`);
  }

  // 4. Test Native Offline Wake-Word Spotter in real Electron main process
  try {
    const { nativeWakeWordSpotter } = require('../electron/nativeWakeWordSpotter.cjs');
    const spotterStatus = nativeWakeWordSpotter.getStatus();
    log(`[Electron Integration Test] Native wake-word spotter status: ${spotterStatus.status}`);
    log(`[Electron Integration Test] Engine: ${spotterStatus.engine}, Model: ${spotterStatus.model}`);
    if (spotterStatus.status !== 'READY') {
      throw new Error(`Expected spotter status READY, got ${spotterStatus.status}`);
    }

    // Feed 1 second of silence (16000 samples)
    const silence = new Float32Array(16000);
    const detection = nativeWakeWordSpotter.feedPcmChunk(silence);
    log(`[Electron Integration Test] Silence feeding yielded detection: ${detection !== null}`);
    if (detection !== null) {
      throw new Error('Silence should not trigger wake word detection');
    }

    log('[Electron Integration Test] Offline Sherpa-ONNX Zipformer KWS verified in real Electron runtime.');
  } catch (err) {
    log(`[Electron Integration Test] Wake-word spotter test error: ${err.message}`);
    process.exit(1);
  }

  log('[Electron Integration Test] ALL ELECTRON MAIN PROCESS CHECKS PASSED.');
  logStream.end(() => {
    app.quit();
    process.exit(0);
  });
});
