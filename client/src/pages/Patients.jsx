import React, { useState, useEffect, useCallback } from 'react';
import { patientsApi } from '../api';
import Modal from '../components/Modal';

const INITIAL_FORM = {
  name: '',
  birth_date: '',
  gender: '',
  phone: '',
  email: '',
  address: '',
  memo: '',
};

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (searchName) params.name = searchName;
      if (searchPhone) params.phone = searchPhone;
      const data = await patientsApi.getAll(params);
      setPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchName, searchPhone]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (patient) => {
    setEditTarget(patient);
    setForm({
      name: patient.name || '',
      birth_date: patient.birth_date || '',
      gender: patient.gender || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      memo: patient.memo || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = '이름을 입력해주세요';
    if (form.phone && !/^[\d\-]+$/.test(form.phone)) errors.phone = '올바른 전화번호 형식이 아닙니다';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = '올바른 이메일 형식이 아닙니다';
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
        await patientsApi.update(editTarget.id, form);
      } else {
        await patientsApi.create(form);
      }
      setModalOpen(false);
      fetchPatients();
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await patientsApi.delete(id);
      setDeleteConfirm(null);
      fetchPatients();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="이름으로 검색"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="input-field w-48"
          />
          <input
            type="text"
            placeholder="전화번호로 검색"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="input-field w-48"
          />
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          환자 등록
        </button>
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
        ) : patients.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p>등록된 환자가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">이름</th>
                  <th className="table-th">생년월일</th>
                  <th className="table-th">성별</th>
                  <th className="table-th">연락처</th>
                  <th className="table-th">이메일</th>
                  <th className="table-th">등록일</th>
                  <th className="table-th text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium">{p.name}</td>
                    <td className="table-td">{p.birth_date || '-'}</td>
                    <td className="table-td">
                      {p.gender ? (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.gender === '남' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                          {p.gender}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="table-td">{p.phone || '-'}</td>
                    <td className="table-td text-gray-500">{p.email || '-'}</td>
                    <td className="table-td text-gray-500">
                      {p.created_at ? p.created_at.slice(0, 10) : '-'}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                          title="삭제"
                        >
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
      <p className="text-sm text-gray-500">총 {patients.length}명의 환자</p>

      {/* 등록/수정 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '환자 정보 수정' : '환자 등록'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`input-field ${formErrors.name ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="홍길동"
              />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
              <input
                type="date"
                name="birth_date"
                value={form.birth_date}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
              <select name="gender" value={form.gender} onChange={handleChange} className="input-field">
                <option value="">선택 안함</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={`input-field ${formErrors.phone ? 'border-red-300' : ''}`}
                placeholder="010-0000-0000"
              />
              {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`input-field ${formErrors.email ? 'border-red-300' : ''}`}
                placeholder="example@email.com"
              />
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="input-field"
                placeholder="서울시 강남구"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              name="memo"
              value={form.memo}
              onChange={handleChange}
              rows={3}
              className="input-field resize-none"
              placeholder="특이사항, 병력 등..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              취소
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? '저장 중...' : editTarget ? '수정 완료' : '등록'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="환자 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            <strong>{deleteConfirm?.name}</strong> 환자를 삭제하시겠습니까?
            <br />
            <span className="text-sm text-red-500">이 작업은 되돌릴 수 없습니다.</span>
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
              취소
            </button>
            <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger">
              삭제
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
