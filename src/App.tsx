import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StartOverlay } from './components/StartOverlay';
import { LiveTranscript } from './components/LiveTranscript';
import { BottomControls } from './components/BottomControls';
import { TextInputModal } from './components/TextInputModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { FaceToFaceView } from './components/FaceToFaceView';
import { SaveTranscriptModal } from './components/SaveTranscriptModal';
import { ProjectDrawerModal } from './components/ProjectDrawerModal';
import { RenameProjectModal } from './components/RenameProjectModal';
import type { TranslationMessage, ModelOption, AsrEngineMode, ProjectSession } from './types';
import { speechRecognitionService } from './services/speechRecognition';
import { cloudAsrService } from './services/cloudAsrService';
import { speechSynthesisService } from './services/speechSynthesis';
import { wakeLockService } from './services/wakeLock';
import { fetchAvailableModels, translateText, saveSessionToServer, fetchAppSettings, fetchClientSessions } from './services/translationApi';
import { apiKeyService } from './services/apiKeyService';

const STORAGE_KEY = 'mohua_transcript_history_v1';
const PROJECTS_KEY = 'mohua_projects_v1';
const CURRENT_PROJECT_ID_KEY = 'mohua_current_project_id_v1';

// Helper: generate standard project title "YYYY-MM-DD HH:mm"
function formatProjectTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function App() {
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranslationMessage[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true); // 默认纯字幕模式，麦克风100%全开不漏词
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);

  // ASR Engine Mode: 'local' (Web Speech API) vs 'cloud-whisper' (Cloud Whisper ASR)
  const [asrMode, setAsrMode] = useState<AsrEngineMode>('local');
  const [isFaceToFaceActive, setIsFaceToFaceActive] = useState<boolean>(false);

  // Projects state
  const [projects, setProjects] = useState<ProjectSession[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState<boolean>(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);

  // Models state
  const [models, setModels] = useState<ModelOption[]>([]);
  const [currentModel, setCurrentModel] = useState<ModelOption>({
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (推荐)',
    tier: 'free',
    provider: 'google',
    latency: '~200ms',
    available: true,
    description: '响应极快，语义自然，免费额度充裕',
  });

  // Modals state
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [isTextInputModalOpen, setIsTextInputModalOpen] = useState<boolean>(false);
  const [isHoldingToTalk, setIsHoldingToTalk] = useState<boolean>(false);
  const [autoPauseSeconds, setAutoPauseSeconds] = useState<number>(300); // 默认5分钟
  const [autoPauseNotice, setAutoPauseNotice] = useState<string | null>(null);

  // Active references to prevent React stale closures (Fixing Bug B1 & B5)
  const currentModelRef = useRef<ModelOption>(currentModel);
  const messagesRef = useRef<TranslationMessage[]>(messages);
  const asrModeRef = useRef<AsrEngineMode>(asrMode);
  const holdToTalkTranscriptRef = useRef<string>('');
  const lastActivityTimeRef = useRef<number>(Date.now());
  const autoPauseSecondsRef = useRef<number>(300);
  const isListeningRef = useRef<boolean>(isListening);
  const currentProjectIdRef = useRef<string>(currentProjectId);
  const projectsRef = useRef<ProjectSession[]>(projects);

  useEffect(() => {
    currentProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    isListeningRef.current = isListening;
    if (isListening) {
      lastActivityTimeRef.current = Date.now();
    }
  }, [isListening]);

  useEffect(() => {
    autoPauseSecondsRef.current = autoPauseSeconds;
  }, [autoPauseSeconds]);

  // Activity tracker: resets inactivity timer whenever screen is touched, clicked or typed
  const recordUserActivity = () => {
    lastActivityTimeRef.current = Date.now();
  };

  useEffect(() => {
    window.addEventListener('pointerdown', recordUserActivity);
    window.addEventListener('touchstart', recordUserActivity);
    window.addEventListener('keydown', recordUserActivity);
    return () => {
      window.removeEventListener('pointerdown', recordUserActivity);
      window.removeEventListener('touchstart', recordUserActivity);
      window.removeEventListener('keydown', recordUserActivity);
    };
  }, []);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  // Current active project object
  const currentProject = projects.find(p => p.id === currentProjectId) || null;
  const currentProjectTitle = currentProject ? currentProject.title : 'MoHua 墨华同传';
  const defaultTimePrefix = currentProject ? formatProjectTime(new Date(currentProject.createdAt)) : formatProjectTime();

  // Create a new project session helper
  const createNewProject = (customName?: string): ProjectSession => {
    const now = Date.now();
    const timeStr = formatProjectTime(new Date(now));
    const finalTitle = customName && customName.trim() ? `${timeStr} ${customName.trim()}` : timeStr;
    const newProj: ProjectSession = {
      id: `proj_${now}_${Math.random().toString(36).substring(2, 7)}`,
      title: finalTitle,
      customName: customName?.trim() || '',
      clientName: '同传客户端',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    return newProj;
  };

  // Sync current project to local storage and Cloudflare KV
  const syncCurrentProject = (updatedMessages: TranslationMessage[]) => {
    const projId = currentProjectIdRef.current;
    if (!projId) return;

    setProjects(prevProjects => {
      const idx = prevProjects.findIndex(p => p.id === projId);
      if (idx === -1) return prevProjects;

      const target = prevProjects[idx];
      const updatedProject: ProjectSession = {
        ...target,
        updatedAt: Date.now(),
        messages: updatedMessages,
      };

      const updatedList = [...prevProjects];
      updatedList[idx] = updatedProject;

      try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedList.slice(0, 30)));
      } catch (e) {}

      // Fire-and-forget real-time cloud sync to Cloudflare KV
      saveSessionToServer({
        id: updatedProject.id,
        title: updatedProject.title,
        customName: updatedProject.customName,
        clientName: updatedProject.clientName || '同传客户端',
        timestamp: updatedProject.createdAt,
        messageCount: updatedMessages.length,
        messages: updatedMessages,
      });

      return updatedList;
    });
  };

  // Auto-persist latest messages to active project
  useEffect(() => {
    messagesRef.current = messages;
    if (currentProjectIdRef.current) {
      syncCurrentProject(messages);
    }
  }, [messages]);

  useEffect(() => {
    asrModeRef.current = asrMode;
  }, [asrMode]);

  // 1. Initialize: load projects, live models status, and app settings
  useEffect(() => {
    speechSynthesisService.setMuted(true);

    // 1.1 Restore saved projects from localStorage
    let loadedProjects: ProjectSession[] = [];
    try {
      const savedProjectsRaw = localStorage.getItem(PROJECTS_KEY);
      if (savedProjectsRaw) {
        loadedProjects = JSON.parse(savedProjectsRaw);
      }
    } catch (e) {}

    // Fallback: migrate legacy mohua_transcript_history_v1 if projects is empty
    if (loadedProjects.length === 0) {
      try {
        const legacyRaw = localStorage.getItem(STORAGE_KEY);
        if (legacyRaw) {
          const legacyMsgs = JSON.parse(legacyRaw);
          if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
            const initialProj = createNewProject('历史导入');
            initialProj.messages = legacyMsgs;
            loadedProjects = [initialProj];
          }
        }
      } catch(e) {}
    }

    if (loadedProjects.length === 0) {
      const initialProj = createNewProject();
      loadedProjects = [initialProj];
    }

    setProjects(loadedProjects);
    projectsRef.current = loadedProjects;

    const savedActiveId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    const activeProj = loadedProjects.find(p => p.id === savedActiveId) || loadedProjects[0];
    setCurrentProjectId(activeProj.id);
    currentProjectIdRef.current = activeProj.id;
    setMessages(activeProj.messages);
    messagesRef.current = activeProj.messages;

    // Also pull cloud sessions to merge if available
    fetchClientSessions().then((remoteSessions) => {
      if (Array.isArray(remoteSessions) && remoteSessions.length > 0) {
        // Softly merge cloud projects list
      }
    }).catch(() => {});

    // Auto-detect if device has Google Speech Services; if not (e.g. industrial PDA), default to Cloud Whisper
    if (!speechRecognitionService.getIsSupported()) {
      setAsrMode('cloud-whisper');
      asrModeRef.current = 'cloud-whisper';
    }

    // Fetch live models status and app settings
    fetchAvailableModels().then((data) => {
      if (data && data.length > 0) {
        setModels(data);
        const savedModelId = apiKeyService.getActiveModelId();
        const initialModel =
          data.find((m) => m.id === savedModelId) ||
          data.find((m) => m.id === 'gemini-2.5-flash') ||
          data[0];
        setCurrentModel(initialModel);
        currentModelRef.current = initialModel;
      }
    });

    fetchAppSettings().then((settings) => {
      if (settings && typeof settings.autoPauseSeconds === 'number') {
        setAutoPauseSeconds(settings.autoPauseSeconds);
      }
    });
  }, []);

  // Idle Watchdog: Periodically check if continuous listening has been idle without voice or touch
  useEffect(() => {
    const interval = setInterval(() => {
      const limit = autoPauseSecondsRef.current;
      if (limit > 0 && isListeningRef.current) {
        const idleDuration = (Date.now() - lastActivityTimeRef.current) / 1000;
        if (idleDuration >= limit) {
          stopContinuousListening();
          const minutes = Math.round(limit / 60);
          const noticeMsg = limit >= 60 
            ? `已超过 ${minutes} 分钟未检测到语音及屏幕操作，已自动暂停拾音以节约电量`
            : `已超过 ${limit} 秒未检测到语音输入，已自动暂停拾音以节约电量`;
          setAutoPauseNotice(noticeMsg);
          setTimeout(() => setAutoPauseNotice(null), 6000);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // 2. Start Continuous Listening Helper according to active ASR mode
  const startContinuousListening = () => {
    lastActivityTimeRef.current = Date.now();
    setAutoPauseNotice(null);
    const activeMode = asrModeRef.current;

    if (activeMode === 'cloud-whisper') {
      // Cloud Whisper Mode (for PDA or ultra-low volume environments)
      speechRecognitionService.stopContinuousListening();
      cloudAsrService.startContinuous({
        onInterim: (text) => {
          lastActivityTimeRef.current = Date.now();
          setInterimText(text);
        },
        onFinal: (text) => {
          lastActivityTimeRef.current = Date.now();
          setInterimText('');
          if (!text || text.trim().length === 0) return;
          handleMexicanSpanishFinalUtterance(text.trim());
        },
        onError: (err) => console.warn('Cloud ASR error:', err),
        onListeningChange: (listening) => setIsListening(listening),
      });
    } else {
      // Local Web Speech API Mode (Ultra-fast, zero-cloud audio bandwidth)
      cloudAsrService.stopContinuous();
      speechRecognitionService.startContinuousListening('es-MX', {
        onInterim: (text) => {
          lastActivityTimeRef.current = Date.now();
          setInterimText(text);
        },
        onFinal: (text) => {
          lastActivityTimeRef.current = Date.now();
          setInterimText('');
          if (!text || text.trim().length === 0) return;
          handleMexicanSpanishFinalUtterance(text.trim());
        },
        onError: (err) => {
          console.warn('SpeechRecognition error:', err);
          // If PDA throws service-not-allowed, auto switch to Cloud Whisper!
          if (err.includes('Google 语音识别引擎') || err.includes('service-not-allowed')) {
            console.log('Auto-switching to Cloud Whisper mode due to missing Google Speech services...');
            setAsrMode('cloud-whisper');
            asrModeRef.current = 'cloud-whisper';
            startContinuousListening();
          }
        },
        onListeningChange: (listening) => setIsListening(listening),
      });
    }
  };

  const stopContinuousListening = () => {
    speechRecognitionService.stopContinuousListening();
    cloudAsrService.stopContinuous();
    setIsListening(false);
  };

  // 3. User taps "轻触开启同传" on StartOverlay
  const handleStartSession = async () => {
    setStartError(null);
    try {
      const locked = await wakeLockService.request();
      setIsWakeLockActive(locked);

      startContinuousListening();
      setHasStarted(true);
    } catch (err: any) {
      console.error('Session start error:', err);
      setStartError('启动麦克风录音失败，请确认允许麦克风权限');
    }
  };

  const handleStartTypingSession = () => {
    setStartError(null);
    setHasStarted(true);
    setIsTextInputModalOpen(true);
  };

  // 4. Translate Mexican Spanish utterance to Chinese (Context-aware & Dynamic Model)
  const handleMexicanSpanishFinalUtterance = async (spanishText: string) => {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: TranslationMessage = {
      id: messageId,
      sourceText: spanishText,
      translatedText: '',
      direction: 'es-to-zh',
      timestamp: Date.now(),
      status: 'translating',
    };

    setMessages((prev) => [...prev, newMsg]);

    // Read current model & context from refs (avoids stale closures!)
    const activeModel = currentModelRef.current;
    const recentContext = messagesRef.current
      .filter((m) => m.status === 'done' && m.translatedText)
      .slice(-3)
      .map((m) => ({ sourceText: m.sourceText, translatedText: m.translatedText }));

    try {
      const result = await translateText(
        spanishText,
        'es-MX',
        'zh-CN',
        activeModel.id,
        activeModel.tier,
        recentContext
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: 'done',
                translatedText: result.translation,
                provider: result.provider,
                modelUsed: result.modelUsed,
                durationMs: result.durationMs,
                isFallback: result.isFallback,
                requestedModel: result.requestedModel,
                fallbackReason: result.fallbackReason,
              }
            : m
        )
      );

      // Speak Chinese only if user explicitly unmuted (Headphones recommended)
      if (!isMuted && result.translation) {
        speechSynthesisService.speak(result.translation, 'zh-CN');
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: 'error',
                errorMessage: err.message || '翻译失败',
              }
            : m
        )
      );
    }
  };

  // 5. Toggle Continuous Listening (Pause / Resume)
  const handleToggleListening = () => {
    if (isListening) {
      stopContinuousListening();
    } else {
      startContinuousListening();
    }
  };

  // 6. Voice Output Mute Toggle
  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    speechSynthesisService.setMuted(newMuted);
  };

  // 7. Toggle ASR Engine Mode (Local Web Speech vs Cloud Whisper)
  const handleToggleAsrMode = () => {
    const nextMode: AsrEngineMode = asrMode === 'local' ? 'cloud-whisper' : 'local';
    setAsrMode(nextMode);
    asrModeRef.current = nextMode;

    if (isListening) {
      stopContinuousListening();
      setTimeout(() => {
        startContinuousListening();
      }, 150);
    }
  };

  // 8. Reverse Translation: Text Input Submit (Chinese ➔ Mexican Spanish)
  const handleTextInputSubmit = async (chineseText: string) => {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: TranslationMessage = {
      id: messageId,
      sourceText: chineseText,
      translatedText: '',
      direction: 'zh-to-es',
      timestamp: Date.now(),
      status: 'translating',
      isManualInput: true,
    };

    setMessages((prev) => [...prev, newMsg]);

    const activeModel = currentModelRef.current;
    const recentContext = messagesRef.current
      .filter((m) => m.status === 'done' && m.translatedText)
      .slice(-3)
      .map((m) => ({ sourceText: m.sourceText, translatedText: m.translatedText }));

    try {
      const result = await translateText(
        chineseText,
        'zh-CN',
        'es-MX',
        activeModel.id,
        activeModel.tier,
        recentContext
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: 'done',
                translatedText: result.translation,
                provider: result.provider,
                modelUsed: result.modelUsed,
                durationMs: result.durationMs,
                isFallback: result.isFallback,
                requestedModel: result.requestedModel,
                fallbackReason: result.fallbackReason,
              }
            : m
        )
      );

      // Automatically speak Mexican Spanish out loud for the counterpart
      if (result.translation) {
        speechSynthesisService.speak(result.translation, 'es-MX', true);
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: 'error',
                errorMessage: err.message || '翻译失败',
              }
            : m
        )
      );
    }
  };

  // 9. Reverse Translation: Push-to-Talk "按住说话" (Hold to Speak Chinese ➔ Speak Spanish)
  const handleStartHoldToTalk = () => {
    setIsHoldingToTalk(true);
    holdToTalkTranscriptRef.current = '';

    // Stop continuous listening temporarily
    stopContinuousListening();

    speechRecognitionService.startPushToTalk('zh-CN', {
      onInterim: (text) => {
        holdToTalkTranscriptRef.current = text;
      },
      onFinal: (text) => {
        holdToTalkTranscriptRef.current = text;
      },
      onError: (err) => {
        console.warn('Hold to talk error:', err);
      },
      onListeningChange: () => {},
    });
  };

  const handleStopHoldToTalk = async () => {
    setIsHoldingToTalk(false);
    await speechRecognitionService.stopPushToTalk();

    const capturedChinese = holdToTalkTranscriptRef.current.trim();
    if (capturedChinese) {
      handleTextInputSubmit(capturedChinese);
    }

    // Resume continuous Mexican Spanish listening
    setTimeout(() => {
      startContinuousListening();
    }, 400);
  };

  // 10. Clear Current Project Messages (Restart current session)
  const handleClearHistory = () => {
    setMessages([]);
    setInterimText('');
    syncCurrentProject([]);
  };

  const handleExportSession = () => {
    if (messages.length === 0) {
      alert('当前暂无可导出的翻译记录');
      return;
    }

    const lines = messages.map((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      const speaker = m.direction === 'es-to-zh' ? '🇲🇽 墨西哥西语' : '🇨🇳 中文发言';
      return `[${time}] ${speaker}\n原文: ${m.sourceText}\n译文: ${m.translatedText || '(未完成)'}\n`;
    });

    const content = `MoHua 墨华同传 - 对话记录导出\n项目: ${currentProjectTitle}\n导出时间: ${new Date().toLocaleString()}\n总记录数: ${messages.length} 句\n\n${lines.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProjectTitle.replace(/[/\\?%*:|"<>]/g, '_')}_同传记录.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 11. Project Management Handlers
  const handleCreateNewProject = (customName?: string) => {
    const newProj = createNewProject(customName);
    const updatedList = [newProj, ...projectsRef.current];
    setProjects(updatedList);
    projectsRef.current = updatedList;
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedList.slice(0, 30)));
      localStorage.setItem(CURRENT_PROJECT_ID_KEY, newProj.id);
    } catch(e) {}

    setCurrentProjectId(newProj.id);
    currentProjectIdRef.current = newProj.id;
    setMessages([]);
    messagesRef.current = [];
    setInterimText('');

    // Sync new empty project to server
    saveSessionToServer({
      id: newProj.id,
      title: newProj.title,
      customName: newProj.customName,
      clientName: newProj.clientName || '同传客户端',
      timestamp: newProj.createdAt,
      messageCount: 0,
      messages: [],
    });
  };

  const handleSelectProject = (projectId: string) => {
    const target = projectsRef.current.find(p => p.id === projectId);
    if (!target) return;

    setCurrentProjectId(target.id);
    currentProjectIdRef.current = target.id;
    setMessages(target.messages || []);
    messagesRef.current = target.messages || [];
    setInterimText('');
    try {
      localStorage.setItem(CURRENT_PROJECT_ID_KEY, target.id);
    } catch(e) {}
  };

  const handleRenameCurrentProject = (newCustomName: string) => {
    const projId = currentProjectIdRef.current;
    if (!projId) return;

    setProjects(prevProjects => {
      const idx = prevProjects.findIndex(p => p.id === projId);
      if (idx === -1) return prevProjects;

      const target = prevProjects[idx];
      const timePrefix = formatProjectTime(new Date(target.createdAt));
      const newTitle = newCustomName && newCustomName.trim()
        ? `${timePrefix} ${newCustomName.trim()}`
        : timePrefix;

      const updatedProj: ProjectSession = {
        ...target,
        title: newTitle,
        customName: newCustomName.trim(),
        updatedAt: Date.now(),
      };

      const updatedList = [...prevProjects];
      updatedList[idx] = updatedProj;

      try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedList.slice(0, 30)));
      } catch(e) {}

      saveSessionToServer({
        id: updatedProj.id,
        title: updatedProj.title,
        customName: updatedProj.customName,
        clientName: updatedProj.clientName || '同传客户端',
        timestamp: updatedProj.createdAt,
        messageCount: updatedProj.messages.length,
        messages: updatedProj.messages,
      });

      return updatedList;
    });
  };

  const handleDeleteProject = (projectId: string) => {
    const remaining = projectsRef.current.filter(p => p.id !== projectId);
    if (remaining.length === 0) {
      const fresh = createNewProject();
      remaining.push(fresh);
    }

    setProjects(remaining);
    projectsRef.current = remaining;
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(remaining.slice(0, 30)));
    } catch(e) {}

    if (currentProjectIdRef.current === projectId) {
      const nextActive = remaining[0];
      setCurrentProjectId(nextActive.id);
      currentProjectIdRef.current = nextActive.id;
      setMessages(nextActive.messages || []);
      messagesRef.current = nextActive.messages || [];
      try {
        localStorage.setItem(CURRENT_PROJECT_ID_KEY, nextActive.id);
      } catch(e) {}
    }
  };

  return (
    <div className="flex flex-col h-[100svh] w-full max-w-md mx-auto bg-[#0b0f19] text-gray-100 overflow-hidden relative shadow-2xl">
      {/* First-visit Hero Activation Overlay */}
      {!hasStarted && (
        <StartOverlay
          onStart={handleStartSession}
          onStartTypingMode={handleStartTypingSession}
          error={startError}
        />
      )}

      {/* Inactivity Auto-pause Toast Banner */}
      {autoPauseNotice && (
        <div className="absolute top-14 left-3 right-3 z-50 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs shadow-lg backdrop-blur-md flex items-center justify-between animate-fadeIn">
          <span>⏱️ {autoPauseNotice}</span>
          <button
            onClick={() => setAutoPauseNotice(null)}
            className="text-amber-400 hover:text-white text-xs ml-2 px-1 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Face-to-Face Dual-Screen Split View */}
      {isFaceToFaceActive && (
        <FaceToFaceView
          messages={messages}
          interimText={interimText}
          isListening={isListening}
          onClose={() => setIsFaceToFaceActive(false)}
          onToggleListening={handleToggleListening}
        />
      )}

      {/* Main App Layout */}
      <Header
        currentModel={currentModel}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        isWakeLockActive={isWakeLockActive}
        isListening={isListening}
        asrMode={asrMode}
        onToggleAsrMode={handleToggleAsrMode}
        onOpenFaceToFace={() => setIsFaceToFaceActive(true)}
        onExportSession={handleExportSession}
        projectTitle={currentProjectTitle}
        onOpenProjectDrawer={() => setIsProjectDrawerOpen(true)}
        onOpenRenameModal={() => setIsRenameModalOpen(true)}
      />

      {/* Live Transcript Waterfall */}
      <LiveTranscript
        messages={messages}
        interimText={interimText}
        isListening={isListening}
        onClear={handleClearHistory}
      />

      {/* Bottom Controls Bar */}
      <BottomControls
        isListening={isListening}
        onToggleListening={handleToggleListening}
        onOpenTextInput={() => setIsTextInputModalOpen(true)}
        onStartHoldToTalk={handleStartHoldToTalk}
        onStopHoldToTalk={handleStopHoldToTalk}
        isHoldingToTalk={isHoldingToTalk}
      />

      {/* Modal: Text Input (Chinese ➔ Spanish) */}
      <TextInputModal
        isOpen={isTextInputModalOpen}
        onClose={() => setIsTextInputModalOpen(false)}
        onSubmit={handleTextInputSubmit}
      />

      {/* Modal: Model Selector (Users switch models freely with 0 API keys) */}
      <ModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        models={models}
        currentModel={currentModel}
        onSelectModel={(model) => {
          setCurrentModel(model);
          currentModelRef.current = model;
          apiKeyService.setActiveModelId(model.id);
        }}
      />

      {/* Modal: Rename Current Project (Custom Project Name) */}
      <RenameProjectModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        currentCustomName={currentProject?.customName || ''}
        defaultTimePrefix={defaultTimePrefix}
        onSave={handleRenameCurrentProject}
      />

      {/* Drawer: Projects & History */}
      <ProjectDrawerModal
        isOpen={isProjectDrawerOpen}
        onClose={() => setIsProjectDrawerOpen(false)}
        currentProjectId={currentProjectId}
        projects={projects}
        onSelectProject={handleSelectProject}
        onNewProject={() => handleCreateNewProject()}
        onRenameProject={(pId, newName) => {
          if (pId === currentProjectId) {
            handleRenameCurrentProject(newName);
          } else {
            setProjects(prev => {
              const updated = prev.map(p => {
                if (p.id !== pId) return p;
                const timePrefix = formatProjectTime(new Date(p.createdAt));
                const title = newName.trim() ? `${timePrefix} ${newName.trim()}` : timePrefix;
                return { ...p, title, customName: newName.trim(), updatedAt: Date.now() };
              });
              try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated.slice(0, 30))); } catch(e) {}
              return updated;
            });
          }
        }}
        onDeleteProject={handleDeleteProject}
      />
    </div>
  );
}

export default App;
