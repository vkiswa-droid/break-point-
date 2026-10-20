/**
 * Authoritative Security and Budget Policy for the Electron Main Process.
 * 
 * INVARIANT:
 * - The Main Process never trusts cost classifications or budget permissions supplied by renderer IPC.
 * - Defaults strictly to ₹0/month budget policy.
 * - Potentially billable providers (OpenAI, Anthropic) are denied by default.
 * - Denials occur BEFORE credential retrieval or network access.
 * - Paid access remains disabled across app restarts unless explicitly authorized.
 */
class MainSecurityPolicy {
  constructor() {
    this.paidCloudAllowed = false; // INVARIANT: Authoritative default is strictly FALSE
    this.cloudPaused = false;
    this.localOnlyMode = false;
    this.billableProviders = new Set(['openai', 'anthropic']);
    this.allowedCloudProviders = new Set(['gemini', 'groq', 'openai', 'anthropic']);
  }

  isPaidCloudAllowed() {
    return this.paidCloudAllowed;
  }

  setPaidCloudAllowed(allowed, confirmationKey) {
    if (allowed) {
      // Must match deliberate security authorization key
      if (confirmationKey !== 'AUTHORIZE_PAID_CLOUD_APIS_CONFIRMED') {
        throw new Error('SECURITY VIOLATION: Invalid authorization confirmation key for paid cloud access.');
      }
      this.paidCloudAllowed = true;
      console.warn('[SecurityPolicy] WARNING: Paid cloud API permissions enabled by user action.');
    } else {
      this.paidCloudAllowed = false;
      console.log('[SecurityPolicy] Paid cloud APIs locked under ₹0 budget policy.');
    }
    return this.paidCloudAllowed;
  }

  isCloudPaused() {
    return this.cloudPaused;
  }

  setCloudPaused(paused) {
    this.cloudPaused = Boolean(paused);
    return this.cloudPaused;
  }

  isLocalOnly() {
    return this.localOnlyMode;
  }

  setLocalOnly(localOnly) {
    this.localOnlyMode = Boolean(localOnly);
    return this.localOnlyMode;
  }

  assertRequestPermitted(providerId, operationName = 'request') {
    // 1. Verify cloud provider allowlist
    if (!this.allowedCloudProviders.has(providerId)) {
      throw new Error(`SECURITY REJECTION: Provider "${providerId}" is not in the allowed cloud provider registry.`);
    }

    // 2. Enforce Local Only Mode
    if (this.localOnlyMode) {
      throw new Error(`SECURITY REJECTION: Local-Only mode is active. Cloud ${operationName} for "${providerId.toUpperCase()}" is prohibited.`);
    }

    // 3. Enforce Cloud Pause
    if (this.cloudPaused) {
      throw new Error(`SECURITY REJECTION: Cloud AI operations are paused by user policy. Cloud ${operationName} for "${providerId.toUpperCase()}" is rejected.`);
    }

    // 4. Enforce Authoritative ₹0 Budget Invariant
    if (this.billableProviders.has(providerId) && !this.paidCloudAllowed) {
      throw new Error(`SECURITY VIOLATION: Provider "${providerId.toUpperCase()}" is classified as potentially billable. Denied under authoritative ₹0 budget policy before credential access or network dispatch.`);
    }
  }

  getPolicySummary() {
    return {
      paidCloudAllowed: this.paidCloudAllowed,
      cloudPaused: this.cloudPaused,
      localOnlyMode: this.localOnlyMode,
      budgetPolicy: 'ZERO_INR_PER_MONTH',
      billableProvidersLocked: !this.paidCloudAllowed
    };
  }
}

module.exports = {
  mainSecurityPolicy: new MainSecurityPolicy()
};
