import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { appointmentsApi, patientsApi, doctorsApi } from '../api';
import Modal from '../components/Modal';

const STATUS_COLORS = {
  예약됨: '#3b82f6',
  완료: '#22c55e',
  취소: '#9ca3af',
  노쇼: '#ef4444',
};

const STATUS_CONFIG = {
  예약됨: 'bg-blue-100 text-blue-700',
  완료: 'bg-green-100 text-green-700',
  취소: 'bg-gray-100 text-gray-600',
  노쇼: 'bg-red-100 text-red-700',
};

const STATUS_OPTIONS = ['예약됨', '완료', '취소', '노쇼'];

const TIME_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const min = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${min}`;
});

const INITIAL_FORM = {
  patient_id: '',
  doctor_id: '',
  appointment_date: '',
  appointment_time: '',
  status: '예약됨',
  reason: '',
  notes: '',
};

export default function Calendar() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    Promise.all([patientsApi.getAll(), doctorsApi.getAll()]).then(([p, d]) => {
      setPatients(p);
      setDoctors(d);
    });
  }, []);

  const fetchEvents = async (fetchInfo) => {
    try {
      setLoading(true);
      const start = fetchInfo.startStr.split('T')[0];
      const end = fetchInfo.endStr.split('T')[0];
      const data = await appointmentsApi.getAll({ start_date: start, end_date: end });
      const mapped = data.map((appt) => ({
        id: String(appt.id),
        title: `${appt.appointment_time} ${appt.patient_name}`,
        start: `${appt.appointment_date}T${appt.appointment_time}`,
        backgroundColor: STATUS_COLORS[appt.status] || STATUS_COLORS['예약됨'],
        borderColor: STATUS_COLORS[appt.status] || STATUS_COLORS['예약됨'],
        extendedProps: { ...appt },
      }));
      setEvents(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (info) => {
    setEditMode(false);
    setForm({ ...INITIAL_FORM, appointment_date: info.dateStr });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEventClick = (info) => {
    const appt = info.event.extendedProps;
    setSelectedAppt({ id: info.event.id, ...appt });
    setDetailModal(true);
  };

  const openEditFromDetail = () => {
    setDetailModal(false);
    setEditMode(true);
    setForm({
      patient_id: selectedAppt.patient_id || '',
      doctor_id: selectedAppt.doctor_id || '',
      appointment_date: selectedAppt.appointment_date || '',
      appointment_time: selectedAppt.appointment_time || '',
      status: selectedAppt.status || '예약됨',
      reason: selectedAppt.reason || '',
      notes: selectedAppt.notes || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.patient_id) errors.patient_id = '환자를 선택해주세요';
    if (!form.doctor_id) errors.doctor_id = '의사를 선택해주세요';
    if (!form.appointment_date) errors.appointment_date = '날짜를 선택해주세요';
    if (!form.appointment_time) errors.appointment_time = '시간을 선택해주세요';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      setSubmitting(true);
      if (editMode && selectedAppt) {
        await appointmentsApi.update(selectedAppt.id, form);
      } else {
        await appointmentsApi.create(form);
      }
      setModalOpen(false);
      const calApi = calendarRef.current?.getApi();
      if (calApi) calApi.refetchEvents();
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppt = async () => {
    if (!selectedAppt) return;
    try {
      await appointmentsApi.update(selectedAppt.id, { status: '취소' });
      setDetailModal(false);
      const calApi = calendarRef.current?.getApi();
      if (calApi) calApi.refetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const switchView = (view) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  return (
    <div className="space-y-4">
      {/* 뷰 전환 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => switchView('dayGridMonth')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'dayGridMonth'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            월간
          </button>
          <button
            onClick={() => switchView('timeGridWeek')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'timeGridWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => switchView('timeGridDay')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'timeGridDay'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            일간
          </button>
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span>{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 캘린더 */}
      <div className="card p-4">
        {loading && (
          <div className="flex justify-center py-2">
            <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          height="auto"
          events={fetchEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          buttonText={{ today: '오늘', month: '월', week: '주', day: '일' }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n}개 더보기`}
        />
      </div>

      {/* 예약 등록/수정 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMode ? '예약 수정' : '새 예약 등록'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {formErrors.submit}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">환자 <span className="text-red-500">*</span></label>
              <select name="patient_id" value={form.patient_id} onChange={handleChange} className={`input-field ${formErrors.patient_id ? 'border-red-300' : ''}`}>
                <option value="">환자 선택</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.phone || '-'})</option>)}
              </select>
              {formErrors.patient_id && <p className="text-red-500 text-xs mt-1">{formErrors.patient_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">담당의 <span className="text-red-500">*</span></label>
              <select name="doctor_id" value={form.doctor_id} onChange={handleChange} className={`input-field ${formErrors.doctor_id ? 'border-red-300' : ''}`}>
                <option value="">의사 선택</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.department_name || '-'})</option>)}
              </select>
              {formErrors.doctor_id && <p className="text-red-500 text-xs mt-1">{formErrors.doctor_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜 <span className="text-red-500">*</span></label>
              <input type="date" name="appointment_date" value={form.appointment_date} onChange={handleChange} className={`input-field ${formErrors.appointment_date ? 'border-red-300' : ''}`} />
              {formErrors.appointment_date && <p className="text-red-500 text-xs mt-1">{formErrors.appointment_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시간 <span className="text-red-500">*</span></label>
              <select name="appointment_time" value={form.appointment_time} onChange={handleChange} className={`input-field ${formErrors.appointment_time ? 'border-red-300' : ''}`}>
                <option value="">시간 선택</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {formErrors.appointment_time && <p className="text-red-500 text-xs mt-1">{formErrors.appointment_time}</p>}
            </div>
          </div>
          {editMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select name="status" value={form.status} onChange={handleChange} className="input-field">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">진료 사유</label>
            <input type="text" name="reason" value={form.reason} onChange={handleChange} className="input-field" placeholder="두통, 정기 검진 등..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="input-field resize-none" placeholder="추가 메모..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">취소</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? '저장 중...' : editMode ? '수정 완료' : '예약 등록'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 예약 상세 모달 */}
      <Modal isOpen={detailModal} onClose={() => setDetailModal(false)} title="예약 상세" size="md">
        {selectedAppt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">환자명</p>
                <p className="font-medium">{selectedAppt.patient_name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">연락처</p>
                <p className="font-medium">{selectedAppt.patient_phone || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">담당의</p>
                <p className="font-medium">{selectedAppt.doctor_name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">진료과</p>
                <p className="font-medium">{selectedAppt.department_name || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">예약 일시</p>
                <p className="font-medium">{selectedAppt.appointment_date} {selectedAppt.appointment_time}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">상태</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[selectedAppt.status]}`}>
                  {selectedAppt.status}
                </span>
              </div>
              {selectedAppt.reason && (
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-400 mb-1">진료 사유</p>
                  <p className="font-medium">{selectedAppt.reason}</p>
                </div>
              )}
              {selectedAppt.notes && (
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-400 mb-1">메모</p>
                  <p className="font-medium">{selectedAppt.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              {selectedAppt.status === '예약됨' && (
                <button onClick={handleCancelAppt} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-sm">
                  예약 취소
                </button>
              )}
              <button onClick={openEditFromDetail} className="btn-primary text-sm">수정</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
