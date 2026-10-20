import React, { useState, useEffect } from 'react';
import { TopBar } from './components/hud/TopBar';
import { Sidebar, ActiveView } from './components/hud/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { ChatView } from './components/views/ChatView';
import { MemoryView } from './components/views/MemoryView';
import { ToolsView } from './components/views/ToolsView';
import { ResearchView } from './components/views/ResearchView';
import { TasksView } from './components/views/TasksView';
import { ProvidersView } from './components/views/ProvidersView';
import { PersonalityView } from './components/views/PersonalityView';
import { SecurityView } from './components/views/SecurityView';
import { GamesView } from './components/views/GamesView';
import { ActionConfirmModal } from './components/modals/ActionConfirmModal';
import { ScreenPreviewModal } from './components/modals/ScreenPreviewModal';

import { OrbState, ChatMessage, AIProviderId, ToneState } from './types';
import { wakeWordEngine, WakeState } from './services/voice/wakeWordEngine';
import { speechService } from './services/voice/speechService';
import { providerManager } from './services/ai/providerManager';
import { memoryDatabase } from './services/memory/database';
import { personalityEngine } from './services/personality/personalityEngine';
import { companionPersonalityService } from './services/personality/companionPersonalityService';
import { centralOrchestrator } from './services/ai/centralOrchestrator';
import { toolRegistry } from './services/tools/toolRegistry';
import { initTools } from './services/tools';
import { screenService, ScreenCaptureResult } from './services/screen/screenService';
import { proactiveScheduler } from './services/scheduler/proactiveScheduler';


export const App: React.FC = () => {
  // Navigation & State
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [wakeState, setWakeState] = useState<WakeState>('off');
  const [activeProvider, setActiveProvider] = useState<AIProviderId>(providerManager.getActiveProviderId());
  const [currentTone, setCurrentTone] = useState<ToneState>(personalityEngine.getCurrentTone());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Conversations
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>(`convo_${Date.now()}`);

  // Modals
  const [pendingConfirmation, setPendingConfirmation] = useState<{ id: string; toolName: string; args: any; description?: string } | null>(null);
  const [screenCapture, setScreenCapture] = useState<ScreenCaptureResult | null>(null);
  const [isAnalyzingScreen, setIsAnalyzingScreen] = useState(false);

  useEffect(() => {
    // 1. Initialize Tools
    initTools();

    // 2. Start Proactive Schedulers & Reminders
    proactiveScheduler.start();

    // 3. Start Wake Word Engine only if explicitly enabled by user
    const userOptedIn = localStorage.getItem('breakpoint_autostart_wake') === 'true';
    if (userOptedIn) {
      wakeWordEngine.startListening();
    }
    setWakeState(wakeWordEngine.getState());

    // 4. Register Event Listeners
    const handleWake = () => {
      setOrbState('listening');
      setActiveView('chat');
    };

    const handleSpeechStart = () => {
      setIsSpeaking(true);
      setOrbState('speaking');
    };

    const handleSpeechEnd = () => {
      setIsSpeaking(false);
      setOrbState('idle');
    };

    const handleWakeState = (e: any) => {
      setWakeState(e.detail?.state || 'off');
    };

    const handleToolConfirmation = (e: any) => {
      setPendingConfirmation(e.detail);
    };

    const handleAlert = () => {
      setOrbState('alert');
      setTimeout(() => setOrbState('idle'), 4000);
    };

    window.addEventListener('breakpoint:wake_detected', handleWake);
    window.addEventListener('breakpoint:speech_start', handleSpeechStart);
    window.addEventListener('breakpoint:speech_end', handleSpeechEnd);
    window.addEventListener('breakpoint:wake_state_change', handleWakeState);
    window.addEventListener('breakpoint:tool_confirmation_required', handleToolConfirmation);
    window.addEventListener('breakpoint:system_alert', handleAlert);

    // Audio level meter loop
    const levelInterval = setInterval(() => {
      setAudioLevel(wakeWordEngine.getAudioEnergy());
    }, 100);

    // Proactive Companion Check (Opt-in only, strictly OFF by default)
    const proactiveTimer = setTimeout(() => {
      const greeting = companionPersonalityService.triggerProactiveInteraction();
      if (greeting) {
        const proactiveMsg: ChatMessage = {
          id: `msg_proactive_${Date.now()}`,
          role: 'assistant',
          content: greeting,
          tone: 'playful',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, proactiveMsg]);
        speechService.speak(greeting);
      }
    }, 2000);

    return () => {
      clearTimeout(proactiveTimer);
      proactiveScheduler.stop();
      wakeWordEngine.stopListening();
      clearInterval(levelInterval);
      window.removeEventListener('breakpoint:wake_detected', handleWake);
      window.removeEventListener('breakpoint:speech_start', handleSpeechStart);
      window.removeEventListener('breakpoint:speech_end', handleSpeechEnd);
      window.removeEventListener('breakpoint:wake_state_change', handleWakeState);
      window.removeEventListener('breakpoint:tool_confirmation_required', handleToolConfirmation);
      window.removeEventListener('breakpoint:system_alert', handleAlert);
    };
  }, []);

  // Natural Language & Tool Dispatcher via Central Orchestrator
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    // Barge-in check
    speechService.cancelSpeech();

    // Context tone adaptation
    const newTone = personalityEngine.evaluateContextTone(text);
    personalityEngine.setTone(newTone);
    setCurrentTone(newTone);

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsProcessing(true);
    setOrbState('thinking');

    try {
      // Dispatch through Central AI Orchestrator (Intent Routing + Low-RAM Sequential Lock + Specialized Agents)
      const orchestration = await centralOrchestrator.dispatch(
        updatedMessages,
        providerManager.getProviders(),
        providerManager.getConfigs()
      );

      let finalContent = orchestration.content;

      // Execute requested tools if any
      if (orchestration.toolCalls && orchestration.toolCalls.length > 0) {
        for (const call of orchestration.toolCalls) {
          try {
            const toolResult = await toolRegistry.executeTool(call.name, call.arguments);
            call.result = toolResult;
            finalContent += `\n\n[Diagnostic verification: ${call.name} executed successfully. Result: ${JSON.stringify(toolResult)}]`;
          } catch (toolErr: any) {
            call.error = toolErr.message;
            finalContent += `\n\n[Execution notice: ${call.name} returned: ${toolErr.message}]`;
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: finalContent,
        tone: newTone,
        timestamp: new Date().toISOString(),
        toolCalls: orchestration.toolCalls,
        providerUsed: orchestration.provider,
        latencyMs: orchestration.latencyMs
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Persist conversation
      memoryDatabase.saveConversation({
        id: conversationId,
        title: updatedMessages[0]?.content.slice(0, 30) || 'Active Session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: finalMessages
      });

      // Vocalize response
      setOrbState('speaking');
      speechService.speak(finalContent, () => {
        setOrbState('idle');
      });
    } catch (err: any) {
      // Deterministic Offline Companion Fallback
      const fallback = companionPersonalityService.generateLocalDeterministicResponse(text);
      const fallbackMsg: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: fallback,
        tone: 'playful',
        timestamp: new Date().toISOString()
      };
      setMessages([...updatedMessages, fallbackMsg]);
      setOrbState('speaking');
      speechService.speak(fallback, () => {
        setOrbState('idle');
      });
    } finally {
      setIsProcessing(false);
    }
  };


  // Screen Watch Trigger
  const handleTriggerWatchScreen = async () => {
    try {
      const capture = await screenService.captureScreen();
      setScreenCapture(capture);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAnalyzeScreen = async (prompt: string) => {
    if (!screenCapture) return;
    setIsAnalyzingScreen(true);
    try {
      const analysis = await screenService.analyzeScreen(prompt, screenCapture.imageDataUrl);
      setScreenCapture(null);
      setActiveView('chat');
      handleSendMessage(`[Watch Screen Analysis Directive]\nPrompt: "${prompt}"\nResult: ${analysis}`);
    } catch (err: any) {
      alert(`Vision analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzingScreen(false);
    }
  };

  // Emergency Kill Switch
  const handleKillSwitch = () => {
    speechService.cancelSpeech();
    wakeWordEngine.stopListening();
    setIsProcessing(false);
    setOrbState('idle');
    alert('EMERGENCY KILL SWITCH ACTIVATED:\nAll active AI generation, speech synthesis, and tool loops immediately terminated.');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-breakpoint-bg scanlines">
      {/* Top Telemetry Header */}
      <TopBar
        wakeState={wakeState}
        activeProvider={activeProvider}
        isOnline={navigator.onLine}
        onToggleMic={() => {
          if (wakeState === 'off' || wakeState === 'error') {
            localStorage.setItem('breakpoint_autostart_wake', 'true');
            wakeWordEngine.startListening();
          } else {
            localStorage.setItem('breakpoint_autostart_wake', 'false');
            wakeWordEngine.stopListening();
          }
        }}
        onKillSwitch={handleKillSwitch}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          unreadAlertCount={proactiveScheduler.getAlerts().filter(a => !a.read).length}
        />

        {/* Dynamic View Panel */}
        <main className="flex-1 overflow-hidden relative">
          {activeView === 'dashboard' && (
            <DashboardView
              orbState={orbState}
              tone={currentTone}
              activeProvider={activeProvider}
              audioLevel={audioLevel}
              wakeState={wakeState}
              onOrbClick={() => {
                wakeWordEngine.triggerWakeActivation();
                setActiveView('chat');
              }}
              onTriggerWatchScreen={handleTriggerWatchScreen}
              onQuickTool={(name, args) => {
                setActiveView('chat');
                handleSendMessage(`Execute quick diagnostic: ${name}`);
              }}
              onNavigate={setActiveView}
            />
          )}

          {activeView === 'chat' && (
            <ChatView
              messages={messages}
              onSendMessage={handleSendMessage}
              isProcessing={isProcessing}
              isSpeaking={isSpeaking}
              onStopSpeaking={() => speechService.cancelSpeech()}
              isListening={wakeState === 'active_capture'}
              onToggleListening={() => {
                if (wakeState === 'active_capture') {
                  wakeWordEngine.enterStandby();
                } else {
                  wakeWordEngine.triggerWakeActivation();
                }
              }}
              audioLevel={audioLevel}
              activeProvider={activeProvider}
              currentTone={currentTone}
            />
          )}

          {activeView === 'memory' && (
            <MemoryView
              memories={memoryDatabase.getAllMemories()}
              onRefreshMemories={() => setMessages([...messages])}
            />
          )}

          {activeView === 'tools' && <ToolsView />}
          {activeView === 'research' && <ResearchView />}
          {activeView === 'tasks' && <TasksView />}
          {activeView === 'providers' && <ProvidersView />}
          {activeView === 'personality' && <PersonalityView />}
          {activeView === 'games' && <GamesView />}
          {activeView === 'security' && <SecurityView />}
        </main>

      </div>

      {/* Security Confirmation Modal */}
      {pendingConfirmation && (
        <ActionConfirmModal
          id={pendingConfirmation.id}
          toolName={pendingConfirmation.toolName}
          args={pendingConfirmation.args}
          description={pendingConfirmation.description}
          onConfirm={(id) => {
            toolRegistry.resolveConfirmation(id, true);
            setPendingConfirmation(null);
          }}
          onDeny={(id) => {
            toolRegistry.resolveConfirmation(id, false);
            setPendingConfirmation(null);
          }}
        />
      )}

      {/* Screen Preview Modal */}
      {screenCapture && (
        <ScreenPreviewModal
          capture={screenCapture}
          onAnalyze={handleAnalyzeScreen}
          onRecapture={handleTriggerWatchScreen}
          onClose={() => setScreenCapture(null)}
          isAnalyzing={isAnalyzingScreen}
        />
      )}
    </div>
  );
};
