// ===== Create Memory Interface =====
import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore, ACTIONS } from '../../store';
import {
  generateStory, generateTitle, generateTags, detectMood,
  translateToAllLanguages, createRecognition, isSpeechSupported,
  LANGUAGES, SPEECH_LANGUAGES,
} from '../../services/aiService';
import {
  addMemory, getCurrentMetadata, fileToBase64, getFileCategory, formatFileSize,
} from '../../services/memoryService';

const FILE_ICONS = {
  image: '🖼',
  video: '🎬',
  audio: '🎵',
  pdf: '📄',
  zip: '📦',
  document: '📎',
};

const ACCEPTED_TYPES = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z';

export default function CreateMemory() {
  const { state, dispatch, addToast, setLoading, setView } = useStore();
  const isDark = state.theme === 'dark';

  // Form State
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [aiStory, setAiStory] = useState('');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState('en-US');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [translations, setTranslations] = useState({});
  const [previewLang, setPreviewLang] = useState('en');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mood, setMood] = useState(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState(null); // { data, name, duration, mimeType }
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const recordingTimeRef = useRef(0);
  const speechSupported = isSpeechSupported();

  // Processing State
  const [aiProcessing, setAiProcessing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Theme-aware styles
  const cardBg = isDark ? 'rgba(255, 248, 235, 0.04)' : 'rgba(255, 255, 255, 0.85)';
  const cardBorder = isDark ? '1px solid rgba(201, 168, 76, 0.18)' : '1px solid rgba(139, 90, 43, 0.25)';
  const inputBg = isDark ? 'rgba(10, 5, 2, 0.7)' : 'rgba(255, 255, 255, 0.95)';
  const inputBorder = isDark ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid rgba(139, 90, 43, 0.35)';
  const textColor = isDark ? '#fdf6ed' : '#1c0e06';
  const labelColor = isDark ? 'var(--gold-light)' : '#5c3514';
  const subtextColor = isDark ? 'rgba(245, 234, 216, 0.55)' : 'rgba(60, 40, 20, 0.65)';

  // Auto-detect mood & auto-translate typed text to all languages
  useEffect(() => {
    if (!textContent.trim()) {
      if (!aiStory) setTranslations({});
      return;
    }
    const debounce = setTimeout(async () => {
      setMood(detectMood(textContent));

      if (!aiStory) {
        setTranslating(true);
        const translated = await translateToAllLanguages(textContent);
        setTranslations(translated);
        setTranslating(false);
      }
    }, 600);
    return () => clearTimeout(debounce);
  }, [textContent, aiStory]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          recordingTimeRef.current = t + 1;
          return t + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearTimeout(timerRef.current);
  }, [isRecording]);

  // Clean up audio streams on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const formatTimer = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Voice Recording Handlers
  const startRecording = useCallback(async () => {
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    setInterimTranscript('');
    audioChunksRef.current = [];

    // Start Web Speech API recognition if supported
    if (speechSupported) {
      try {
        recognitionRef.current = createRecognition({
          language: speechLanguage,
          onResult: (text) => setTranscript(text),
          onInterim: (text) => setInterimTranscript(text),
          onEnd: (finalText) => {
            setInterimTranscript('');
            if (finalText) {
              setTranscript(finalText);
              setTextContent(prev => (prev ? `${prev}\n${finalText}` : finalText));
              processAI(finalText);
            }
          },
          onError: (error) => {
            if (error !== 'no-speech' && error !== 'aborted') {
              console.warn(`Speech recognition error: ${error}`);
            }
          },
        });
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Speech recognition start failed:', e);
      }
    }

    // Start MediaRecorder for actual voice audio recording stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Audio level analyser for visualizer
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((acc, val) => acc + val, 0);
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      } catch {}

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const duration = recordingTimeRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result;
          setRecordedAudio({
            data: base64Data,
            name: `Voice_Recording_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
            duration,
            mimeType,
            timestamp: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(audioBlob);

        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      addToast({ type: 'info', message: '🎙 Real-Time Voice Recording active! Speak into your mic.' });
    } catch (err) {
      console.error('Microphone recording error:', err);
      if (speechSupported) {
        setIsRecording(true);
        addToast({ type: 'info', message: '🎙 Speech-to-Text active (microphone audio stream restricted).' });
      } else {
        addToast({ type: 'error', message: 'Could not access microphone for real-time voice recording.' });
      }
    }
  }, [speechSupported, speechLanguage, addToast]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setAudioLevel(0);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
  }, []);

  // AI Story & Translation Generation
  const processAI = useCallback(async (rawText) => {
    if (!rawText?.trim()) return;
    setAiProcessing(true);

    try {
      const story = await generateStory(rawText);
      setAiStory(story);

      const generatedTags = await generateTags(rawText);
      setTags(prev => [...new Set([...prev, ...generatedTags])]);
      setMood(detectMood(rawText));

      setTranslating(true);
      const translated = await translateToAllLanguages(story || rawText);
      setTranslations(translated);
      setTranslating(false);

      addToast({ type: 'success', message: '✦ AI Story & Translations generated!' });
    } catch (err) {
      addToast({ type: 'error', message: 'AI processing encountered an issue.' });
    } finally {
      setAiProcessing(false);
      setTranslating(false);
    }
  }, [title, addToast]);

  // File Upload Handling
  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const maxSize = 25 * 1024 * 1024; // 25MB max
    const newFiles = [];

    for (const file of files) {
      if (file.size > maxSize) {
        addToast({ type: 'error', message: `${file.name} exceeds maximum allowed size (25MB)` });
        continue;
      }

      try {
        const data = await fileToBase64(file);
        const category = getFileCategory(file);
        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          category,
          data,
          preview: category === 'image' ? data : null,
        });
      } catch {
        addToast({ type: 'error', message: `Could not load ${file.name}` });
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0) {
      addToast({ type: 'success', message: `Added ${newFiles.length} attachment(s)` });
    }
  }, [addToast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const removeFile = (id) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  // Save Memory directly to Diary
  const handleSave = async () => {
    const storyText = aiStory || textContent || transcript;
    if (!storyText.trim() && uploadedFiles.length === 0) {
      addToast({ type: 'error', message: 'Please write a note, record voice, or attach files.' });
      return;
    }

    setSaving(true);
    setLoading(true, 'Preserving memory into your luxury diary...');

    try {
      const metadata = await getCurrentMetadata();

      const images = uploadedFiles.filter(f => f.category === 'image');
      const videos = uploadedFiles.filter(f => f.category === 'video');
      const audioFiles = uploadedFiles.filter(f => f.category === 'audio');
      const documents = uploadedFiles.filter(f => ['pdf', 'document', 'zip'].includes(f.category));

      const finalTranslations = Object.keys(translations).length > 0
        ? translations
        : storyText ? { en: storyText } : {};

      const finalTags = [...tags];
      if (recordedAudio && !finalTags.includes('voice-recording')) {
        finalTags.push('voice-recording');
      }

      const memoryData = {
        title: title.trim() || 'Untitled Memory',
        textContent,
        transcript,
        aiStory: aiStory || storyText,
        translations: finalTranslations,
        tags: finalTags,
        mood,
        images: images.map(f => ({ name: f.name, data: f.data })),
        videos: videos.map(f => ({ name: f.name, data: f.data })),
        audioFiles: recordedAudio
          ? [{ name: recordedAudio.name, data: recordedAudio.data, duration: recordedAudio.duration }, ...audioFiles.map(f => ({ name: f.name, data: f.data }))]
          : audioFiles.map(f => ({ name: f.name, data: f.data })),
        documents: documents.map(f => ({ name: f.name, data: f.data })),
        recordedAudio,
        ...metadata,
      };

      const saved = await addMemory(memoryData);
      dispatch({ type: ACTIONS.ADD_MEMORY, payload: saved });

      addToast({ type: 'success', message: '✦ Memory saved to your 3D Diary!' });
      setView('home');
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to save memory.' });
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const previewStory = translations[previewLang] || aiStory || textContent || '';

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '84px',
      paddingBottom: '60px',
      maxWidth: '850px',
      margin: '0 auto',
      paddingLeft: '20px',
      paddingRight: '20px',
    }}>
      {/* Page Title Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '4px' }}>✦</div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.4rem',
          fontWeight: 700,
          fontStyle: 'italic',
          background: isDark
            ? 'linear-gradient(135deg, #c9a84c, #f4dc96)'
            : 'linear-gradient(135deg, #6b4423, #a86e3b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '6px',
        }}>
          Create Digital Memory
        </h1>
        <p style={{ color: subtextColor, fontSize: '0.92rem' }}>
          Speak, type or upload — preserved forever inside your realistic 3D diary
        </p>
      </div>

      {/* Voice Recording Box */}
      <div style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: '16px',
        padding: '26px',
        marginBottom: '22px',
        textAlign: 'center',
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ color: labelColor, fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '4px' }}>
          🎙 Real-Time Voice Recording
        </h3>
        <p style={{ fontSize: '0.82rem', color: subtextColor, marginBottom: '16px' }}>
          Full Microphone Audio Capture & Spoken Language Recognition
        </p>

        {/* Language Selector */}
        <div style={{ marginBottom: '18px', display: 'inline-block' }}>
          <select
            value={speechLanguage}
            onChange={e => setSpeechLanguage(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: inputBorder,
              background: inputBg,
              color: textColor,
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {SPEECH_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Record Mic Button & Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={aiProcessing}
            style={{
              width: '80px', height: '80px',
              borderRadius: '50%',
              border: isRecording ? '3px solid #ef4444' : '3px solid var(--gold)',
              background: isRecording ? 'rgba(239, 68, 68, 0.18)' : 'rgba(201, 168, 76, 0.15)',
              color: isRecording ? '#ef4444' : 'var(--gold-light)',
              fontSize: '2.2rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isRecording
                ? `0 0 ${20 + audioLevel / 2}px rgba(239, 68, 68, 0.7)`
                : '0 6px 20px rgba(201, 168, 76, 0.3)',
              transform: isRecording ? `scale(${1 + (audioLevel / 300)})` : 'scale(1)',
              transition: 'all 0.15s ease',
            }}
          >
            {isRecording ? '⏹' : '🎙'}
          </button>

          {/* Live Waveform Pulse Bars when Recording */}
          {isRecording && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '1.15rem' }}>
                Recording: {formatTimer(recordingTime)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
                {[0.6, 1, 0.4, 0.8, 1.2, 0.7, 0.5, 1.1, 0.9, 0.3].map((factor, idx) => {
                  const barHeight = Math.max(4, Math.min(24, Math.round(audioLevel * factor * 0.3)));
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '4px',
                        height: `${barHeight}px`,
                        backgroundColor: '#ef4444',
                        borderRadius: '2px',
                        transition: 'height 0.1s ease',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Recorded Audio Player Preview */}
          {recordedAudio && !isRecording && (
            <div style={{
              width: '100%',
              padding: '16px',
              background: isDark ? 'rgba(201, 168, 76, 0.1)' : 'rgba(201, 168, 76, 0.15)',
              border: '1.5px solid rgba(201, 168, 76, 0.35)',
              borderRadius: '12px',
              textAlign: 'left',
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: labelColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎵 Recorded Voice Audio</span>
                  {recordedAudio.duration > 0 && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({formatTimer(recordedAudio.duration)})</span>
                  )}
                </div>
                <button
                  onClick={() => setRecordedAudio(null)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  ✕ Discard Recording
                </button>
              </div>
              <audio controls src={recordedAudio.data} style={{ width: '100%', height: '36px', borderRadius: '6px' }} />
            </div>
          )}
        </div>
      </div>

      {/* Gemini AI Memory Assistant Box */}
      <div style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: '16px',
        padding: '26px',
        marginBottom: '22px',
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ color: labelColor, fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✨</span> Gemini AI Memory Assistant
          </h3>
          <span style={{ fontSize: '0.75rem', background: 'rgba(201, 168, 76, 0.15)', color: labelColor, padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            Powered by Google Gemini AI
          </span>
        </div>

        <p style={{ fontSize: '0.82rem', color: subtextColor, marginBottom: '14px' }}>
          Describe your thoughts or notes below — Gemini AI will refine and craft your entry into a beautiful diary story.
        </p>

        <textarea
          value={textContent}
          onChange={e => setTextContent(e.target.value)}
          placeholder="Tell Gemini AI what happened today... (e.g., 'Went for a walk at sunset and saw an amazing golden sky')"
          style={{
            width: '100%',
            minHeight: '140px',
            padding: '16px 18px',
            background: inputBg,
            border: inputBorder,
            borderRadius: '12px',
            color: textColor,
            fontFamily: 'var(--font-serif)',
            fontSize: '1.05rem',
            lineHeight: 1.8,
            resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button
            onClick={async () => {
              if (!textContent.trim()) return;
              setAiProcessing(true);
              try {
                const story = await generateStory(textContent);
                setTextContent(story);
                const generatedTitle = await generateTitle(story);
                if (!title) setTitle(generatedTitle);
                const generatedTags = await generateTags(story);
                setTags(prev => [...new Set([...prev, ...generatedTags])]);
                setMood(detectMood(story));
                addToast({ type: 'success', message: '✨ Gemini AI enhanced your memory entry!' });
              } catch (err) {
                console.error(err);
              } finally {
                setAiProcessing(false);
              }
            }}
            disabled={aiProcessing || !textContent.trim()}
            className="btn-gold"
            style={{ fontSize: '0.88rem', padding: '11px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>✨</span> {aiProcessing ? 'Gemini AI is refining...' : 'Enhance Memory with Gemini AI'}
          </button>
        </div>
      </div>

      {/* Memory Title & Tags */}
      <div style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: '16px',
        padding: '26px',
        marginBottom: '22px',
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.06)',
      }}>
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', color: labelColor, fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>
            📖 Memory Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Give this memory a title..."
            style={{
              width: '100%',
              padding: '14px 18px',
              background: inputBg,
              border: inputBorder,
              borderRadius: '10px',
              color: textColor,
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontStyle: 'italic',
            }}
          />
        </div>

        {/* Tags */}
        <div>
          <label style={{ display: 'block', color: labelColor, fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>
            🏷 Tags
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {tags.map(t => (
              <span key={t} style={{
                padding: '5px 12px',
                background: 'rgba(201, 168, 76, 0.16)',
                border: '1px solid rgba(201, 168, 76, 0.35)',
                borderRadius: '14px',
                fontSize: '0.82rem',
                color: labelColor,
                fontWeight: 500,
              }}>
                #{t} <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '4px' }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag and press Enter..."
              style={{
                flex: 1, padding: '10px 14px',
                background: inputBg,
                border: inputBorder,
                borderRadius: '10px',
                color: textColor,
                fontSize: '0.88rem',
              }}
            />
            <button onClick={addTag} className="btn-ghost" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>Add</button>
          </div>
        </div>
      </div>

      {/* File Upload Zone */}
      <div style={{
        background: cardBg,
        border: cardBorder,
        borderRadius: '16px',
        padding: '26px',
        marginBottom: '32px',
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ color: labelColor, fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '4px' }}>
          📎 Media & Attachment Uploads
        </h3>
        <p style={{ fontSize: '0.82rem', color: subtextColor, marginBottom: '16px' }}>
          Supports Images, Audio, Video, PDF, Documents (DOCX/PPTX/XLSX/TXT), ZIP archives
        </p>

        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--gold)' : 'rgba(201, 168, 76, 0.35)'}`,
            borderRadius: '14px',
            padding: '32px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{isDragging ? '📂' : '⬆'}</div>
          <div style={{ color: textColor, fontSize: '0.95rem', fontWeight: 500 }}>
            Click or drag files here to upload
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            onChange={e => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>

        {/* Uploaded File Previews */}
        {uploadedFiles.length > 0 && (
          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {uploadedFiles.map(f => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 16px',
                background: inputBg,
                border: inputBorder,
                borderRadius: '10px',
              }}>
                {f.preview ? (
                  <img src={f.preview} alt="" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px' }} />
                ) : (
                  <span style={{ fontSize: '1.6rem' }}>{FILE_ICONS[f.category]}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', color: textColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: subtextColor }}>
                    {f.category.toUpperCase()} • {formatFileSize(f.size)}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(f.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#fca5a5',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
        <button onClick={() => setView('home')} className="btn-ghost" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
          ✕ Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-gold" style={{ padding: '14px 36px', fontSize: '1.05rem' }}>
          {saving ? 'Saving to 3D Diary...' : '📖 Save Memory to Diary'}
        </button>
      </div>
    </div>
  );
}
