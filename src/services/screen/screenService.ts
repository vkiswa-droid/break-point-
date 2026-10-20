import { providerManager } from '../ai/providerManager';

export interface ScreenCaptureResult {
  imageDataUrl: string;
  timestamp: string;
  width: number;
  height: number;
}

export class ScreenService {
  private isCapturing: boolean = false;
  private lastCapture: ScreenCaptureResult | null = null;

  isWatching(): boolean {
    return this.isCapturing;
  }

  getLastCapture(): ScreenCaptureResult | null {
    return this.lastCapture;
  }

  // Captures the screen with explicit user permission via standard HTML5 getDisplayMedia or Electron desktopCapturer
  async captureScreen(): Promise<ScreenCaptureResult> {
    try {
      let dataUrl = '';
      let width = window.screen.width;
      let height = window.screen.height;

      // 1. Check if running inside Electron shell with native desktopCapturer API
      if ((window as any).breakPointDesktopAPI?.captureDesktop) {
        dataUrl = await (window as any).breakPointDesktopAPI.captureDesktop();
      } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        // 2. Standard Web getDisplayMedia API
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' },
          audio: false
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        width = video.videoWidth || 1920;
        height = video.videoHeight || 1080;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, width, height);

        dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Stop stream tracks immediately to avoid background capture
        stream.getTracks().forEach(t => t.stop());
      } else {
        // Fallback procedural canvas snapshot for simulation
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#040711';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#00f0ff';
        ctx.font = '24px monospace';
        ctx.fillText('BREAK POINT — DESKTOP SCREEN TELEMETRY CAPTURE', 40, 80);
        ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 40, 120);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.strokeRect(30, 30, 1220, 660);
        dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      }

      this.lastCapture = {
        imageDataUrl: dataUrl,
        timestamp: new Date().toISOString(),
        width,
        height
      };

      return this.lastCapture;
    } catch (err: any) {
      throw new Error(`Screen capture cancelled or permission denied: ${err.message}`);
    }
  }

  async analyzeScreen(prompt: string, customImage?: string): Promise<string> {
    const targetImage = customImage || this.lastCapture?.imageDataUrl;
    if (!targetImage) {
      throw new Error('No screen capture available to analyze. Please capture the screen first.');
    }

    const systemPrompt = `You are Break Point Vision Analysis Subsystem.
Examine this desktop screen capture and provide precise, actionable technical analysis.
Identify visible applications, windows, error messages, code blocks, or UI controls.
Maintain a professional, articulate tone.`;

    const res = await providerManager.generateVisionResponse(targetImage, prompt, systemPrompt);
    return res.content;
  }

  stopWatching() {
    this.isCapturing = false;
    this.lastCapture = null;
    window.dispatchEvent(new CustomEvent('breakpoint:screen_watch_stopped'));
  }
}

export const screenService = new ScreenService();
