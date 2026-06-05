import React, { useState, useRef, useEffect } from 'react';
import { store } from '../api';
import { chatCompletion, buildSystemPrompt } from '../api/openrouter';

const STEPS = ['문의 인식', '일정 확인', '예약 확정'];
const STEP_MAP = { inquiry: 0, schedule: 1, done: 2 };

function StepBar({ currentPhase }) {
  const step = STEP_MAP[currentPhase] ?? 0;
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i < step ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap ${i <= step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? '' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
          }`}
        >
          {msg.content}
        </div>
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-2 space-y-2">
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => msg.onSelect && msg.onSelect(s)}
                disabled={msg.selected}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                  msg.selected
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-blue-200 bg-blue-50 hover:border-blue-500 hover:bg-blue-100 text-blue-800 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{s.doctorName}</span>
                    <span className="text-xs text-blue-500 ml-2">{s.department}</span>
                  </div>
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {s.date} {s.time} · {s.reason}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingSuccessCard({ booking }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="font-semibold text-green-800">예약이 완료되었습니다!</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white rounded-lg p-2.5">
          <p className="text-xs text-gray-400">환자명</p>
          <p className="font-medium">{booking.patientName}</p>
        </div>
        <div className="bg-white rounded-lg p-2.5">
          <p className="text-xs text-gray-400">담당의</p>
          <p className="font-medium">{booking.doctorName}</p>
        </div>
        <div className="bg-white rounded-lg p-2.5">
          <p className="text-xs text-gray-400">날짜 · 시간</p>
          <p className="font-medium">{booking.date} {booking.time}</p>
        </div>
        <div className="bg-white rounded-lg p-2.5">
          <p className="text-xs text-gray-400">진료 사유</p>
          <p className="font-medium">{booking.reason}</p>
        </div>
      </div>
    </div>
  );
}

export default function AIBooking() {
  const [patientName, setPatientName] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('inquiry');
  const [bookedResult, setBookedResult] = useState(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const conversationRef = useRef([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startSession = () => {
    if (!patientName.trim()) return;
    setSessionStarted(true);
    const welcome = {
      role: 'assistant',
      content: `안녕하세요, ${patientName}님! 저는 AI 예약 도우미입니다.\n\n어떤 증상이나 불편함으로 진료를 원하시나요? 편하게 말씀해 주시면 적합한 의사 선생님과 예약 가능한 시간을 안내해 드리겠습니다.`,
    };
    setMessages([welcome]);
    conversationRef.current = [];
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setInput('');

    const userMsg = { role: 'user', content: text };
    conversationRef.current = [...conversationRef.current, { role: 'user', content: text }];
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const doctors = store.getDoctors();
      const bookedSlots = store.getAppointments().filter((a) => a.status !== '취소');
      const systemPrompt = buildSystemPrompt(patientName, doctors, bookedSlots);

      const aiResponse = await chatCompletion(conversationRef.current, systemPrompt);
      const { message, phase: newPhase, suggestions = [], booking } = aiResponse;

      conversationRef.current = [...conversationRef.current, { role: 'assistant', content: message }];

      setPhase(newPhase || 'inquiry');

      if (newPhase === 'done' && booking) {
        const doctor = doctors.find((d) => d.id === booking.doctorId);
        const patient = store.findOrCreatePatient(patientName);
        store.createAppointment({
          patient_id: patient.id,
          doctor_id: booking.doctorId,
          appointment_date: booking.date,
          appointment_time: booking.time,
          status: '예약됨',
          reason: booking.reason || '',
          notes: 'AI 예약',
        });
        const result = {
          patientName,
          doctorName: doctor?.name || `의사 ID ${booking.doctorId}`,
          date: booking.date,
          time: booking.time,
          reason: booking.reason || '',
        };
        setBookedResult(result);
        setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
      } else if (suggestions.length > 0) {
        const msgWithSuggestions = {
          role: 'assistant',
          content: message,
          suggestions,
          selected: false,
          onSelect: null,
        };
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.length;
          msgWithSuggestions.onSelect = (slot) => handleSelectSlot(slot, idx);
          updated.push(msgWithSuggestions);
          return updated;
        });
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
      }
    } catch (err) {
      const errMsg = err.message.includes('환경변수')
        ? 'API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENROUTER_API_KEY를 설정해 주세요.'
        : `오류가 발생했습니다: ${err.message}`;
      if (err.message.includes('환경변수')) setApiKeyMissing(true);
      setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slot, msgIdx) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIdx ? { ...m, selected: true } : m))
    );
    const confirmText = `${slot.date} ${slot.time}에 ${slot.doctorName} 선생님(${slot.department})으로 예약하겠습니다. 사유: ${slot.reason}`;
    sendMessage(confirmText);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setMessages([]);
    setPatientName('');
    setInput('');
    setPhase('inquiry');
    setBookedResult(null);
    conversationRef.current = [];
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── 시작 화면 ────────────────────────────────────────────────
  if (!sessionStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">AI 예약 도우미</h2>
          <p className="text-gray-500 text-sm mb-8">
            증상을 말씀하시면 AI가 적합한 의사와 예약 시간을 자동으로 제안해 드립니다.
          </p>

          {apiKeyMissing && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left text-sm">
              <p className="font-semibold text-yellow-800 mb-1">⚠ API 키 미설정</p>
              <p className="text-yellow-700">
                <code className="bg-yellow-100 px-1 rounded">client/.env</code> 파일에 아래 내용을 추가하세요:
              </p>
              <pre className="mt-2 bg-yellow-100 p-2 rounded text-xs text-yellow-900">VITE_OPENROUTER_API_KEY=your_key_here</pre>
            </div>
          )}

          <div className="flex gap-3 max-w-sm mx-auto">
            <input
              type="text"
              placeholder="환자 이름을 입력하세요"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startSession()}
              className="input-field flex-1"
              autoFocus
            />
            <button
              onClick={startSession}
              disabled={!patientName.trim()}
              className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              시작
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-left">
            {[
              { icon: '💬', title: '문의 인식', desc: 'AI가 증상을 분석하고 적합한 진료과를 파악합니다' },
              { icon: '📅', title: '일정 확인', desc: '가능한 예약 시간 3개를 자동으로 제안합니다' },
              { icon: '✅', title: '예약 확정', desc: '선택한 시간으로 즉시 예약이 완료됩니다' },
            ].map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="font-semibold text-gray-700 text-sm mb-1">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 채팅 화면 ────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
      {/* 헤더 */}
      <div className="card mb-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">AI 예약 도우미</p>
              <p className="text-xs text-gray-400">{patientName}님 상담 중</p>
            </div>
          </div>
          <button onClick={resetSession} className="btn-secondary text-xs py-1.5 px-3">
            처음으로
          </button>
        </div>
        <StepBar currentPhase={phase} />
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {bookedResult && <BookingSuccessCard booking={bookedResult} />}
        <div ref={chatEndRef} />
      </div>

      {/* 입력 영역 */}
      {!bookedResult ? (
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="메시지를 입력하세요... (Enter로 전송)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="input-field flex-1 resize-none min-h-[44px] max-h-32 py-2.5 disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary px-4 self-end disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button onClick={resetSession} className="btn-primary flex-1">
            새 예약 시작
          </button>
          <a href="/appointments" className="btn-secondary flex-1 text-center">
            예약 목록 보기
          </a>
        </div>
      )}
    </div>
  );
}
