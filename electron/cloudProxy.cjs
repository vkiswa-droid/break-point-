const { credentialVault } = require('./credentialVault.cjs');
const { mainSecurityPolicy } = require('./mainSecurityPolicy.cjs');

// Strict Model ID Allowlist Patterns
const ALLOWED_MODEL_PATTERNS = {
  gemini: /^gemini-(2\.0-flash|1\.5-pro|1\.5-flash)(-[a-z0-9]+)?$/,
  groq: /^(llama-3\.3-70b-versatile|llama-3\.1-8b-instant|mixtral-8x7b-32768)$/,
  openai: /^(gpt-4o-mini|gpt-4o|o1-mini)$/,
  anthropic: /^claude-3-5-(sonnet|haiku)-[0-9]{8}$/
};

/**
 * Executes cloud AI requests strictly in the Electron Main process.
 * Raw API keys are decrypted from Windows DPAPI and never transmitted to renderer JavaScript.
 */
class CloudProxy {
  validatePayloadShape(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('IPC Validation Error: Malformed request payload.');
    }

    const { providerId, model, messages, systemPrompt, isVision, imageDataUrl } = payload;

    if (!providerId || typeof providerId !== 'string') {
      throw new Error('IPC Validation Error: Missing or invalid providerId.');
    }

    if (!model || typeof model !== 'string' || model.length > 64) {
      throw new Error('IPC Validation Error: Missing or invalid model identifier.');
    }

    const pattern = ALLOWED_MODEL_PATTERNS[providerId];
    if (pattern && !pattern.test(model)) {
      throw new Error(`IPC Validation Error: Model "${model}" is not permitted for provider "${providerId}".`);
    }

    if (systemPrompt && (typeof systemPrompt !== 'string' || systemPrompt.length > 32000)) {
      throw new Error('IPC Validation Error: systemPrompt exceeds maximum length (32KB).');
    }

    if (messages) {
      if (!Array.isArray(messages) || messages.length > 100) {
        throw new Error('IPC Validation Error: messages must be an array with ≤100 items.');
      }
      for (const m of messages) {
        if (!m || typeof m !== 'object' || typeof m.content !== 'string' || m.content.length > 64000) {
          throw new Error('IPC Validation Error: Message content exceeds safe limit (64KB per message).');
        }
      }
    }

    if (isVision) {
      if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
        throw new Error('IPC Validation Error: Invalid vision imageDataUrl format.');
      }
      if (imageDataUrl.length > 15 * 1024 * 1024) {
        throw new Error('IPC Validation Error: Vision image exceeds maximum size (15MB).');
      }
    }
  }

  async testConnection(providerId) {
    // 1. Authoritative Main Process Policy Gate (Denial occurs BEFORE credential retrieval)
    mainSecurityPolicy.assertRequestPermitted(providerId, 'connection_test');

    // 2. Credential Retrieval strictly in Main Process
    const apiKey = credentialVault.getDecryptedCredential(providerId);
    if (!apiKey) {
      return {
        success: false,
        latencyMs: 0,
        error: `No API key configured for ${providerId.toUpperCase()} in Windows DPAPI vault.`
      };
    }

    const start = Date.now();
    try {
      if (providerId === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'PING' }] }],
            generationConfig: { maxOutputTokens: 5 }
          }),
          signal: AbortSignal.timeout(8000)
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            latencyMs,
            error: credentialVault.redactSecrets(errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`)
          };
        }
        return { success: true, latencyMs };
      }

      if (providerId === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000)
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            latencyMs,
            error: credentialVault.redactSecrets(errData?.error?.message || `HTTP ${res.status}`)
          };
        }
        return { success: true, latencyMs };
      }

      if (providerId === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000)
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            latencyMs,
            error: credentialVault.redactSecrets(errData?.error?.message || `HTTP ${res.status}`)
          };
        }
        return { success: true, latencyMs };
      }

      if (providerId === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Ping' }]
          }),
          signal: AbortSignal.timeout(6000)
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            latencyMs,
            error: credentialVault.redactSecrets(errData?.error?.message || `HTTP ${res.status}`)
          };
        }
        return { success: true, latencyMs };
      }

      return { success: false, latencyMs: 0, error: 'Unknown provider.' };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: credentialVault.redactSecrets(err.message || 'Connection failed')
      };
    }
  }

  async executeRequest(payload) {
    // 1. Strict Payload Shape Validation
    this.validatePayloadShape(payload);

    const { providerId, model, messages, systemPrompt, isVision, imageDataUrl, prompt } = payload;

    // 2. Authoritative Main Process Policy Gate (Denial occurs BEFORE credential retrieval)
    mainSecurityPolicy.assertRequestPermitted(providerId, 'inference');

    // 3. Credential Retrieval strictly in Main Process
    const apiKey = credentialVault.getDecryptedCredential(providerId);
    if (!apiKey) {
      throw new Error(`No credentials configured in Windows DPAPI vault for provider "${providerId.toUpperCase()}".`);
    }

    const start = Date.now();
    try {
      if (providerId === 'gemini') {
        return await this.executeGemini(apiKey, model, messages, systemPrompt, isVision, imageDataUrl, prompt, start);
      }
      if (providerId === 'groq') {
        return await this.executeGroq(apiKey, model, messages, systemPrompt, start);
      }
      if (providerId === 'openai') {
        return await this.executeOpenAI(apiKey, model, messages, systemPrompt, isVision, imageDataUrl, prompt, start);
      }
      if (providerId === 'anthropic') {
        return await this.executeClaude(apiKey, model, messages, systemPrompt, start);
      }

      throw new Error(`Unsupported cloud provider "${providerId}".`);
    } catch (err) {
      throw new Error(credentialVault.redactSecrets(err.message));
    }
  }

  async executeGemini(apiKey, model, messages, systemPrompt, isVision, imageDataUrl, promptText, start) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let body;
    if (isVision && imageDataUrl) {
      const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeType = imageDataUrl.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
      body = {
        systemInstruction: { parts: [{ text: systemPrompt || 'You are BREAK POINT visual analyst.' }] },
        contents: [
          {
            role: 'user',
            parts: [
              { text: promptText || 'Analyze this image.' },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }
        ]
      };
    } else {
      const contents = (messages || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Diagnostics check.' }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini API Error: ${err?.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned from Gemini.';
    return {
      content: credentialVault.redactSecrets(content),
      provider: 'gemini',
      model,
      latencyMs,
      tokensUsed: {
        prompt: data.usageMetadata?.promptTokenCount || 0,
        completion: data.usageMetadata?.candidatesTokenCount || 0,
        total: data.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  async executeGroq(apiKey, model, messages, systemPrompt, start) {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map(m => ({ role: m.role, content: m.content }))
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1024
      }),
      signal: AbortSignal.timeout(15000)
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq Error: ${res.statusText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || 'No response returned from Groq.';
    return {
      content: credentialVault.redactSecrets(content),
      provider: 'groq',
      model,
      latencyMs,
      tokensUsed: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      }
    };
  }

  async executeOpenAI(apiKey, model, messages, systemPrompt, isVision, imageDataUrl, promptText, start) {
    let requestBody;
    if (isVision && imageDataUrl) {
      requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText || 'Analyze this image.' },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]
          }
        ],
        max_tokens: 1000
      };
    } else {
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map(m => ({ role: m.role, content: m.content }))
      ];
      requestBody = {
        model,
        messages: formattedMessages,
        temperature: 0.7
      };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(20000)
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI Error: ${res.statusText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || 'No response returned from OpenAI.';
    return {
      content: credentialVault.redactSecrets(content),
      provider: 'openai',
      model,
      latencyMs,
      tokensUsed: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      }
    };
  }

  async executeClaude(apiKey, model, messages, systemPrompt, start) {
    const formatted = (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        max_tokens: 2048,
        messages: formatted.length > 0 ? formatted : [{ role: 'user', content: 'Diagnostics check.' }]
      }),
      signal: AbortSignal.timeout(20000)
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic Error: ${res.statusText}`);
    }

    const data = await res.json();
    const content = data.content?.[0]?.text || 'No response returned from Claude.';
    return {
      content: credentialVault.redactSecrets(content),
      provider: 'anthropic',
      model,
      latencyMs,
      tokensUsed: {
        prompt: data.usage?.input_tokens || 0,
        completion: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }
}

module.exports = {
  cloudProxy: new CloudProxy(),
  CloudProxy
};
