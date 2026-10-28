import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StartOverlay } from './components/StartOverlay';
import { LiveTranscript } from './components/LiveTranscript';
import { BottomControls } from './components/BottomControls';
import { TextInputModal } from './components/TextInputModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import type { TranslationMessage, ModelOption } from './types';
import { speechRecognitionService } from './services/speechRecognition';
import { speechSynthesisService } from './services/speechSynthesis';
import { wakeLockService } from './services/wakeLock';
import { fetchAvailableModels, translateText } from './services/translationApi';
import { apiKeyService } from './services/apiKeyService';

export function App() {
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranslationMessage[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);

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

  // References for hold-to-talk Chinese capture
  const holdToTalkTranscriptRef = useRef<string>('');

  // 1. Fetch available models on load
  useEffect(() => {
    fetchAvailableModels().then((data) => {
      if (data && data.length > 0) {
        setModels(data);
        const savedModelId = apiKeyService.getActiveModelId();
        const initialModel = data.find((m) => m.id === savedModelId) || data.find((m) => m.id === 'gemini-2.5-flash') || data[0];
        setCurrentModel(initialModel);
      }
    });
  }, []);

  // 2. Main Continuous Listening start helper (es-MX ➔ zh-CN)
  const startContinuousListening = () => {
    speechRecognitionService.startContinuousListening('es-MX', {
      onInterim: (text) => {
        setInterimText(text);
      },
      onFinal: (text) => {
        setInterimText('');
        if (!text || text.trim().length === 0) return;
        handleMexicanSpanishFinalUtterance(text.trim());
      },
      onError: (err) => {
        console.warn('SpeechRecognition error:', err);
      },
      onListeningChange: (listening) => {
        setIsListening(listening);
      },
    });
  };

  // 3. User taps "轻触开启同传" on StartOverlay
  const handleStartSession = async () => {
    setStartError(null);

    // Check browser speech recognition support
    if (!speechRecognitionService.getIsSupported()) {
      setStartError('PDA或当前设备未检测到语音识别。推荐点击下方直接进入【打字同传模式】，或安装 Google 语音服务。');
      return;
    }

    try {
      // Engage Screen WakeLock to prevent sleep/lock during interpreting
      const locked = await wakeLockService.request();
      setIsWakeLockActive(locked);

      // Start continuous listening
      startContinuousListening();
      setHasStarted(true);
    } catch (err: any) {
      console.error('Session start error:', err);
      setStartError('PDA无法启动麦克风语音，您可以直接点击下方进入【打字同传】');
    }
  };

  // Alternative startup for PDA or typing-only users
  const handleStartTypingSession = () => {
    setStartError(null);
    setHasStarted(true);
    setIsTextInputModalOpen(true);
  };

  // 4. Translate Mexican Spanish utterance to Chinese
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

    try {
      const result = await translateText(
        spanishText,
        'es-MX',
        'zh-CN',
        currentModel.id,
        currentModel.tier
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: 'done',
                translatedText: result.translation,
              }
            : m
        )
      );

      // Auto-speak Chinese translation if unmuted
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
      speechRecognitionService.stopContinuousListening();
      setIsListening(false);
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

  // 7. Reverse Translation: Text Input Submit (Chinese ➔ Mexican Spanish)
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

    try {
      const result = await translateText(
        chineseText,
        'zh-CN',
        'es-MX',
        currentModel.id,
        currentModel.tier
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                status: 'done',
                translatedText: result.translation,
              }
            : m
        )
      );

      // Automatically speak Mexican Spanish out loud for the other person to hear!
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

  // 8. Reverse Translation: Push-to-Talk "按住说话" (Hold to Speak Chinese ➔ Translate & Speak Spanish)
  const handleStartHoldToTalk = () => {
    setIsHoldingToTalk(true);
    holdToTalkTranscriptRef.current = '';

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

  const handleClearHistory = () => {
    setMessages([]);
    setInterimText('');
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

      {/* Main App Layout */}
      <Header
        currentModel={currentModel}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        isWakeLockActive={isWakeLockActive}
        isListening={isListening}
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

      {/* Modal: Model Selector (Users switch models here freely with 0 API keys) */}
      <ModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        models={models}
        currentModel={currentModel}
        onSelectModel={(model) => {
          setCurrentModel(model);
          apiKeyService.setActiveModelId(model.id);
        }}
      />
    </div>
  );
}

export default App;
