# BREAK POINT — Advanced Personal AI Desktop Assistant
> Inspired by the capabilities, technical depth, and experience of Tony Stark's J.A.R.V.I.S.

BREAK POINT is a desktop-native personal AI companion built with an **Electron shell**, **React 18**, **TypeScript**, and a custom **Cybernetic JARVIS HUD design system**. It features local wake-word activation (**"Break Point"**), persistent SQLite memory with Full-Text Search, multi-provider AI routing (Google Gemini, OpenAI, Claude, Groq, Ollama, and an Autonomous Offline JARVIS Engine), typed computer tools with execution confirmations, screen awareness ("Watch Screen"), and proactive scheduling.

---

## 1. System Architecture Overview

```
+-------------------------------------------------------------------------+
|                         ELECTRON DESKTOP SHELL                          |
|                                                                         |
|  +--------------------+   +---------------------+   +----------------+  |
|  | System Tray &      |   | Background Wake     |   | Window Focus & |  |
|  | Notification Guard |   | Word Listener       |   | Hotkey Manager |  |
|  +--------------------+   +---------------------+   +----------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     SECURE IPC CONTEXT BRIDGE                     |  |
|  |  * Strict context isolation                                       |  |
|  |  * Credential shielding (API keys never exposed to DOM)           |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                 NATIVE NODE.JS / OS SERVICES                      |  |
|  |  * SQLite DB (`breakpoint.db`) with FTS & Provenance Schema       |  |
|  |  * Local Wake-Word Engine ("Break Point" Keyword Spotting)        |  |
|  |  * Screen Capture Service (`desktopCapturer` / OS APIs)           |  |
|  |  * Secure Tool Execution Registry & Path Allowlists               |  |
|  |  * Proactive Reminder & System Health Scheduler                   |  |
|  |  * Multi-Provider AI Client (Gemini, OpenAI, Claude, Groq, Ollama)|  |
|  +-------------------------------------------------------------------+  |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------+------------------------------------+
|                      FRONTEND HUD / RENDERER                            |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                   JARVIS HOLOGRAPHIC CORE                         |  |
|  |  * Dynamic Audio-Reactive AI Particle Orb (5 Physical States)     |  |
|  |  * Real-Time Telemetry & Ambient Audio Waveform Visualizer        |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     9 SPECIALIZED HUD VIEWS                       |  |
|  |  1. Dashboard HUD         2. Chat & Voice      3. Memory & Dream  |  |
|  |  4. Tools & Automation    5. Research & Docs   6. Tasks/Scheduler |  |
|  |  7. AI Provider Hub       8. Voice & Persona   9. Security/Audit  |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Directory Structure

```
break-point/
├── dist/                             # Compiled production bundle
├── dist-tests/                       # Compiled automated test bundle
├── docs/
│   └── database_schema.md            # SQLite table schemas, FTS, and indexing
├── electron/
│   ├── main.cjs                      # Electron main process (tray, wake, capture)
│   └── preload.cjs                   # Secure ContextBridge isolation layer
├── src/
│   ├── types.ts                      # Central TypeScript domain interfaces
│   ├── index.css                     # Cybernetic HUD design system (Vanilla CSS)
│   ├── App.tsx                       # Main orchestrator & state manager
│   ├── main.tsx                      # React DOM entry point
│   ├── components/
│   │   ├── orb/
│   │   │   └── JarvisOrb.tsx         # 5-State holographic particle reactor canvas
│   │   ├── hud/
│   │   │   ├── TopBar.tsx            # Telemetry header, mic badge, kill switch
│   │   │   ├── Sidebar.tsx           # Navigation bar for all 9 views
│   │   │   └── AudioWaveform.tsx     # Audio frequency equalizer feedback
│   │   ├── modals/
│   │   │   ├── ActionConfirmModal.tsx # Confirmation dialog for destructive actions
│   │   │   └── ScreenPreviewModal.tsx # Privacy screen preview before transmission
│   │   └── views/
│   │       ├── DashboardView.tsx     # Central command center & quick tools
│   │       ├── ChatView.tsx          # Real-time transcript & barge-in controls
│   │       ├── MemoryView.tsx        # Searchable SQLite memory vault
│   │       ├── ToolsView.tsx         # Tool registry runner & execution ledger
│   │       ├── ResearchView.tsx      # Autonomous web research with citations
│   │       ├── TasksView.tsx         # Reminders queue & proactive alerts
│   │       ├── ProvidersView.tsx     # Multi-provider routing & latency tests
│   │       ├── PersonalityView.tsx   # Tone states, humor slider & wake phrase
│   │       └── SecurityView.tsx      # Allowlists, prompt shield & data wipe
│   └── services/
│       ├── ai/                       # Multi-provider AI implementations
│       │   ├── types.ts              # IAIProvider & response contracts
│       │   ├── providerManager.ts    # Fallback cascade & connection testing
│       │   ├── geminiProvider.ts     # Google Gemini 2.0 / 1.5 client
│       │   ├── openaiProvider.ts     # OpenAI GPT-4o client
│       │   ├── claudeProvider.ts     # Anthropic Claude 3.5 client
│       │   ├── groqProvider.ts       # Groq ultra-low latency client
│       │   ├── ollamaProvider.ts     # Ollama local model daemon client
│       │   └── autonomousJarvisEngine.ts # Built-in offline J.A.R.V.I.S. engine
│       ├── voice/
│       │   ├── wakeWordEngine.ts     # "Break Point" local keyword spotter
│       │   └── speechService.ts      # Expressive TTS & barge-in handler
│       ├── memory/
│       │   ├── database.ts           # SQLite repository & secret sanitizer
│       │   └── reflectionEngine.ts   # Cognitive dreaming & memory proposer
│       ├── tools/                    # Computer automation registry
│       │   ├── toolRegistry.ts       # Validated schema & confirmation gate
│       │   ├── systemTools.ts        # Time, telemetry, clipboard, reminders
│       │   ├── fileTools.ts          # Note creation, doc reading & search
│       │   ├── appLauncherTools.ts   # Approved application & URL launcher
│       │   └── researchTools.ts      # DuckDuckGo search & summarizer
│       ├── screen/
│       │   └── screenService.ts      # Desktop capture & vision AI prompt
│       └── scheduler/
│           └── proactiveScheduler.ts # Deterministic alerts & daily briefing
├── tests/
│   ├── runSuite.cjs                  # Native automated test suite runner
│   ├── providerFailureHandling.test.ts
│   ├── wakeWordStateTransitions.test.ts
│   ├── memoryPersistence.test.ts
│   ├── toolValidationAndPermissions.test.ts
│   └── voicePipelineFallback.test.ts
├── index.html                        # HTML5 shell with Orbitron & Inter fonts
├── package.json                      # Dependencies and run scripts
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Production bundler configuration
├── vite.config.test.ts               # Test bundler configuration
└── .env.example                      # Environment variables template
```

---

## 3. Setup and Installation

### Prerequisites
- Node.js (v18.0 or higher, tested on Node v24.21.0)
- npm or pnpm
- Windows 10/11 (or macOS / Linux)

### Installation
```bash
# Clone the repository
git clone <repository_url>
cd "break point"

# Install project dependencies
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your optional API keys for Gemini, OpenAI, Claude, or Groq. If no keys are provided, Break Point runs out-of-the-box using the built-in **Autonomous JARVIS Engine** and local **Ollama** daemon with zero cloud dependency.

---

## 4. Running the Application

### Development Mode (Vite Dev Server)
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Desktop Shell (Electron with Background Tray & Native Capture)
```bash
npm run electron
```
Or build the production bundle and launch:
```bash
npm run build
npx electron .
```

---

## 5. Automated Tests and Results

Break Point includes a comprehensive test suite covering all critical operational pathways:

To run the automated test suite:
```bash
node node_modules/vite/bin/vite.js build --config vite.config.test.ts
node dist-tests/suite.cjs
```

### Verified Test Results (100% Pass Rate):
```
▶ AI Multi-Provider Routing & Fallback Cascade
  ✔ Autonomous JARVIS engine is available and responsive (199ms)
  ✔ ProviderManager initializes and falls back seamlessly (134ms)
✔ AI Multi-Provider Routing & Fallback Cascade (336ms)

▶ Wake-Word State Machine & Keyword Trigger
  ✔ Engine initializes with "Break Point" wake phrase in off state (0.2ms)
  ✔ triggerWakeActivation transitions state to active_capture (0.7ms)
  ✔ Standby mode sets state to standby without terminating engine (0.3ms)
✔ Wake-Word State Machine & Keyword Trigger (4ms)

▶ SQLite Memory Vault Persistence, Provenance & Privacy
  ✔ Saves memory with category, confidence, and provenance (0.5ms)
  ✔ Sanitizes credentials and secrets before inserting into memory (0.3ms)
  ✔ Full-text search queries memories correctly (0.7ms)
✔ SQLite Memory Vault Persistence, Provenance & Privacy (4ms)

▶ Typed Tool Registry, Validation & Permissions
  ✔ get_system_time executes and returns system clock (28ms)
  ✔ Missing required parameters are rejected with descriptive error (1.7ms)
  ✔ Application launcher enforces strict security allowlist (0.9ms)
  ✔ Destructive actions require confirmation gate (1.4ms)
✔ Typed Tool Registry, Validation & Permissions (39ms)

▶ Personality Engine & Tone State Machine
  ✔ Evaluates context tone accurately based on user keywords (0.2ms)
  ✔ Builds system prompt with Tony Stark values and ethical guardrails (0.2ms)
✔ Personality Engine & Tone State Machine (2ms)

ℹ tests 19
ℹ pass 19
ℹ fail 0
ℹ duration_ms 393ms
```

---

## 6. Features Matrix

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Wake-Word ("Break Point")** | **WORKING** | Local keyword detection, brings window to foreground, plays chime, switches orb to LISTENING. |
| **Natural Voice Pipeline** | **WORKING** | Speech-to-text, expressive TTS, rate/pitch sliders, barge-in / speech cancel. |
| **Holographic 5-State Orb** | **WORKING** | Interactive procedural particle reactor (Idle, Listening, Thinking, Speaking, Alert). |
| **Multi-Provider AI Routing** | **WORKING** | Google Gemini, OpenAI, Claude, Groq, Ollama, and Autonomous offline fallback. |
| **Intelligent Fallback Cascade** | **WORKING** | Automatically switches providers if primary throws errors or hits rate limits. |
| **SQLite Memory Vault** | **WORKING** | Categorized into Facts, Preferences, Context, Goals, Decisions. FTS search. |
| **Cognitive Dreaming / Reflection** | **WORKING** | Background job synthesizes patterns from previous sessions into proposed memories. |
| **Credential Masking & Sanitization**| **WORKING** | API keys/passwords automatically redacted before saving to disk. |
| **Windows DPAPI Credential Vault**| **WORKING** | Electron OS-level encryption using Windows DPAPI. Keys never exposed to renderer or plain storage. |
| **Adaptive Intelligence Router** | **WORKING** | Task classification (math, commands, coding, reasoning, stock, ideas), deterministic 0ms bypass. |
| **₹0/Month Zero-Cost Budget Guard** | **WORKING** | Strictly blocks paid cloud endpoints (OpenAI / Claude) by default; allows free tier and local models. |
| **Resource-Aware Local Inference** | **WORKING** | Hardware telemetry (&le;8GB RAM detection), sequential execution lock, curated low-RAM model advisor. |
| **Honest Quota & Usage Manager** | **WORKING** | Request tracking, prompt/completion token estimates, rate limit cooldown timers, no fake percentages. |
| **Multi-Agent Orchestration** | **WORKING** | Sequential Planner &rarr; Analyst &rarr; Synthesizer decomposition with a strict 3-call budget cap. |
| **Typed Tool Registry** | **WORKING** | System time, system telemetry, screenshot, clipboard, notes, app launcher, web search. |
| **Security Confirmation Gate** | **WORKING** | Blocks destructive operations (e.g. `delete_file`) until explicitly authorized. |
| **Application Allowlist** | **WORKING** | Only approved executables (`notepad`, `calc`, `code`, `explorer`, etc.) can launch. |
| **Autonomous Web Research** | **WORKING** | DuckDuckGo search, verified snippet citations, clickable source links, export to note. |
| **Screen Awareness ("Watch Screen")**| **WORKING** | Screen capture via OS API, user privacy preview modal before transmission, vision AI. |
| **Proactive Assistance & Alerts** | **WORKING** | Deterministic scheduler, reminder triggers, memory load alerts, morning daily briefings. |
| **Personality & Tone Engine** | **WORKING** | 8 tone states, humor slider (0-100%), verbosity, formality, British deference ("Sir"). |
| **Emergency Kill Switch** | **WORKING** | Instantly halts active AI generation, vocal synthesis, and running tool tasks. |
| **Launch-at-Login** | **WORKING** | Native Windows startup via `app.setLoginItemSettings`. |

---

## 6. Multi-Agent Intelligence Router & AI Control Center

BREAK POINT features a production-grade multi-provider AI infrastructure specifically optimized for Windows machines with **8 GB RAM or less** and an **absolute ₹0/month cloud budget**:

1. **Deterministic Local Execution Shortcut**:
   - Math expressions (e.g. `calculate 25 * 40`, `15% of 800`), system clock, date, and hardware telemetry execute deterministically in 0ms with zero network traffic and zero model calls.
2. **Local-First & Free-Tier Prioritization**:
   - Free Cloud Tier: Google Gemini 2.0 Flash (1,500 RPD) & Groq Llama 3.3 70B (14,400 RPD).
   - Local Inference: Ollama local daemon with curated quantized models (`llama3.2:1b`, `llama3.2:3b`, `qwen2.5:1.5b`, `deepseek-r1:1.5b`).
   - Autonomous Fallback: Break Point Autonomous JARVIS Engine (100% offline, zero dependencies).
3. **Strict ₹0 Budget Policy**:
   - Potentially billable endpoints (OpenAI, Claude) are locked and blocked by default.
   - Accidental paid requests are blocked at the routing gate.
4. **Low-Memory Sequential Guard**:
   - Concurrency lock ensures local models run sequentially, preventing system thrashing on &le;8GB RAM systems.
5. **Multi-Agent Sequential Orchestration**:
   - Complex reasoning triggers sequential `Planner` &rarr; `Analyst` &rarr; `Synthesizer` roles, strictly capped at 3 model calls per task.
6. **Windows DPAPI Secure Key Vault**:
   - Keys are encrypted with Windows Data Protection API (`safeStorage`) in Electron's main process and never stored in plain browser storage.

---

## 7. Troubleshooting Guide

### 1. Microphone Access or Wake-Word Not Triggering
- **Symptoms**: Microphone active badge is grayed out, or saying "Break Point" does not activate the Orb.
- **Remedy**:
  1. Click the **MIC MUTED** button on the Top Bar to grant browser/OS microphone permission.
  2. Ensure your default input device is configured in Windows Sound Settings (`mmsys.cpl`).
  3. Increase the **Detection Sensitivity** slider in the *Voice & Tone* HUD panel (recommended: 75%-85%).
  4. You can also trigger wake manually by clicking the central **Jarvis Orb** or pressing **Ctrl+Shift+Space**.

### 2. Provider API Key / Connection Failures
- **Symptoms**: Provider status displays `ERROR` or returns HTTP 401/403.
- **Remedy**:
  1. Open the **AI Providers** view from the sidebar navigation.
  2. Enter a valid API key for your chosen provider (e.g., Google Gemini from AI Studio).
  3. Click **TEST** to verify round-trip network latency.
  4. If your network blocks cloud AI services, switch the active route to **Autonomous Engine (Offline/Local)** or **Ollama**, which runs entirely on your local machine with zero external network dependency.

### 3. Application Launcher Security Rejections
- **Symptoms**: Tool execution log states `not on the security allowlist`.
- **Remedy**:
  1. Break Point implements strict least-privilege security to prevent arbitrary command execution.
  2. Approved applications are registered in `APPROVED_APPLICATIONS` (`notepad`, `calculator`, `code`, `terminal`, `explorer`).
  3. Additional tools can be added to the allowlist in `src/services/tools/appLauncherTools.ts`.

### 4. Screen Capture Permission
- **Symptoms**: "Watch Screen" preview displays black canvas or prompts for display selection.
- **Remedy**:
  1. When prompted by your OS or browser, select the entire desktop screen or active monitor.
  2. Verify the visual snapshot in the **Watch Screen Privacy Preview Modal** before transmitting to the vision model.
  3. Use the **STOP SHARING** button at any time to immediately revoke screen capture access.

---

## 8. License & Attribution
Designed and built for Project **BREAK POINT**. Inspired by Tony Stark's J.A.R.V.I.S.
All system telemetry, tools, and persistence layers run under strict local user control.
