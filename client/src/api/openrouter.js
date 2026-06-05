const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function chatCompletion(messages, systemPrompt) {
  const API_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
  if (!API_KEY) throw new Error('VITE_OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Medical Reservation AI',
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenRouter 오류 ${res.status}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw, phase: 'inquiry', suggestions: [] };
  }
}

export function buildSystemPrompt(patientName, doctors, bookedSlots) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const doctorList = doctors
    .map((d) => `  - ID:${d.id} ${d.name} (${d.department_name}, ${d.specialty || ''})`)
    .join('\n');

  const bookedList = bookedSlots.length
    ? bookedSlots
        .map((s) => `  - ${s.appointment_date} ${s.appointment_time} | 의사ID:${s.doctor_id} (${s.doctor_name})`)
        .join('\n')
    : '  없음';

  return `당신은 병원 예약 AI 상담 도우미입니다. 반드시 JSON으로만 응답하세요.

## 환자 이름
${patientName}

## 오늘 날짜
${todayStr}

## 진료 가능한 의사 목록
${doctorList}

## 진료 시간
평일 09:00~17:30 (30분 단위)

## 향후 14일 예약된 슬롯 (이 시간대는 예약 불가)
${bookedList}

## 예약 진행 단계
1. **문의 인식**: 환자 증상/사유 파악 → 적합한 진료과·의사 파악
2. **일정 확인**: 환자 원하는 날짜·시간 파악 → 가능한 슬롯 3개 제안
3. **예약 확정**: 환자가 슬롯 선택 → 예약 완료

## 응답 JSON 스키마 (다른 형식 금지)
{
  "message": "환자에게 전달할 안내 메시지",
  "phase": "inquiry" | "schedule" | "done",
  "suggestions": [   // phase=schedule 일 때만 3개 이하 제공
    {
      "doctorId": <숫자>,
      "doctorName": "<이름>",
      "department": "<진료과>",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "reason": "<사유>"
    }
  ],
  "booking": {       // phase=done 일 때만 제공
    "doctorId": <숫자>,
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "reason": "<사유>"
  }
}

## 중요 규칙
- suggestions의 date/time이 bookedSlots에 있으면 절대 제안하지 마세요.
- 주말(토·일)은 제안하지 마세요.
- 오늘 이전 날짜는 제안하지 마세요.
- message는 항상 한국어로 친절하게 작성하세요.`;
}
