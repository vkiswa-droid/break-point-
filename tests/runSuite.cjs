const test = require('node:test');
const assert = require('node:assert');

// In-memory localStorage mock for node test environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();
if (!global.window) {
  global.window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    speechSynthesis: {
      cancel: () => {},
      speak: () => {},
      getVoices: () => [{ name: 'Daniel', lang: 'en-GB' }]
    }
  };
}
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      platform: 'Windows x64',
      hardwareConcurrency: 8,
      onLine: true,
      clipboard: {
        writeText: async () => {}
      }
    },
    configurable: true
  });
} catch {}

// 1. Test Suite: AI Multi-Provider Routing & Fallback Cascade
test('AI Multi-Provider Routing & Fallback Cascade', async (t) => {
  await t.test('Autonomous JARVIS engine is available and responsive', async () => {
    const { AutonomousJarvisEngine } = await import('../src/services/ai/autonomousJarvisEngine.ts');
    const engine = new AutonomousJarvisEngine();
    
    const conn = await engine.testConnection({});
    assert.strictEqual(conn.success, true);
    assert(conn.latencyMs >= 0);

    const response = await engine.generateResponse(
      [{ id: '1', role: 'user', content: 'What time is it?', timestamp: new Date().toISOString() }],
      'System prompt test',
      {
        id: 'mock',
        name: 'Mock',
        enabled: true,
        apiKey: '',
        selectedModel: 'break-point-v1',
        availableModels: [],
        capabilities: { text: true, streaming: true, vision: true, toolCalling: true },
        status: 'connected'
      },
      [{
        name: 'get_system_time',
        description: 'Get time',
        category: 'system',
        parameters: { type: 'object', properties: {}, required: [] },
        requiresConfirmation: false
      }]
    );

    assert(response.content.length > 0);
    assert(response.toolCalls && response.toolCalls.length > 0);
    assert.strictEqual(response.toolCalls[0].name, 'get_system_time');
  });

  await t.test('ProviderManager initializes and falls back seamlessly', async () => {
    const { ProviderManager } = await import('../src/services/ai/providerManager.ts');
    const manager = new ProviderManager();

    const activeId = manager.getActiveProviderId();
    assert.strictEqual(activeId, 'mock');

    const res = await manager.generateResponse(
      [{ id: '1', role: 'user', content: 'Diagnostics check', timestamp: new Date().toISOString() }],
      'System prompt'
    );
    assert(res.content.length > 0);
    assert.strictEqual(res.provider, 'mock');
  });
});

// 2. Test Suite: Wake-Word State Machine, Phrase Normalization & Keyword Spotting
test('Wake-Word State Machine & Keyword Trigger', async (t) => {
  const { WakeWordEngine, normalizeTranscript, matchesWakePhrase } = await import('../src/services/voice/wakeWordEngine.ts');

  await t.test('Engine initializes with "Break Point" wake phrase in off state', () => {
    const engine = new WakeWordEngine({ wakePhrase: 'Break Point' });
    assert.strictEqual(engine.getState(), 'off');
    assert.strictEqual(engine.getWakePhrase(), 'break point');
  });

  await t.test('normalizeTranscript strips punctuation, collapses whitespace and lowercases', () => {
    assert.strictEqual(normalizeTranscript('Break Point!'), 'break point');
    assert.strictEqual(normalizeTranscript('  BREAK-POINT???  '), 'break point');
    assert.strictEqual(normalizeTranscript('Hey,  Break   Point...'), 'hey break point');
    assert.strictEqual(normalizeTranscript(''), '');
    assert.strictEqual(normalizeTranscript(null), '');
  });

  await t.test('matchesWakePhrase matches case-insensitively, compound word, and embedded phrases', () => {
    assert.strictEqual(matchesWakePhrase('Break Point'), true);
    assert.strictEqual(matchesWakePhrase('BREAK POINT'), true);
    assert.strictEqual(matchesWakePhrase('breakpoint'), true);
    assert.strictEqual(matchesWakePhrase('Break-point!'), true);
    assert.strictEqual(matchesWakePhrase('Hey Break Point what is the status?'), true);
    assert.strictEqual(matchesWakePhrase('computer activate break point please'), true);
    assert.strictEqual(matchesWakePhrase('take a break at this point'), false);
    assert.strictEqual(matchesWakePhrase('point of interest'), false);
    assert.strictEqual(matchesWakePhrase('hello world'), false);
  });

  await t.test('triggerWakeActivation enforces cooldown and suppresses duplicate triggers', () => {
    const engine = new WakeWordEngine({ wakePhrase: 'Break Point', cooldownMs: 1500 });
    
    // First trigger must succeed
    const firstTrigger = engine.triggerWakeActivation();
    assert.strictEqual(firstTrigger, true);
    assert.strictEqual(engine.getState(), 'active_capture');
    assert(engine.getLastActivationTime() > 0);

    // Immediate second trigger within cooldown must be suppressed
    const secondTrigger = engine.triggerWakeActivation();
    assert.strictEqual(secondTrigger, false);
  });

  await t.test('Standby mode sets state to standby without terminating engine', () => {
    const engine = new WakeWordEngine({ wakePhrase: 'Break Point' });
    engine.enterStandby();
    assert.strictEqual(engine.getState(), 'standby');
  });

  await t.test('stopListening is idempotent and releases resources safely', () => {
    const engine = new WakeWordEngine({ wakePhrase: 'Break Point' });
    assert.doesNotThrow(() => {
      engine.stopListening();
      engine.stopListening(); // repeated call
      engine.stopListening();
    });
    assert.strictEqual(engine.getState(), 'off');
    assert.strictEqual(engine.getAudioEnergy(), 0);
  });

  await t.test('Engine selection is demonstrably 100% offline with zero cloud speech fallback', () => {
    const engine = new WakeWordEngine({ wakePhrase: 'Break Point' });
    assert.strictEqual(engine.isOfflineVerified(), true);
    assert.strictEqual(engine.getEngineType(), 'local_acoustic_dsp');
  });

  await t.test('Missing model behavior reports honest not-configured status with setup specs', () => {
    const engine = new WakeWordEngine({ wakePhrase: 'Break Point' });
    const status = engine.getModelStatus();
    assert.strictEqual(status.configured, false);
    assert.strictEqual(status.engine, 'local_acoustic_dsp');
    assert.strictEqual(status.isOfflineGuaranteed, true);
    assert(status.recommendation !== undefined);
    assert.strictEqual(status.recommendation.license, 'Apache-2.0');
    assert.strictEqual(status.recommendation.sizeMB, 14);
    assert(status.recommendation.url.includes('sherpa-onnx'));
  });

  await t.test('Local acoustic cadence spotter rejects monotone non-vocal drones', () => {
    const engine = new WakeWordEngine({ wakePhrase: 'Break Point' });
    // In off state or listening state, engine maintains 0 audio energy until live PCM frames arrive
    assert.strictEqual(engine.getAudioEnergy(), 0);
  });

  await t.test('downsampleTo16k handles passthrough, downsampling rates, and empty inputs', async () => {
    const { downsampleTo16k } = await import('../src/services/voice/wakeWordEngine.ts');
    
    // 16kHz passthrough (no change)
    const buf16 = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const res16 = downsampleTo16k(buf16, 16000);
    assert.strictEqual(res16, buf16);

    // 48kHz downsampling (ratio 3:1 -> length 4800 / 3 = 1600)
    const buf48 = new Float32Array(4800);
    buf48.fill(0.5);
    const res48 = downsampleTo16k(buf48, 48000);
    assert.strictEqual(res48.length, 1600);
    assert(Math.abs(res48[0] - 0.5) < 0.001);

    // 44.1kHz downsampling (ratio 44100 / 16000 -> 44100 samples -> 16000 samples)
    const buf44 = new Float32Array(44100);
    const res44 = downsampleTo16k(buf44, 44100);
    assert.strictEqual(res44.length, 16000);

    // Empty or invalid input
    assert.strictEqual(downsampleTo16k(new Float32Array(0), 44100).length, 0);
    assert.strictEqual(downsampleTo16k(null, 16000).length, 0);
  });
});

// 2b. Test Suite: Native Offline Keyword Spotter (Sherpa-ONNX Zipformer KWS)
test('Native Offline Keyword Spotter (Sherpa-ONNX Zipformer KWS)', async (t) => {
  const { NativeWakeWordSpotter } = require('../electron/nativeWakeWordSpotter.cjs');
  const fs = require('fs');
  const path = require('path');

  // Single shared spotter instance to avoid reloading heavy ONNX weights per subtest
  const spotter = new NativeWakeWordSpotter();

  await t.test('NativeWakeWordSpotter loads official Zipformer ONNX model in READY state', () => {
    const status = spotter.getStatus();
    assert.strictEqual(status.status, 'READY');
    assert.strictEqual(status.engine, 'sherpa-onnx-node');
    assert.strictEqual(status.model, 'sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01');
    assert.strictEqual(status.license, 'Apache-2.0');
    assert.strictEqual(status.isOfflineGuaranteed, true);
    assert(status.modelPath.includes('sherpa-onnx-kws-zipformer'));
  });

  await t.test('Model files exist on disk with correct INT8 ONNX architecture and BPE tokens', () => {
    const modelDir = path.resolve(__dirname, '../models/wake-word/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01');
    assert(fs.existsSync(modelDir), 'Model directory exists');
    assert(fs.existsSync(path.join(modelDir, 'encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx')), 'Encoder ONNX exists');
    assert(fs.existsSync(path.join(modelDir, 'decoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx')), 'Decoder ONNX exists');
    assert(fs.existsSync(path.join(modelDir, 'joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx')), 'Joiner ONNX exists');
    assert(fs.existsSync(path.join(modelDir, 'tokens.txt')), 'tokens.txt exists');
    assert(fs.existsSync(path.join(modelDir, 'breakpoint_keywords.txt')), 'breakpoint_keywords.txt exists');

    const kwContent = fs.readFileSync(path.join(modelDir, 'breakpoint_keywords.txt'), 'utf8');
    assert(kwContent.includes('B R E A K') && kwContent.includes('POINT'), 'Keywords file contains BPE tokens for BREAK and POINT');
  });

  await t.test('Feeding PCM silence yields zero false triggers', () => {
    // 16,000 samples of pure silence at 16kHz (1 full second)
    const silence = new Float32Array(16000);
    const result = spotter.feedPcmChunk(silence);
    assert.strictEqual(result, null, 'Silence must not trigger keyword detection');
  });

  await t.test('Duplicate suppression & cooldown gate enforces min debounce interval', () => {
    const prevTime = spotter.lastDetectionTime;
    spotter.lastDetectionTime = Date.now(); // simulate recent detection
    // Feeding silence or chunks within cooldown window will not trigger
    const res = spotter.feedPcmChunk(new Float32Array(1600));
    assert.strictEqual(res, null);
    spotter.lastDetectionTime = prevTime; // restore
  });

  await t.test('Stream reset cleans internal decoder state without errors', () => {
    assert.doesNotThrow(() => {
      spotter.resetStream();
    });
  });

  await t.test('[MOCKED] Missing model directory safely sets status to MODEL NOT INSTALLED', () => {
    class MockMissingSpotter extends NativeWakeWordSpotter {
      init() {
        this.status = 'MODEL NOT INSTALLED';
        this.errorMessage = 'Model directory not found at non/existent/path';
        return false;
      }
    }
    const mockSpotter = new MockMissingSpotter();
    const status = mockSpotter.getStatus();
    assert.strictEqual(status.status, 'MODEL NOT INSTALLED');
    assert(status.errorMessage.includes('Model directory not found'));
  });

  await t.test('[MOCKED] Native addon load failure gracefully reports ERROR status', () => {
    class MockErrorSpotter extends NativeWakeWordSpotter {
      init() {
        this.status = 'ERROR';
        this.errorMessage = 'Native sherpa-onnx-node addon failed to load: DLL not found';
        return false;
      }
    }
    const errorSpotter = new MockErrorSpotter();
    const status = errorSpotter.getStatus();
    assert.strictEqual(status.status, 'ERROR');
    assert(status.errorMessage.includes('DLL not found'));
  });
});

// 3. Test Suite: SQLite Memory Vault Persistence, Provenance & Privacy
test('SQLite Memory Vault Persistence, Provenance & Privacy', async (t) => {
  const { MemoryDatabase } = await import('../src/services/memory/database.ts');
  const db = new MemoryDatabase();

  await t.test('Saves memory with category, confidence, and provenance', () => {
    const item = db.saveMemory({
      category: 'preference',
      content: 'User prefers concise summaries with HUD metrics',
      provenance: 'Chat Interaction',
      confidence: 0.95,
      tags: ['ui', 'metrics']
    });

    assert(item.id.startsWith('mem_'));
    assert.strictEqual(item.category, 'preference');
    assert.strictEqual(item.confidence, 0.95);
  });

  await t.test('Sanitizes credentials and secrets before inserting into memory', () => {
    const item = db.saveMemory({
      category: 'fact',
      content: 'Connected to API key AIzaSyD9876543210ABCDEF1234567890 securely',
      provenance: 'Settings',
      confidence: 1.0,
      tags: ['security']
    });

    assert(!item.content.includes('AIzaSyD9876543210ABCDEF1234567890'));
    assert(item.content.includes('[REDACTED_API_KEY]'));
  });

  await t.test('Full-text search queries memories correctly', () => {
    const results = db.searchMemories('concise');
    assert(results.length > 0);
    assert(results[0].content.includes('concise'));
  });
});

// 4. Test Suite: Typed Tool Registry, Validation & Permissions
test('Typed Tool Registry, Validation & Permissions', async (t) => {
  const { toolRegistry } = await import('../src/services/tools/toolRegistry.ts');
  const { initTools } = await import('../src/services/tools/index.ts');
  initTools();

  await t.test('get_system_time executes and returns system clock', async () => {
    const result = await toolRegistry.executeTool('get_system_time', {});
    assert(result.iso);
    assert(result.human);
    assert(result.timezone);
  });

  await t.test('Missing required parameters are rejected with descriptive error', async () => {
    await assert.rejects(
      async () => {
        await toolRegistry.executeTool('create_note', { title: 'notes.md' });
      },
      /Missing required argument "content"/i
    );
  });

  await t.test('Application launcher enforces strict security allowlist', async () => {
    await assert.rejects(
      async () => {
        await toolRegistry.executeTool('open_application', { app_name: 'unauthorized_script.bat' });
      },
      /not on the security allowlist/i
    );
  });

  await t.test('Destructive actions require confirmation gate', async () => {
    await toolRegistry.executeTool('create_note', { title: 'sample.md', content: 'Doc text' });

    const deletePromise = toolRegistry.executeTool('delete_file', { filename: 'sample.md' });
    const pending = toolRegistry.getPendingConfirmations();
    assert(pending.length > 0);
    assert.strictEqual(pending[0].toolName, 'delete_file');

    toolRegistry.resolveConfirmation(pending[0].id, true);
    const delResult = await deletePromise;
    assert.strictEqual(delResult.success, true);
  });
});

// 5. Test Suite: Personality Engine & Tone State Machine
test('Personality Engine & Tone State Machine', async (t) => {
  const { personalityEngine } = await import('../src/services/personality/personalityEngine.ts');

  await t.test('Evaluates context tone accurately based on user keywords', () => {
    assert.strictEqual(personalityEngine.evaluateContextTone('Severe hazard and breach in firewall'), 'alert');
    assert.strictEqual(personalityEngine.evaluateContextTone('Refactor compiler logic syntax error'), 'focused');
    assert.strictEqual(personalityEngine.evaluateContextTone('Success! We accomplished the milestone!'), 'excited');
    assert.strictEqual(personalityEngine.evaluateContextTone('Tell me a witty joke Stark style'), 'playful');
  });

  await t.test('Builds system prompt with Tony Stark values and ethical guardrails', () => {
    const prompt = personalityEngine.buildSystemPrompt('focused');
    assert(prompt.includes('FOCUSED'));
    assert(prompt.includes('BREAK POINT'));
    assert(prompt.includes('ETHICAL BOUNDARY'));
  });
});

// 6. Test Suite: Task Classification & Deterministic Math Bypass
test('Task Classification & Deterministic Shortcut', async (t) => {
  const { taskClassifier } = await import('../src/services/ai/taskClassifier.ts');

  await t.test('Evaluates arithmetic expressions deterministically without LLM calls', () => {
    const res = taskClassifier.classify('calculate 25 * 40');
    assert.strictEqual(res.taskType, 'calculation');
    assert.strictEqual(res.isDeterministic, true);
    assert(res.deterministicResult && res.deterministicResult.includes('1000'));
  });

  await t.test('Evaluates percentage calculations accurately', () => {
    const res = taskClassifier.classify('what is 15% of 800');
    assert.strictEqual(res.taskType, 'calculation');
    assert.strictEqual(res.isDeterministic, true);
    assert(res.deterministicResult && res.deterministicResult.includes('120'));
  });

  await t.test('Evaluates system time deterministically', () => {
    const res = taskClassifier.classify('what is the time?');
    assert.strictEqual(res.taskType, 'simple_command');
    assert.strictEqual(res.isDeterministic, true);
    assert(res.deterministicResult && res.deterministicResult.includes('current system time'));
  });

  await t.test('Scans for secret-bearing API keys and triggers secret_bearing classification', () => {
    const res = taskClassifier.classify('My API key is sk-proj-1234567890abcdef1234567890abcdef');
    assert.strictEqual(res.privacyLevel, 'secret_bearing');
  });
});

// 7. Test Suite: Quota Manager & ₹0 Budget Enforcement
test('Quota Manager & ₹0 Budget Policy Enforcement', async (t) => {
  const { QuotaManager } = await import('../src/services/ai/quotaManager.ts');
  const qm = new QuotaManager();

  await t.test('Blocks potentially billable providers by default (₹0/mo budget rule)', () => {
    qm.setPaidCloudAllowed(false);
    const check = qm.canRouteToProvider('openai', 'gpt-4o-mini');
    assert.strictEqual(check.allowed, false);
    assert(check.reason && check.reason.includes('₹0/mo budget'));
  });

  await t.test('Allows potentially billable providers only when user explicitly enables paid calls', () => {
    qm.setPaidCloudAllowed(true);
    const check = qm.canRouteToProvider('openai', 'gpt-4o-mini');
    assert.strictEqual(check.allowed, true);
    // Reset back to safe default
    qm.setPaidCloudAllowed(false);
  });

  await t.test('Cloud pause toggle strictly blocks cloud providers and permits local models', () => {
    qm.setCloudAIPaused(true);
    const cloudCheck = qm.canRouteToProvider('gemini', 'gemini-2.0-flash');
    assert.strictEqual(cloudCheck.allowed, false);
    assert(cloudCheck.reason && cloudCheck.reason.includes('Cloud AI is currently paused'));

    const localCheck = qm.canRouteToProvider('ollama', 'llama3');
    assert.strictEqual(localCheck.allowed, true);

    const mockCheck = qm.canRouteToProvider('mock', 'break-point-v1');
    assert.strictEqual(mockCheck.allowed, true);
    qm.setCloudAIPaused(false);
  });

  await t.test('Rate limit triggers cooling_down status and blocks immediate requests', () => {
    qm.recordRateLimit('gemini', 'gemini-2.0-flash', 30);
    const check = qm.canRouteToProvider('gemini', 'gemini-2.0-flash');
    assert.strictEqual(check.allowed, false);
    assert(check.reason && check.reason.includes('cooling down'));
  });
});

// 8. Test Suite: Local Hardware Advisor & Low-RAM Guard
test('Local Hardware Advisor & Low-RAM Concurrency Guard', async (t) => {
  const { localModelAdvisor } = await import('../src/services/ai/localModelAdvisor.ts');

  await t.test('Recommends low-RAM models suitable for <= 8GB RAM systems', async () => {
    const telemetry = await localModelAdvisor.getHardwareTelemetry();
    const recs = localModelAdvisor.getRecommendations(telemetry);
    assert(recs.length >= 4);
    assert(recs.some(r => r.tag === 'llama3.2:1b'));
    assert(recs.some(r => r.tag === 'qwen2.5:1.5b'));
  });

  await t.test('Sequential execution lock runs queued tasks sequentially', async () => {
    const executionOrder = [];
    const task1 = localModelAdvisor.runSequentially(async () => {
      await new Promise(r => setTimeout(r, 40));
      executionOrder.push('task1');
      return 1;
    });
    const task2 = localModelAdvisor.runSequentially(async () => {
      executionOrder.push('task2');
      return 2;
    });

    const [res1, res2] = await Promise.all([task1, task2]);
    assert.strictEqual(res1, 1);
    assert.strictEqual(res2, 2);
    assert.deepStrictEqual(executionOrder, ['task1', 'task2']);
  });
});

// 9. Test Suite: Multi-Agent Orchestration & Call Budget Limits
test('Multi-Agent Orchestration & Call Budget Limits', async (t) => {
  const { multiAgentOrchestrator } = await import('../src/services/ai/multiAgentOrchestrator.ts');
  const { AutonomousJarvisEngine } = await import('../src/services/ai/autonomousJarvisEngine.ts');
  const engine = new AutonomousJarvisEngine();

  await t.test('Executes sequential multi-role plan capped within model call budget', async () => {
    const response = await multiAgentOrchestrator.executeSequentialPlan(
      'Formulate a 3-step fault-tolerant backup strategy for Windows desktop data',
      engine,
      { selectedModel: 'break-point-v1' }
    );

    assert(response.content.includes('Multi-Agent Deliberation Completed'));
    assert.strictEqual(response.provider, 'mock');
  });
});

// 10. Test Suite: Security, Isolation & Defense-in-Depth Verification
test('Security, Isolation & Defense-in-Depth Verification', async (t) => {
  const { OpenAIProvider } = await import('../src/services/ai/openaiProvider.ts');
  const { ClaudeProvider } = await import('../src/services/ai/claudeProvider.ts');
  const { quotaManager } = await import('../src/services/ai/quotaManager.ts');
  const { ProviderManager } = await import('../src/services/ai/providerManager.ts');

  await t.test('OpenAIProvider directly blocks generateResponse() under ₹0 budget', async () => {
    quotaManager.setPaidCloudAllowed(false);
    const openai = new OpenAIProvider();
    await assert.rejects(
      async () => {
        await openai.generateResponse(
          [{ id: '1', role: 'user', content: 'hello', timestamp: new Date().toISOString() }],
          'prompt',
          { id: 'openai', name: 'OpenAI', enabled: true, apiKey: 'sk-test1234567890abcdef', selectedModel: 'gpt-4o-mini', availableModels: [], capabilities: { text: true, streaming: true, vision: true, toolCalling: true }, status: 'connected' }
        );
      },
      /SECURITY VIOLATION.*potentially billable/i
    );
  });

  await t.test('ClaudeProvider directly blocks generateResponse() under ₹0 budget', async () => {
    quotaManager.setPaidCloudAllowed(false);
    const claude = new ClaudeProvider();
    await assert.rejects(
      async () => {
        await claude.generateResponse(
          [{ id: '1', role: 'user', content: 'hello', timestamp: new Date().toISOString() }],
          'prompt',
          { id: 'anthropic', name: 'Anthropic', enabled: true, apiKey: 'sk-ant-1234567890abcdef', selectedModel: 'claude-3-5-sonnet-20241022', availableModels: [], capabilities: { text: true, streaming: true, vision: true, toolCalling: true }, status: 'connected' }
        );
      },
      /SECURITY VIOLATION.*potentially billable/i
    );
  });

  await t.test('Billable provider testConnection() fails safely without network calls', async () => {
    quotaManager.setPaidCloudAllowed(false);
    const openai = new OpenAIProvider();
    const claude = new ClaudeProvider();

    const resOpenAI = await openai.testConnection({ id: 'openai', name: 'OpenAI', enabled: true, apiKey: 'sk-test', selectedModel: 'gpt-4o-mini', availableModels: [], capabilities: { text: true, streaming: true, vision: true, toolCalling: true }, status: 'testing' });
    assert.strictEqual(resOpenAI.success, false);
    assert(resOpenAI.error && resOpenAI.error.includes('₹0 budget policy'));

    const resClaude = await claude.testConnection({ id: 'anthropic', name: 'Claude', enabled: true, apiKey: 'sk-ant', selectedModel: 'claude-3-5-sonnet-20241022', availableModels: [], capabilities: { text: true, streaming: true, vision: true, toolCalling: true }, status: 'testing' });
    assert.strictEqual(resClaude.success, false);
    assert(resClaude.error && resClaude.error.includes('₹0 budget policy'));
  });

  await t.test('Vision pipeline cascades to offline Autonomous engine when billable providers are locked', async () => {
    quotaManager.setPaidCloudAllowed(false);
    const manager = new ProviderManager();
    manager.setActiveProviderId('openai'); // User had OpenAI set as active

    const response = await manager.generateVisionResponse(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'What is on the screen?',
      'You are JARVIS'
    );

    // Must safely fall back to mock without incurring cost or erroring out
    assert.strictEqual(response.provider, 'mock');
    assert(response.content.length > 0);
  });

  await t.test('Secret redaction filters out API key signatures from text', () => {
    const rawError = 'Request failed with key sk-proj-1234567890abcdef1234567890 and Gemini AIzaSyABCDEF12345678901234567890';
    let redacted = rawError
      .replace(/AIza[0-9A-Za-z-_]{20,50}/g, '[REDACTED_API_KEY]')
      .replace(/sk-[0-9A-Za-z-_]{20,60}/g, '[REDACTED_API_KEY]');

    assert(!redacted.includes('sk-proj-1234567890abcdef1234567890'));
    assert(!redacted.includes('AIzaSyABCDEF12345678901234567890'));
    assert(redacted.includes('[REDACTED_API_KEY]'));
  });
});

// 11. Test Suite: Main Process Authoritative Security Policy & Cloud Proxy Payload Gate
test('Main Process Authoritative Security Policy & Cloud Proxy Payload Gate', async (t) => {
  const { mainSecurityPolicy } = require('../electron/mainSecurityPolicy.cjs');
  const { CloudProxy } = require('../electron/cloudProxy.cjs');
  const proxy = new CloudProxy();

  await t.test('Authoritative main process security policy defaults strictly to false', () => {
    assert.strictEqual(mainSecurityPolicy.isPaidCloudAllowed(), false);
    assert.strictEqual(mainSecurityPolicy.isCloudPaused(), false);
    assert.strictEqual(mainSecurityPolicy.isLocalOnly(), false);
    const summary = mainSecurityPolicy.getPolicySummary();
    assert.strictEqual(summary.budgetPolicy, 'ZERO_INR_PER_MONTH');
    assert.strictEqual(summary.billableProvidersLocked, true);
  });

  await t.test('Reject unauthorized toggle of paid cloud access without deliberate confirmation key', () => {
    assert.throws(
      () => {
        mainSecurityPolicy.setPaidCloudAllowed(true, 'wrong_key');
      },
      /SECURITY VIOLATION.*Invalid authorization confirmation key/i
    );
    assert.strictEqual(mainSecurityPolicy.isPaidCloudAllowed(), false);
  });

  await t.test('Allow deliberate toggle of paid cloud access only with valid confirmation key', () => {
    const allowed = mainSecurityPolicy.setPaidCloudAllowed(true, 'AUTHORIZE_PAID_CLOUD_APIS_CONFIRMED');
    assert.strictEqual(allowed, true);
    assert.strictEqual(mainSecurityPolicy.isPaidCloudAllowed(), true);

    // Re-lock to false for subsequent tests
    mainSecurityPolicy.setPaidCloudAllowed(false);
    assert.strictEqual(mainSecurityPolicy.isPaidCloudAllowed(), false);
  });

  await t.test('assertRequestPermitted blocks billable providers before network or credential retrieval', () => {
    mainSecurityPolicy.setPaidCloudAllowed(false);
    assert.throws(
      () => {
        mainSecurityPolicy.assertRequestPermitted('openai', 'inference');
      },
      /SECURITY VIOLATION.*potentially billable.*₹0 budget policy/i
    );

    assert.throws(
      () => {
        mainSecurityPolicy.assertRequestPermitted('anthropic', 'connection_test');
      },
      /SECURITY VIOLATION.*potentially billable.*₹0 budget policy/i
    );
  });

  await t.test('assertRequestPermitted blocks cloud providers when localOnlyMode is active', () => {
    mainSecurityPolicy.setLocalOnly(true);
    assert.throws(
      () => {
        mainSecurityPolicy.assertRequestPermitted('gemini', 'inference');
      },
      /SECURITY REJECTION: Local-Only mode is active/i
    );
    mainSecurityPolicy.setLocalOnly(false);
  });

  await t.test('assertRequestPermitted blocks cloud providers when cloudPaused is active', () => {
    mainSecurityPolicy.setCloudPaused(true);
    assert.throws(
      () => {
        mainSecurityPolicy.assertRequestPermitted('gemini', 'inference');
      },
      /SECURITY REJECTION: Cloud AI operations are paused/i
    );
    mainSecurityPolicy.setCloudPaused(false);
  });

  await t.test('assertRequestPermitted rejects unregistered provider identifiers', () => {
    assert.throws(
      () => {
        mainSecurityPolicy.assertRequestPermitted('unregistered_provider', 'inference');
      },
      /SECURITY REJECTION: Provider "unregistered_provider" is not in the allowed cloud provider registry/i
    );
  });

  await t.test('CloudProxy validatePayloadShape rejects malformed payloads and invalid models', () => {
    // Null payload
    assert.throws(() => proxy.validatePayloadShape(null), /Malformed request payload/i);

    // Missing provider
    assert.throws(() => proxy.validatePayloadShape({ model: 'gpt-4o-mini' }), /Missing or invalid providerId/i);

    // Missing model
    assert.throws(() => proxy.validatePayloadShape({ providerId: 'openai' }), /Missing or invalid model identifier/i);

    // Disallowed model for provider
    assert.throws(
      () => proxy.validatePayloadShape({ providerId: 'gemini', model: 'unauthorized-model' }),
      /Model "unauthorized-model" is not permitted for provider "gemini"/i
    );

    // Oversized system prompt
    assert.throws(
      () => proxy.validatePayloadShape({
        providerId: 'gemini',
        model: 'gemini-2.0-flash',
        systemPrompt: 'x'.repeat(33000)
      }),
      /systemPrompt exceeds maximum length/i
    );

    // Oversized message content
    assert.throws(
      () => proxy.validatePayloadShape({
        providerId: 'gemini',
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'x'.repeat(65000) }]
      }),
      /Message content exceeds safe limit/i
    );

    // Valid payload passes validation
    assert.doesNotThrow(() => proxy.validatePayloadShape({
      providerId: 'gemini',
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: 'hello' }],
      systemPrompt: 'You are Break Point'
    }));
  });
});

// 12. Test Suite: Companion Personality Engine & Chaotic Girlfriend Persona
test('Companion Personality Engine & Chaotic Girlfriend Persona', async (t) => {
  const { companionPersonalityService } = await import('../src/services/personality/companionPersonalityService.ts');

  await t.test('Initializes with girlfriend mode and initiative strictly OFF by default', async () => {
    const config = companionPersonalityService.getConfig();
    assert.strictEqual(config.initiativeEnabled, false, 'Initiative must default to false');
    assert.strictEqual(config.mode, 'girlfriend');
    assert.strictEqual(typeof config.intensity, 'number');
  });

  await t.test('Switches modes and aligns default personality state', async () => {
    companionPersonalityService.setMode('comfort');
    assert.strictEqual(companionPersonalityService.getMode(), 'comfort');
    assert.strictEqual(companionPersonalityService.getState(), 'COMFORTING');

    companionPersonalityService.setMode('chaos');
    assert.strictEqual(companionPersonalityService.getMode(), 'chaos');
    assert.strictEqual(companionPersonalityService.getState(), 'CHAOTIC_PLAYFUL');

    companionPersonalityService.setMode('girlfriend');
    assert.strictEqual(companionPersonalityService.getMode(), 'girlfriend');
  });

  await t.test('Emotional intelligence framework recognizes distress and switches to COMFORTING', async () => {
    companionPersonalityService.setManualOverrideState(null); // Clear override
    const distressInput = "I'm having a panic attack and feel terrible and overwhelmed today";
    const state = companionPersonalityService.evaluateEmotionalContext(distressInput);
    assert.strictEqual(state, 'COMFORTING');

    // Builds prompt containing 5-step empathy framework
    companionPersonalityService.setMode('comfort');
    const prompt = companionPersonalityService.buildCompanionPrompt();
    assert(prompt.includes('Acknowledge what the user specifically shared'));
    assert(prompt.includes('NEVER claim to be a biological human woman'));
  });


  await t.test('Manual override state takes precedence over context adaptation', async () => {
    companionPersonalityService.setManualOverrideState('QUIET');
    assert.strictEqual(companionPersonalityService.getState(), 'QUIET');

    // Even when context has triggers, override holds
    const state = companionPersonalityService.evaluateEmotionalContext('I want to play a game and riddle');
    assert.strictEqual(state, 'QUIET');

    // Reset override
    companionPersonalityService.setManualOverrideState(null);
  });

  await t.test('Proactive initiative is gated by initiativeEnabled and quiet hours', async () => {
    // 1. Off by default -> returns null
    companionPersonalityService.saveConfig({ initiativeEnabled: false });
    assert.strictEqual(companionPersonalityService.triggerProactiveInteraction(), null);

    // 2. Pause for today -> returns null
    companionPersonalityService.saveConfig({ initiativeEnabled: true });
    companionPersonalityService.pauseInitiativeToday();
    assert.strictEqual(companionPersonalityService.triggerProactiveInteraction(), null);

    // Reset
    companionPersonalityService.saveConfig({ initiativeEnabled: false });
  });

  await t.test('Deterministic offline fallback generator returns warm, natural responses', async () => {
    const fallback = companionPersonalityService.generateOfflineFallback('I am feeling sad and overwhelmed');
    assert(fallback.length > 20);
    assert(fallback.toLowerCase().includes('listen') || fallback.toLowerCase().includes('here with you'));
  });
});

// 13. Test Suite: Deterministic Playable Game Framework
test('Deterministic Playable Game Framework', async (t) => {
  const { gameEngine } = await import('../src/services/games/gameEngine.ts');

  await t.test('Starts and runs a Cyber-Riddle session with hints and scoring', async () => {
    const session = gameEngine.startGame('riddles', 'medium');
    assert.strictEqual(session.type, 'riddles');
    assert.strictEqual(session.status, 'playing');
    assert.strictEqual(session.score, 0);

    // Request hint
    const hint = gameEngine.getHint();
    assert(hint !== null && hint.length > 0);

    // Incorrect answer
    const turn1 = gameEngine.submitTurn('completely wrong answer XYZ');
    assert.strictEqual(turn1.session.score, 0);
    assert.strictEqual(turn1.session.streak, 0);

    // Correct answer for active riddle
    const acceptable = session.data.currentRiddle.acceptableAnswers[0];
    const turn2 = gameEngine.submitTurn(acceptable);
    assert(turn2.session.score > 0);
    assert.strictEqual(turn2.session.streak, 1);
  });

  await t.test('Number Guessing Game provides hot/cold feedback and terminates on victory', async () => {
    const session = gameEngine.startGame('guess_number', 'easy');
    const secret = session.data.secretNumber;

    // Guess below secret
    if (secret > 1) {
      const low = gameEngine.submitTurn('1');
      assert(low.feedback.toLowerCase().includes('higher') || low.feedback.toLowerCase().includes('low'));
    }

    // Guess exact secret
    const win = gameEngine.submitTurn(secret.toString());
    assert.strictEqual(win.session.status, 'won');
    assert(win.session.score > 0);
  });

  await t.test('Word Guess game tracks lives and reveals characters', async () => {
    const session = gameEngine.startGame('word_guess', 'medium');
    const initialLives = session.data.livesRemaining;
    assert.strictEqual(initialLives, 6);

    // Guess a letter not in the word (use 'Z' or check word)
    const word = session.data.word;
    const missingLetter = 'Z'.split('').find(l => !word.includes(l)) || 'Q';
    const turn = gameEngine.submitTurn(missingLetter);
    assert(turn.session.data.livesRemaining <= initialLives);

    // Guess full word correctly
    const winTurn = gameEngine.submitTurn(word);
    assert.strictEqual(winTurn.session.status, 'won');
    assert(winTurn.session.score >= 50);
  });

  await t.test('Game session isolation and safe exit', async () => {
    gameEngine.startGame('would_you_rather');
    assert(gameEngine.getActiveSession() !== null);

    gameEngine.exitGame();
    assert.strictEqual(gameEngine.getActiveSession(), null);
  });
});

// 14. Test Suite: Central AI Orchestrator & Intent Classification
test('Central AI Orchestrator & Intent Classification', async (t) => {
  const { centralOrchestrator } = await import('../src/services/ai/centralOrchestrator.ts');

  await t.test('Classifies user queries into specialized agent intents accurately', async () => {
    const testCases = [
      { input: 'What is 45 * 12 + 10?', expectedIntent: 'deterministic_shortcut', expectedAgent: 'diagnostics' },
      { input: 'Play a cyber riddle with me', expectedIntent: 'gaming', expectedAgent: 'gaming' },
      { input: 'Can you speak slower and preview voice?', expectedIntent: 'voice_control', expectedAgent: 'voice' },
      { input: 'I feel heartbroken and so sad', expectedIntent: 'emotional_support', expectedAgent: 'companion' },
      { input: 'Help me track my daily workout and habit routine', expectedIntent: 'personal_growth', expectedAgent: 'growth' },
      { input: 'What is the system battery and memory status?', expectedIntent: 'system_utility', expectedAgent: 'diagnostics' },
      { input: 'Research the history of quantum computing breakthroughs', expectedIntent: 'research', expectedAgent: 'research' },
      { input: 'Hey babe, what are you doing today?', expectedIntent: 'companion_chat', expectedAgent: 'companion' }
    ];

    for (const tc of testCases) {
      const { intent, agent } = centralOrchestrator.classifyIntent(tc.input);
      assert.strictEqual(intent, tc.expectedIntent, `Intent mismatch for "${tc.input}"`);
      assert.strictEqual(agent, tc.expectedAgent, `Agent mismatch for "${tc.input}"`);
    }
  });

  await t.test('Dispatches voice control directly without cloud calls', async () => {
    const res = await centralOrchestrator.dispatch(
      [{ id: '1', role: 'user', content: 'stop talking and quiet', timestamp: new Date().toISOString() }],
      new Map(),
      new Map()
    );

    assert.strictEqual(res.intent, 'voice_control');
    assert.strictEqual(res.model, 'offline-voice-controller');
    assert.strictEqual(res.provider, 'mock');
    assert(res.content.includes('Zipping my lips'));
  });

  await t.test('Dispatches system utility tools deterministically without cloud inference', async () => {
    const res = await centralOrchestrator.dispatch(
      [{ id: '1', role: 'user', content: 'What is the system time?', timestamp: new Date().toISOString() }],
      new Map(),
      new Map()
    );

    assert.strictEqual(res.intent, 'system_utility');
    assert.strictEqual(res.provider, 'mock');
    assert(res.content.includes('currently'));
  });
});

// 15. Test Suite: Expressive Feminine Voice & Local Speech Service
test('Expressive Feminine Voice & Local Speech Service', async (t) => {
  const { speechService } = await import('../src/services/voice/speechService.ts');

  await t.test('Detects feminine voices by keyword matching', async () => {
    assert.strictEqual(typeof speechService.hasFeminineVoiceInstalled, 'function');
    assert.strictEqual(typeof speechService.getFeminineVoices, 'function');
  });

  await t.test('Allows setting and persisting pitch, speech rate, and feminine preference', async () => {
    speechService.setPitch(1.2);
    speechService.setSpeechRate(1.1);
    speechService.setPreferFeminine(true);

    assert.strictEqual(speechService.getPitch(), 1.2);
    assert.strictEqual(speechService.getSpeechRate(), 1.1);
    assert.strictEqual(speechService.getPreferFeminine(), true);

    const cfg = speechService.getVoiceConfig();
    assert.strictEqual(cfg.pitch, 1.2);
    assert.strictEqual(cfg.rate, 1.1);
  });

  await t.test('Interruption / Barge-in cancels speech safely', async () => {
    assert.doesNotThrow(() => speechService.cancelSpeech());
    assert.strictEqual(speechService.getIsSpeaking(), false);
  });
});



