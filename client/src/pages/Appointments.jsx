import React, { useState, useEffect, useCallback } from 'react';
import { appointmentsApi, patientsApi, doctorsApi } from '../api';
import Modal from '../components/Modal';

const STATUS_OPTIONS = ['예약됨', '완료', '취소', '노쇼'];
const STATUS_CONFIG = {
  예약됨: 'bg-blue-100 text-blue-700',
  완료: 'bg-green-100 text-green-700',
  취소: 'bg-gray-100 text-gray-600',
  노쇼: 'bg-red-100 text-red-700',
};

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

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', doctor_id: '', status: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.doctor_id) params.doctor_id = filters.doctor_id;
      if (filters.status) params.status = filters.status;
      const data = await appointmentsApi.getAll(params);
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    Promise.all([patientsApi.getAll(), doctorsApi.getAll()]).then(([p, d]) => {
      setPatients(p);
      setDoctors(d);
    });
  }, []);

  const openCreate = (defaultDate = '') => {
    setEditTarget(null);
    setForm({ ...INITIAL_FORM, appointment_date: defaultDate });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (appt) => {
    setDetailTarget(null);
    setEditTarget(appt);
    setForm({
      patient_id: appt.patient_id || '',
      doctor_id: appt.doctor_id || '',
      appointment_date: appt.appointment_date || '',
      appointment_time: appt.appointment_time || '',
      status: appt.status || '예약됨',
      reason: appt.reason || '',
      notes: appt.notes || '',
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
      if (editTarget) {
        await appointmentsApi.update(editTarget.id, form);
      } else {
        await appointmentsApi.create(form);
      }
      setModalOpen(false);
      fetchAppointments();
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await appointmentsApi.update(id, { status: newStatus });
      fetchAppointments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await appointmentsApi.delete(id);
      setDeleteConfirm(null);
      fetchAppointments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ start_date: '', end_date: '', doctor_id: '', status: '' });
  };

  return (
    <div className="space-y-5">
      {/* 필터 영역 */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">시작 날짜</label>
            <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} className="input-field w-40" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">종료 날짜</label>
            <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} className="input-field w-40" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">담당의</label>
            <select name="doctor_id" value={filters.doctor_id} onChange={handleFilterChange} className="input-field w-36">
              <option value="">전체</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">상태</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field w-28">
              <option value="">전체</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={resetFilters} className="btn-secondary text-sm">초기화</button>
          <button onClick={() => openCreate()} className="btn-primary flex items-center gap-2 ml-auto whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            예약 등록
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>예약 내역이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">날짜</th>
                  <th className="table-th">시간</th>
                  <th className="table-th">환자명</th>
                  <th className="table-th">담당의</th>
                  <th className="table-th">진료과</th>
                  <th className="table-th">진료 사유</th>
                  <th className="table-th">상태</th>
                  <th className="table-th text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium">{appt.appointment_date}</td>
                    <td className="table-td text-blue-600 font-medium">{appt.appointment_time}</td>
                    <td className="table-td">
                      <button onClick={() => setDetailTarget(appt)} className="font-medium text-gray-800 hover:text-blue-600 transition-colors">
                        {appt.patient_name}
                      </button>
                    </td>
                    <td className="table-td">{appt.doctor_name}</td>
                    <td className="table-td text-gray-500">{appt.department_name || '-'}</td>
                    <td className="table-td text-gray-500 max-w-xs truncate">{appt.reason || '-'}</td>
                    <td className="table-td">
                      <select
                        value={appt.status}
                        onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_CONFIG[appt.status]}`}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(appt)} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors" title="수정">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteConfirm(appt)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title="삭제">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500">총 {appointments.length}건의 예약</p>

      {/* 등록/수정 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '예약 수정' : '예약 등록'}
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
          {editTarget && (
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
              {submitting ? '저장 중...' : editTarget ? '수정 완료' : '예약 등록'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 상세 보기 모달 */}
      <Modal isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} title="예약 상세" size="md">
        {detailTarget && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">환자명</p>
                <p className="font-medium">{detailTarget.patient_name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">연락처</p>
                <p className="font-medium">{detailTarget.patient_phone || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">담당의</p>
                <p className="font-medium">{detailTarget.doctor_name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">진료과</p>
                <p className="font-medium">{detailTarget.department_name || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">예약 일시</p>
                <p className="font-medium">{detailTarget.appointment_date} {detailTarget.appointment_time}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">상태</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[detailTarget.status]}`}>
                  {detailTarget.status}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-gray-400 mb-1">진료 사유</p>
                <p className="font-medium">{detailTarget.reason || '-'}</p>
              </div>
              {detailTarget.notes && (
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-400 mb-1">메모</p>
                  <p className="font-medium">{detailTarget.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => openEdit(detailTarget)} className="btn-primary text-sm">수정</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 삭제 확인 */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="예약 삭제" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600">
            <strong>{deleteConfirm?.patient_name}</strong>님의 {deleteConfirm?.appointment_date} {deleteConfirm?.appointment_time} 예약을 삭제하시겠습니까?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">취소</button>
            <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger">삭제</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
