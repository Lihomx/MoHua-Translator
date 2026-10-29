import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StartOverlay } from './components/StartOverlay';
import { LiveTranscript } from './components/LiveTranscript';
import { BottomControls } from './components/BottomControls';
import { TextInputModal } from './components/TextInputModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { FaceToFaceView } from './components/FaceToFaceView';
import type { TranslationMessage, ModelOption, AsrEngineMode } from './types';
import { speechRecognitionService } from './services/speechRecognition';
import { cloudAsrService } from './services/cloudAsrService';
import { speechSynthesisService } from './services/speechSynthesis';
import { wakeLockService } from './services/wakeLock';
import { fetchAvailableModels, translateText } from './services/translationApi';
import { apiKeyService } from './services/apiKeyService';

const STORAGE_KEY = 'mohua_transcript_history_v1';

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

  // Active references to prevent React stale closures (Fixing Bug B1 & B5)
  const currentModelRef = useRef<ModelOption>(currentModel);
  const messagesRef = useRef<TranslationMessage[]>(messages);
  const asrModeRef = useRef<AsrEngineMode>(asrMode);
  const holdToTalkTranscriptRef = useRef<string>('');

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  useEffect(() => {
    messagesRef.current = messages;
    // Persist latest 50 messages to localStorage
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
      } catch (e) {
        // ignore
      }
    }
  }, [messages]);

  useEffect(() => {
    asrModeRef.current = asrMode;
  }, [asrMode]);

  // 1. Initialize: load models, stored history, and detect ASR support
  useEffect(() => {
    speechSynthesisService.setMuted(true);

    // Restore saved messages if available
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      // ignore
    }

    // Auto-detect if device has Google Speech Services; if not (e.g. industrial PDA), default to Cloud Whisper
    if (!speechRecognitionService.getIsSupported()) {
      setAsrMode('cloud-whisper');
      asrModeRef.current = 'cloud-whisper';
    }

    // Fetch live models status
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
  }, []);

  // 2. Start Continuous Listening Helper according to active ASR mode
  const startContinuousListening = () => {
    const activeMode = asrModeRef.current;

    if (activeMode === 'cloud-whisper') {
      // Cloud Whisper Mode (for PDA or ultra-low volume environments)
      speechRecognitionService.stopContinuousListening();
      cloudAsrService.startContinuous({
        onInterim: (text) => setInterimText(text),
        onFinal: (text) => {
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
        onInterim: (text) => setInterimText(text),
        onFinal: (text) => {
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

  // 10. Clear & Export Session Records
  const handleClearHistory = () => {
    setMessages([]);
    setInterimText('');
    localStorage.removeItem(STORAGE_KEY);
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

    const content = `MoHua 墨华同传 - 对话记录导出\n导出时间: ${new Date().toLocaleString()}\n总记录数: ${messages.length} 句\n\n${lines.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MoHua_同传记录_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    </div>
  );
}

export default App;
