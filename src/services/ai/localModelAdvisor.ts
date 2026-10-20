export interface RecommendedLocalModel {
  name: string;
  tag: string;
  parameterSize: string;
  quantization: string;
  diskSizeMB: number;
  minRamMB: number;
  recommendedRamMB: number;
  speedRating: 'Ultra-Fast' | 'Fast' | 'Moderate';
  bestFor: string;
  tradeOffs: string;
  isInstalled?: boolean;
}

export interface LocalHardwareTelemetry {
  totalMemMB: number;
  freeMemMB: number;
  cpuCores: number;
  isLowRam: boolean; // <= 8GB RAM
  platform: string;
  hasOllamaDaemon: boolean;
  installedModels: string[];
}

export class LocalModelAdvisor {
  // Curated catalog of quantized models engineered for <= 8GB RAM environments
  private readonly MODEL_CATALOG: RecommendedLocalModel[] = [
    {
      name: 'Llama 3.2 1B (Quantized Q4_K_M)',
      tag: 'llama3.2:1b',
      parameterSize: '1.2B',
      quantization: 'Q4_K_M',
      diskSizeMB: 1300,
      minRamMB: 2048,
      recommendedRamMB: 4096,
      speedRating: 'Ultra-Fast',
      bestFor: 'Instant local commands, intent classification, quick chat, zero RAM pressure.',
      tradeOffs: 'Slightly less deep on multi-step complex mathematical proofs.'
    },
    {
      name: 'Llama 3.2 3B (Quantized Q4_K_M)',
      tag: 'llama3.2:3b',
      parameterSize: '3.2B',
      quantization: 'Q4_K_M',
      diskSizeMB: 2000,
      minRamMB: 3500,
      recommendedRamMB: 6144,
      speedRating: 'Fast',
      bestFor: 'Balanced daily driver: tool planning, articulate conversational tone, smart summaries.',
      tradeOffs: 'Uses ~2.2GB memory while running; close tabs if gaming or rendering.'
    },
    {
      name: 'Qwen 2.5 1.5B (Instruct)',
      tag: 'qwen2.5:1.5b',
      parameterSize: '1.5B',
      quantization: 'Q4_K_M',
      diskSizeMB: 1100,
      minRamMB: 1800,
      recommendedRamMB: 4096,
      speedRating: 'Ultra-Fast',
      bestFor: 'Precision coding snippets, multilingual assistance, strict instruction following.',
      tradeOffs: 'Concise style, requires prompt priming for elaborate prose.'
    },
    {
      name: 'DeepSeek R1 1.5B (Distilled Q4)',
      tag: 'deepseek-r1:1.5b',
      parameterSize: '1.5B',
      quantization: 'Q4_K_M',
      diskSizeMB: 1200,
      minRamMB: 2200,
      recommendedRamMB: 4096,
      speedRating: 'Fast',
      bestFor: 'Step-by-step reasoning, logic puzzles, verifying technical facts locally.',
      tradeOffs: 'Outputs <think> chain which adds latency before final answer.'
    },
    {
      name: 'Phi-3 Mini 3.8B (4k-instruct)',
      tag: 'phi3:mini',
      parameterSize: '3.8B',
      quantization: 'Q4_K_M',
      diskSizeMB: 2400,
      minRamMB: 4096,
      recommendedRamMB: 7168,
      speedRating: 'Moderate',
      bestFor: 'High academic reasoning, synthetic benchmark leader in small models.',
      tradeOffs: 'Requires ~3GB active RAM headroom; best run with fewer background programs.'
    }
  ];

  // Concurrency lock for low-RAM sequential execution
  private isModelRunning: boolean = false;
  private executionQueue: Array<() => Promise<void>> = [];

  async getHardwareTelemetry(baseUrl: string = 'http://127.0.0.1:11434'): Promise<LocalHardwareTelemetry> {
    let totalMemMB = 8192;
    let freeMemMB = 3500;
    let cpuCores = 4;
    let isLowRam = true;
    let platform = 'win32';

    // 1. Try Desktop API (Electron main process)
    if (window.breakPointDesktopAPI?.getHardwareInfo) {
      try {
        const hw = await window.breakPointDesktopAPI.getHardwareInfo();
        totalMemMB = hw.totalMemMB;
        freeMemMB = hw.freeMemMB;
        cpuCores = hw.cpuCores;
        isLowRam = hw.isLowRam;
        platform = hw.platform;
      } catch (err) {
        console.warn('Could not read hardware via Desktop API:', err);
      }
    } else {
      // Browser fallback estimation
      cpuCores = navigator.hardwareConcurrency || 4;
      platform = navigator.platform || 'Windows';
      // In web browser navigator.deviceMemory is capped at 8GB max by privacy spec
      const deviceMemGB = (navigator as any).deviceMemory || 8;
      totalMemMB = deviceMemGB * 1024;
      isLowRam = totalMemMB <= 8192;
    }

    // 2. Probe Ollama Daemon for reachability and installed models
    let hasOllamaDaemon = false;
    let installedModels: string[] = [];

    try {
      const res = await fetch(`${baseUrl}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        hasOllamaDaemon = true;
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
          installedModels = data.models.map((m: any) => m.name);
        }
      }
    } catch {
      hasOllamaDaemon = false;
    }

    return {
      totalMemMB,
      freeMemMB,
      cpuCores,
      isLowRam,
      platform,
      hasOllamaDaemon,
      installedModels
    };
  }

  getRecommendations(telemetry: LocalHardwareTelemetry): RecommendedLocalModel[] {
    return this.MODEL_CATALOG.map(model => {
      const isInstalled = telemetry.installedModels.some(m => m.startsWith(model.tag) || model.tag.startsWith(m));
      return {
        ...model,
        isInstalled
      };
    });
  }

  /**
   * Safe sequential execution wrapper for local models.
   * On 8GB or less RAM systems, running multiple inferences in parallel can trigger OS thrashing.
   */
  async runSequentially<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        this.isModelRunning = true;
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.isModelRunning = false;
          if (this.executionQueue.length > 0) {
            const next = this.executionQueue.shift();
            if (next) next();
          }
        }
      };

      if (!this.isModelRunning) {
        execute();
      } else {
        this.executionQueue.push(execute);
      }
    });
  }

  getOllamaWindowsSetupGuide(): string {
    return `### Windows Ollama Local Model Setup Guide (Optimized for ≤8GB RAM)

1. **Download Ollama for Windows:**
   - Official installer: https://ollama.com/download/windows
   - Run the \`OllamaSetup.exe\` installer.

2. **Verify Daemon is Running:**
   - Open Command Prompt or PowerShell:
     \`\`\`powershell
     curl http://127.0.0.1:11434/api/tags
     \`\`\`
   - You should see \`{"models":[]}\` or a list of installed models.

3. **Install Recommended Low-RAM Models:**
   - For ultra-fast, lightweight performance (1.3GB RAM usage):
     \`\`\`powershell
     ollama pull llama3.2:1b
     \`\`\`
   - For higher conversational reasoning (2.2GB RAM usage):
     \`\`\`powershell
     ollama pull llama3.2:3b
     \`\`\`
   - For fast local code generation (1.2GB RAM usage):
     \`\`\`powershell
     ollama pull qwen2.5:1.5b
     \`\`\`

4. **Safety Margin for 8GB RAM:**
   - Break Point automatically executes requests sequentially with a 30-second timeout.
   - All queries remain 100% on your device with ₹0 cost and zero cloud transmissions.`;
  }
}

export const localModelAdvisor = new LocalModelAdvisor();
