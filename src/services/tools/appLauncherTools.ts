import { toolRegistry } from './toolRegistry';

// Strict application allowlist
export const APPROVED_APPLICATIONS: Record<string, { name: string; command: string; description: string }> = {
  notepad: { name: 'Notepad', command: 'notepad.exe', description: 'Windows text editor' },
  calc: { name: 'Calculator', command: 'calc.exe', description: 'Windows system calculator' },
  calculator: { name: 'Calculator', command: 'calc.exe', description: 'Windows system calculator' },
  code: { name: 'VS Code', command: 'code', description: 'Visual Studio Code editor' },
  vscode: { name: 'VS Code', command: 'code', description: 'Visual Studio Code editor' },
  terminal: { name: 'Windows Terminal', command: 'wt.exe', description: 'Command terminal' },
  explorer: { name: 'File Explorer', command: 'explorer.exe', description: 'Windows file browser' },
  browser: { name: 'Default Browser', command: 'start', description: 'System web browser' }
};

export function registerAppLauncherTools() {
  // 1. Launch Approved Application
  toolRegistry.registerTool(
    {
      name: 'open_application',
      description: 'Launches an approved local desktop application from the strict security allowlist.',
      category: 'automation',
      parameters: {
        type: 'object',
        properties: {
          app_name: {
            type: 'string',
            description: 'Name of the approved application (e.g. "notepad", "calculator", "vscode", "explorer").',
            enum: Object.keys(APPROVED_APPLICATIONS)
          }
        },
        required: ['app_name']
      },
      requiresConfirmation: false
    },
    async ({ app_name }) => {
      const clean = app_name.toLowerCase().trim();
      const target = APPROVED_APPLICATIONS[clean];
      if (!target) {
        const allowedList = Object.keys(APPROVED_APPLICATIONS).join(', ');
        throw new Error(`Application "${app_name}" is not on the security allowlist. Approved applications: ${allowedList}`);
      }

      // If running inside Electron desktop shell, trigger IPC
      if ((window as any).breakPointDesktopAPI?.launchApp) {
        await (window as any).breakPointDesktopAPI.launchApp(target.command);
      }

      return {
        success: true,
        appName: target.name,
        command: target.command,
        status: 'Application launched successfully.'
      };
    }
  );

  // 2. Open Approved URL in Default Browser
  toolRegistry.registerTool(
    {
      name: 'open_url',
      description: 'Opens a validated HTTP/HTTPS URL in the default desktop web browser.',
      category: 'web',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The web address to open (must begin with http:// or https://).'
          }
        },
        required: ['url']
      },
      requiresConfirmation: false
    },
    async ({ url }) => {
      // Protocol validation to prevent local file/arbitrary schema abuse
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error(`Rejected URL "${url}". Only standard http:// and https:// URLs are permitted.`);
      }

      if ((window as any).breakPointDesktopAPI?.openExternal) {
        await (window as any).breakPointDesktopAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }

      return {
        success: true,
        openedUrl: url,
        status: 'Webpage opened in default browser.'
      };
    }
  );
}
