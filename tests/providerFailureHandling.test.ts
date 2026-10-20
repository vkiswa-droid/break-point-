import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderManager } from '../src/services/ai/providerManager';

describe('AI Provider Failure Handling & Fallback Cascade', () => {
  let manager: ProviderManager;

  beforeEach(() => {
    localStorage.clear();
    manager = new ProviderManager();
  });

  it('should initialize with Autonomous JARVIS engine as default connected provider', () => {
    expect(manager.getActiveProviderId()).toBe('mock');
    const mockConfig = manager.getConfig('mock');
    expect(mockConfig).toBeDefined();
    expect(mockConfig?.status).toBe('connected');
  });

  it('should reject testing connection when API key is missing', async () => {
    const res = await manager.testProvider('gemini');
    expect(res.success).toBe(false);
    expect(res.error).toContain('API key is missing');
  });

  it('should successfully test Autonomous JARVIS local engine', async () => {
    const res = await manager.testProvider('mock');
    expect(res.success).toBe(true);
    expect(res.latencyMs).toBeGreaterThan(0);
  });

  it('should automatically cascade to fallback when primary provider throws an error', async () => {
    // Enable Gemini with dummy key that would fail
    manager.updateConfig('gemini', { enabled: true, apiKey: 'invalid_key' });
    manager.setActiveProviderId('gemini');

    // Generate response should cascade gracefully to Autonomous JARVIS engine without crashing
    const response = await manager.generateResponse(
      [{ id: '1', role: 'user', content: 'Diagnostics ping', timestamp: new Date().toISOString() }],
      'System prompt test'
    );

    expect(response).toBeDefined();
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });
});
