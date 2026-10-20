import { AIProviderId, ChatMessage } from '../../types';

export interface ProviderCredentialStatus {
  configured: boolean;
  masked: string;
  isEncrypted: boolean;
  updatedAt: string | null;
}

export interface CredentialVaultStatus {
  secureStorageAvailable: boolean;
  providers: Record<string, ProviderCredentialStatus>;
}

export interface CloudProxyPayload {
  providerId: AIProviderId;
  model: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  isVision?: boolean;
  imageDataUrl?: string;
  prompt?: string;
  paidAllowed: boolean;
  cloudPaused: boolean;
}

export class CredentialService {
  // Ephemeral in-memory fallback for dev/test mock environments only
  private memoryVault: Map<string, string> = new Map();

  async getStatus(): Promise<CredentialVaultStatus> {
    if (window.breakPointDesktopAPI?.getCredentialStatus) {
      try {
        return await window.breakPointDesktopAPI.getCredentialStatus();
      } catch (err) {
        console.warn('[CredentialService] Desktop API status query failed:', err);
      }
    }

    // In-memory fallback
    const result: Record<string, ProviderCredentialStatus> = {};
    const providers: AIProviderId[] = ['gemini', 'openai', 'anthropic', 'groq', 'ollama', 'mock'];
    providers.forEach(p => {
      const key = this.memoryVault.get(p);
      result[p] = {
        configured: !!key,
        masked: key ? `••••••••${key.slice(-4)}` : '',
        isEncrypted: false,
        updatedAt: key ? new Date().toISOString() : null
      };
    });

    return {
      secureStorageAvailable: false,
      providers: result
    };
  }

  async storeKey(providerId: AIProviderId, apiKey: string): Promise<{ success: boolean; masked: string }> {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('API key cannot be empty.');
    }

    const cleanKey = apiKey.trim();

    if (window.breakPointDesktopAPI?.storeCredential) {
      try {
        return await window.breakPointDesktopAPI.storeCredential(providerId, cleanKey);
      } catch (err: any) {
        throw new Error(`Secure storage error: ${err.message}`);
      }
    }

    // Fallback in-memory
    this.memoryVault.set(providerId, cleanKey);
    const suffix = cleanKey.length > 4 ? cleanKey.slice(-4) : '••••';
    return {
      success: true,
      masked: `••••••••${suffix}`
    };
  }

  async deleteKey(providerId: AIProviderId): Promise<boolean> {
    if (window.breakPointDesktopAPI?.deleteCredential) {
      try {
        return await window.breakPointDesktopAPI.deleteCredential(providerId);
      } catch (err) {
        console.warn('[CredentialService] Desktop API deletion failed:', err);
      }
    }

    this.memoryVault.delete(providerId);
    return true;
  }

  /**
   * Execute authenticated cloud requests via Electron Main process.
   * Decrypted API keys are kept strictly in Main process memory and never cross into renderer JS.
   */
  async proxyAIRequest(payload: CloudProxyPayload): Promise<any> {
    if (window.breakPointDesktopAPI?.proxyAIRequest) {
      return await window.breakPointDesktopAPI.proxyAIRequest(payload);
    }

    throw new Error(
      `Desktop security context unavailable. To protect API keys under Windows DPAPI, run BREAK POINT via Electron.`
    );
  }

  async testCloudConnection(providerId: AIProviderId, paidAllowed?: boolean): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    if (window.breakPointDesktopAPI?.testCloudConnection) {
      return await window.breakPointDesktopAPI.testCloudConnection(providerId, paidAllowed);
    }

    return {
      success: false,
      latencyMs: 0,
      error: 'Desktop secure connection testing requires running inside Electron shell.'
    };
  }

  async getSecurityPolicy() {
    if (window.breakPointDesktopAPI?.getSecurityPolicy) {
      return await window.breakPointDesktopAPI.getSecurityPolicy();
    }
    return {
      paidCloudAllowed: false,
      cloudPaused: false,
      localOnlyMode: false,
      budgetPolicy: 'ZERO_INR_PER_MONTH',
      billableProvidersLocked: true
    };
  }

  async setPaidPermission(allowed: boolean, confirmationKey?: string): Promise<boolean> {
    if (window.breakPointDesktopAPI?.setPaidPermission) {
      return await window.breakPointDesktopAPI.setPaidPermission(allowed, confirmationKey);
    }
    return allowed;
  }

  async setCloudPaused(paused: boolean): Promise<boolean> {
    if (window.breakPointDesktopAPI?.setCloudPaused) {
      return await window.breakPointDesktopAPI.setCloudPaused(paused);
    }
    return paused;
  }

  async setLocalOnly(localOnly: boolean): Promise<boolean> {
    if (window.breakPointDesktopAPI?.setLocalOnly) {
      return await window.breakPointDesktopAPI.setLocalOnly(localOnly);
    }
    return localOnly;
  }
}

export const credentialService = new CredentialService();
