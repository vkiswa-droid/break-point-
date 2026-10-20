import { registerSystemTools } from './systemTools';
import { registerFileTools } from './fileTools';
import { registerAppLauncherTools } from './appLauncherTools';
import { registerResearchTools } from './researchTools';
import { toolRegistry } from './toolRegistry';

let initialized = false;

export function initTools() {
  if (initialized) return;
  registerSystemTools();
  registerFileTools();
  registerAppLauncherTools();
  registerResearchTools();
  initialized = true;
}

export { toolRegistry };
