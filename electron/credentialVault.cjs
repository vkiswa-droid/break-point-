const { safeStorage, app } = require('electron');
const path = require('path');
const fs = require('fs');

const ALLOWED_PROVIDERS = ['gemini', 'openai', 'anthropic', 'groq', 'ollama', 'mock'];

class CredentialVault {
  constructor() {
    this.vaultPath = null;
    this.cachedEntries = null;
  }

  getStoragePath() {
    if (!this.vaultPath) {
      const userData = app.getPath('userData');
      const dir = path.join(userData, 'vault');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.vaultPath = path.join(dir, 'credentials.enc.json');
    }
    return this.vaultPath;
  }

  isSecureStorageAvailable() {
    return safeStorage.isEncryptionAvailable();
  }

  loadRawEntries() {
    if (this.cachedEntries) return this.cachedEntries;
    try {
      const filePath = this.getStoragePath();
      if (!fs.existsSync(filePath)) {
        this.cachedEntries = {};
        return this.cachedEntries;
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      this.cachedEntries = JSON.parse(data);
      return this.cachedEntries;
    } catch (e) {
      console.warn('[CredentialVault] Failed reading encrypted credentials:', e);
      this.cachedEntries = {};
      return this.cachedEntries;
    }
  }

  saveRawEntries() {
    try {
      const filePath = this.getStoragePath();
      fs.writeFileSync(filePath, JSON.stringify(this.cachedEntries, null, 2), 'utf-8');
    } catch (e) {
      console.error('[CredentialVault] Failed saving encrypted credentials:', e);
    }
  }

  setCredential(providerId, plainKey) {
    if (!ALLOWED_PROVIDERS.includes(providerId)) {
      throw new Error(`Invalid provider id "${providerId}". Must be in allowlist.`);
    }

    if (!this.isSecureStorageAvailable()) {
      throw new Error(
        'Windows DPAPI secure storage is not available in the current environment. Plaintext storage is blocked for security.'
      );
    }

    if (!plainKey || typeof plainKey !== 'string' || !plainKey.trim()) {
      throw new Error('API key must be a non-empty string.');
    }

    const trimmed = plainKey.trim();
    const encryptedBuffer = safeStorage.encryptString(trimmed);
    const hex = encryptedBuffer.toString('hex');

    // Create safe masked preview (e.g. ••••••••1234)
    const suffix = trimmed.length > 4 ? trimmed.slice(-4) : '••••';
    const masked = `••••••••${suffix}`;

    const entries = this.loadRawEntries();
    entries[providerId] = {
      cipher: hex,
      masked,
      updatedAt: new Date().toISOString()
    };

    this.saveRawEntries();
    return { success: true, masked };
  }

  getDecryptedCredential(providerId) {
    if (!ALLOWED_PROVIDERS.includes(providerId)) return null;
    const entries = this.loadRawEntries();
    const item = entries[providerId];
    if (!item || !item.cipher) return null;

    if (!this.isSecureStorageAvailable()) {
      throw new Error('Windows DPAPI secure storage is unavailable for decryption.');
    }

    try {
      const buffer = Buffer.from(item.cipher, 'hex');
      return safeStorage.decryptString(buffer);
    } catch (e) {
      console.error(`[CredentialVault] Decryption failed for provider ${providerId}:`, e);
      return null;
    }
  }

  hasCredential(providerId) {
    const entries = this.loadRawEntries();
    return !!(entries[providerId] && entries[providerId].cipher);
  }

  deleteCredential(providerId) {
    const entries = this.loadRawEntries();
    if (entries[providerId]) {
      delete entries[providerId];
      this.saveRawEntries();
      return true;
    }
    return false;
  }

  getStatusSummary() {
    const entries = this.loadRawEntries();
    const secureAvail = this.isSecureStorageAvailable();
    const result = {};

    ALLOWED_PROVIDERS.forEach(id => {
      const item = entries[id];
      result[id] = {
        configured: !!item,
        masked: item ? item.masked : '',
        isEncrypted: secureAvail,
        updatedAt: item ? item.updatedAt : null
      };
    });

    return {
      secureStorageAvailable: secureAvail,
      providers: result
    };
  }

  redactSecrets(text) {
    if (!text || typeof text !== 'string') return text;
    let redacted = text
      .replace(/AIza[0-9A-Za-z-_]{20,50}/g, '[REDACTED_API_KEY]')
      .replace(/sk-[0-9A-Za-z-_]{20,60}/g, '[REDACTED_API_KEY]')
      .replace(/gsk_[0-9A-Za-z-_]{20,60}/g, '[REDACTED_API_KEY]');

    // Also redact any decrypted keys that are currently stored
    const entries = this.loadRawEntries();
    Object.keys(entries).forEach(pId => {
      try {
        const key = this.getDecryptedCredential(pId);
        if (key && key.length > 5) {
          redacted = redacted.split(key).join(`[REDACTED_${pId.toUpperCase()}_KEY]`);
        }
      } catch {}
    });

    return redacted;
  }
}

module.exports = {
  credentialVault: new CredentialVault(),
  ALLOWED_PROVIDERS
};
