import React, { useState, useEffect, useCallback } from 'react';
import { doctorsApi, departmentsApi } from '../api';
import Modal from '../components/Modal';

const INITIAL_FORM = {
  name: '',
  department_id: '',
  specialty: '',
  phone: '',
  email: '',
};

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [editDept, setEditDept] = useState(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterDept ? { department_id: filterDept } : {};
      const data = await doctorsApi.getAll(params);
      setDoctors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterDept]);

  const fetchDepartments = async () => {
    const data = await departmentsApi.getAll();
    setDepartments(data);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (doctor) => {
    setEditTarget(doctor);
    setForm({
      name: doctor.name || '',
      department_id: doctor.department_id || '',
      specialty: doctor.specialty || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = '이름을 입력해주세요';
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
      const payload = { ...form, department_id: form.department_id || null };
      if (editTarget) {
        await doctorsApi.update(editTarget.id, payload);
      } else {
        await doctorsApi.create(payload);
      }
      setModalOpen(false);
      fetchDoctors();
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await doctorsApi.delete(id);
      setDeleteConfirm(null);
      fetchDoctors();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // 진료과 관리
  const openDeptCreate = () => {
    setEditDept(null);
    setDeptForm({ name: '', description: '' });
    setDeptModalOpen(true);
  };

  const openDeptEdit = (dept) => {
    setEditDept(dept);
    setDeptForm({ name: dept.name, description: dept.description || '' });
    setDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    try {
      if (editDept) {
        await departmentsApi.update(editDept.id, deptForm);
      } else {
        await departmentsApi.create(deptForm);
      }
      setDeptModalOpen(false);
      fetchDepartments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeptDelete = async (id) => {
    if (!window.confirm('진료과를 삭제하시겠습니까?')) return;
    try {
      await departmentsApi.delete(id);
      fetchDepartments();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3 flex-wrap items-center">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="input-field w-44"
          >
            <option value="">전체 진료과</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={openDeptCreate} className="btn-secondary flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            진료과 관리
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            의사 등록
          </button>
        </div>
      </div>

      {/* 의사 카드 그리드 */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : doctors.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p>등록된 의사가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {doctors.map((doc) => (
            <div key={doc.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  {doc.name.charAt(0)}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(doc)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(doc)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-800">{doc.name}</h3>
              {doc.department_name && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                  {doc.department_name}
                </span>
              )}
              {doc.specialty && (
                <p className="text-sm text-gray-500 mt-2">{doc.specialty}</p>
              )}
              {doc.phone && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {doc.phone}
                </p>
              )}
              {doc.email && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 truncate">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {doc.email}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-gray-500">총 {doctors.length}명의 의료진</p>

      {/* 의사 등록/수정 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '의사 정보 수정' : '의사 등록'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {formErrors.submit}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`input-field ${formErrors.name ? 'border-red-300' : ''}`}
              placeholder="김민준"
            />
            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">진료과</label>
            <select name="department_id" value={form.department_id} onChange={handleChange} className="input-field">
              <option value="">선택 안함</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전문 분야</label>
            <input
              type="text"
              name="specialty"
              value={form.specialty}
              onChange={handleChange}
              className="input-field"
              placeholder="소화기내과"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="input-field"
              placeholder="010-0000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="input-field"
              placeholder="doctor@hospital.com"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">취소</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? '저장 중...' : editTarget ? '수정 완료' : '등록'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 진료과 관리 모달 */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="진료과 관리"
        size="lg"
      >
        <div className="space-y-4">
          <form onSubmit={handleDeptSubmit} className="flex gap-2">
            <input
              type="text"
              value={deptForm.name}
              onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field flex-1"
              placeholder="진료과 이름"
            />
            <input
              type="text"
              value={deptForm.description}
              onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))}
              className="input-field flex-1"
              placeholder="설명"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              {editDept ? '수정' : '추가'}
            </button>
            {editDept && (
              <button type="button" onClick={() => { setEditDept(null); setDeptForm({ name: '', description: '' }); }} className="btn-secondary">
                취소
              </button>
            )}
          </form>
          <div className="border rounded-lg overflow-hidden">
            {departments.length === 0 ? (
              <p className="text-center py-8 text-gray-400">등록된 진료과가 없습니다</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">진료과명</th>
                    <th className="table-th">설명</th>
                    <th className="table-th text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{d.name}</td>
                      <td className="table-td text-gray-500">{d.description || '-'}</td>
                      <td className="table-td">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openDeptEdit(d)} className="text-blue-600 hover:text-blue-800 text-sm">수정</button>
                          <button onClick={() => handleDeptDelete(d.id)} className="text-red-500 hover:text-red-700 text-sm">삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="의사 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            <strong>{deleteConfirm?.name}</strong> 의사를 삭제하시겠습니까?
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
