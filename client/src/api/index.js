// localStorage 기반 데이터 레이어 (기존 axios API와 동일한 인터페이스 유지)

const K = {
  departments: 'med_departments',
  doctors: 'med_doctors',
  patients: 'med_patients',
  appointments: 'med_appointments',
  initialized: 'med_initialized',
};

const TODAY = '2026-06-04';

const SAMPLE = {
  departments: [
    { id: 1, name: '내과', description: '소화기, 호흡기, 순환기 질환' },
    { id: 2, name: '외과', description: '수술적 처치가 필요한 질환' },
    { id: 3, name: '소아과', description: '소아 및 청소년 질환' },
  ],
  doctors: [
    { id: 1, name: '김철수', department_id: 1, specialty: '소화기내과', phone: '02-1234-5001', email: 'kim.cs@hospital.com' },
    { id: 2, name: '이영희', department_id: 1, specialty: '호흡기내과', phone: '02-1234-5002', email: 'lee.yh@hospital.com' },
    { id: 3, name: '박민준', department_id: 2, specialty: '일반외과', phone: '02-1234-5003', email: 'park.mj@hospital.com' },
    { id: 4, name: '정수진', department_id: 3, specialty: '소아청소년과', phone: '02-1234-5004', email: 'jung.sj@hospital.com' },
  ],
  patients: [
    { id: 1, name: '홍길동', birth_date: '1985-03-15', gender: '남', phone: '010-1111-2222', email: 'hong@example.com', address: '서울시 강남구', memo: '고혈압 병력', created_at: '2026-01-10T09:00:00' },
    { id: 2, name: '김민지', birth_date: '1992-07-22', gender: '여', phone: '010-3333-4444', email: 'kim@example.com', address: '서울시 서초구', memo: '', created_at: '2026-02-15T10:30:00' },
    { id: 3, name: '이준호', birth_date: '1978-11-05', gender: '남', phone: '010-5555-6666', email: 'lee@example.com', address: '서울시 송파구', memo: '당뇨 병력', created_at: '2026-03-20T14:00:00' },
    { id: 4, name: '박서연', birth_date: '2015-04-18', gender: '여', phone: '010-7777-8888', email: 'park@example.com', address: '서울시 마포구', memo: '소아 환자', created_at: '2026-04-05T11:00:00' },
    { id: 5, name: '최동현', birth_date: '1967-09-30', gender: '남', phone: '010-9999-0000', email: 'choi@example.com', address: '서울시 용산구', memo: '정기 검진', created_at: '2026-05-01T09:30:00' },
  ],
  appointments: [
    { id: 1, patient_id: 1, doctor_id: 1, appointment_date: TODAY, appointment_time: '09:00', status: '예약됨', reason: '복통', notes: '', created_at: '2026-06-01T10:00:00' },
    { id: 2, patient_id: 2, doctor_id: 2, appointment_date: TODAY, appointment_time: '10:30', status: '완료', reason: '기침, 호흡곤란', notes: '처방전 발급', created_at: '2026-06-01T11:00:00' },
    { id: 3, patient_id: 3, doctor_id: 1, appointment_date: TODAY, appointment_time: '14:00', status: '예약됨', reason: '정기 검진', notes: '', created_at: '2026-06-02T09:00:00' },
    { id: 4, patient_id: 4, doctor_id: 4, appointment_date: TODAY, appointment_time: '15:30', status: '예약됨', reason: '감기', notes: '', created_at: '2026-06-02T10:00:00' },
    { id: 5, patient_id: 5, doctor_id: 3, appointment_date: '2026-06-05', appointment_time: '09:30', status: '예약됨', reason: '외상', notes: '', created_at: '2026-06-03T09:00:00' },
    { id: 6, patient_id: 1, doctor_id: 2, appointment_date: '2026-06-05', appointment_time: '11:00', status: '예약됨', reason: '폐 검사', notes: '', created_at: '2026-06-03T10:00:00' },
    { id: 7, patient_id: 2, doctor_id: 3, appointment_date: '2026-06-06', appointment_time: '13:00', status: '예약됨', reason: '수술 후 경과', notes: '', created_at: '2026-06-03T11:00:00' },
    { id: 8, patient_id: 3, doctor_id: 4, appointment_date: '2026-06-10', appointment_time: '09:00', status: '예약됨', reason: '소아 검진', notes: '', created_at: '2026-06-03T12:00:00' },
    { id: 9, patient_id: 4, doctor_id: 1, appointment_date: '2026-06-03', appointment_time: '16:00', status: '완료', reason: '두통', notes: '', created_at: '2026-05-30T10:00:00' },
    { id: 10, patient_id: 5, doctor_id: 2, appointment_date: '2026-06-02', appointment_time: '10:00', status: '취소', reason: '정기 검진', notes: '환자 취소', created_at: '2026-05-28T09:00:00' },
  ],
};

// ── 스토리지 유틸 ─────────────────────────────────────────────
function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function nextId(items) {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

(function init() {
  if (read(K.initialized)) return;
  write(K.departments, SAMPLE.departments);
  write(K.doctors, SAMPLE.doctors);
  write(K.patients, SAMPLE.patients);
  write(K.appointments, SAMPLE.appointments);
  write(K.initialized, true);
})();

// ── JOIN 헬퍼 ─────────────────────────────────────────────────
function enrichDoctor(doc) {
  const depts = read(K.departments) || [];
  const dept = depts.find((d) => d.id === doc.department_id);
  return { ...doc, department_name: dept?.name || '' };
}

function enrichAppointment(appt) {
  const patients = read(K.patients) || [];
  const doctors = read(K.doctors) || [];
  const depts = read(K.departments) || [];
  const patient = patients.find((p) => p.id === appt.patient_id);
  const doctor = doctors.find((d) => d.id === appt.doctor_id);
  const dept = depts.find((d) => d.id === doctor?.department_id);
  return {
    ...appt,
    patient_name: patient?.name || '',
    patient_phone: patient?.phone || '',
    doctor_name: doctor?.name || '',
    department_name: dept?.name || '',
  };
}

// ── 진료과 ────────────────────────────────────────────────────
export const departmentsApi = {
  getAll: () => Promise.resolve(read(K.departments) || []),
  getById: (id) => {
    const item = (read(K.departments) || []).find((i) => i.id === Number(id));
    return item ? Promise.resolve(item) : Promise.reject(new Error('Not found'));
  },
  create: (data) => {
    const items = read(K.departments) || [];
    const newItem = { ...data, id: nextId(items) };
    write(K.departments, [...items, newItem]);
    return Promise.resolve(newItem);
  },
  update: (id, data) => {
    const items = read(K.departments) || [];
    const idx = items.findIndex((i) => i.id === Number(id));
    if (idx === -1) return Promise.reject(new Error('Not found'));
    items[idx] = { ...items[idx], ...data };
    write(K.departments, items);
    return Promise.resolve(items[idx]);
  },
  delete: (id) => {
    write(K.departments, (read(K.departments) || []).filter((i) => i.id !== Number(id)));
    return Promise.resolve({ success: true });
  },
};

// ── 의사 ──────────────────────────────────────────────────────
export const doctorsApi = {
  getAll: (params = {}) => {
    let items = (read(K.doctors) || []).map(enrichDoctor);
    if (params.department_id) items = items.filter((d) => d.department_id === Number(params.department_id));
    return Promise.resolve(items);
  },
  getById: (id) => {
    const item = (read(K.doctors) || []).find((i) => i.id === Number(id));
    return item ? Promise.resolve(enrichDoctor(item)) : Promise.reject(new Error('Not found'));
  },
  create: (data) => {
    const items = read(K.doctors) || [];
    const newItem = { ...data, department_id: Number(data.department_id), id: nextId(items) };
    write(K.doctors, [...items, newItem]);
    return Promise.resolve(enrichDoctor(newItem));
  },
  update: (id, data) => {
    const items = read(K.doctors) || [];
    const idx = items.findIndex((i) => i.id === Number(id));
    if (idx === -1) return Promise.reject(new Error('Not found'));
    items[idx] = { ...items[idx], ...data, department_id: Number(data.department_id ?? items[idx].department_id) };
    write(K.doctors, items);
    return Promise.resolve(enrichDoctor(items[idx]));
  },
  delete: (id) => {
    write(K.doctors, (read(K.doctors) || []).filter((i) => i.id !== Number(id)));
    return Promise.resolve({ success: true });
  },
};

// ── 환자 ──────────────────────────────────────────────────────
export const patientsApi = {
  getAll: (params = {}) => {
    let items = read(K.patients) || [];
    if (params.name) items = items.filter((p) => p.name.includes(params.name));
    if (params.phone) items = items.filter((p) => (p.phone || '').includes(params.phone));
    return Promise.resolve(items);
  },
  getById: (id) => {
    const item = (read(K.patients) || []).find((i) => i.id === Number(id));
    return item ? Promise.resolve(item) : Promise.reject(new Error('Not found'));
  },
  create: (data) => {
    const items = read(K.patients) || [];
    const newItem = { ...data, id: nextId(items), created_at: new Date().toISOString() };
    write(K.patients, [...items, newItem]);
    return Promise.resolve(newItem);
  },
  update: (id, data) => {
    const items = read(K.patients) || [];
    const idx = items.findIndex((i) => i.id === Number(id));
    if (idx === -1) return Promise.reject(new Error('Not found'));
    items[idx] = { ...items[idx], ...data };
    write(K.patients, items);
    return Promise.resolve(items[idx]);
  },
  delete: (id) => {
    write(K.patients, (read(K.patients) || []).filter((i) => i.id !== Number(id)));
    return Promise.resolve({ success: true });
  },
};

// ── 예약 ──────────────────────────────────────────────────────
export const appointmentsApi = {
  getAll: (params = {}) => {
    let items = (read(K.appointments) || []).map(enrichAppointment);
    if (params.start_date) items = items.filter((a) => a.appointment_date >= params.start_date);
    if (params.end_date) items = items.filter((a) => a.appointment_date <= params.end_date);
    if (params.doctor_id) items = items.filter((a) => a.doctor_id === Number(params.doctor_id));
    if (params.status) items = items.filter((a) => a.status === params.status);
    items.sort((a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time));
    return Promise.resolve(items);
  },
  getById: (id) => {
    const item = (read(K.appointments) || []).find((i) => i.id === Number(id));
    return item ? Promise.resolve(enrichAppointment(item)) : Promise.reject(new Error('Not found'));
  },
  create: (data) => {
    const items = read(K.appointments) || [];
    const newItem = {
      ...data,
      patient_id: Number(data.patient_id),
      doctor_id: Number(data.doctor_id),
      id: nextId(items),
      created_at: new Date().toISOString(),
    };
    write(K.appointments, [...items, newItem]);
    return Promise.resolve(enrichAppointment(newItem));
  },
  update: (id, data) => {
    const items = read(K.appointments) || [];
    const idx = items.findIndex((i) => i.id === Number(id));
    if (idx === -1) return Promise.reject(new Error('Not found'));
    items[idx] = { ...items[idx], ...data };
    if (data.patient_id) items[idx].patient_id = Number(data.patient_id);
    if (data.doctor_id) items[idx].doctor_id = Number(data.doctor_id);
    write(K.appointments, items);
    return Promise.resolve(enrichAppointment(items[idx]));
  },
  delete: (id) => {
    write(K.appointments, (read(K.appointments) || []).filter((i) => i.id !== Number(id)));
    return Promise.resolve({ success: true });
  },
};

// ── 대시보드 ──────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => {
    const appts = read(K.appointments) || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = new Date().toISOString().slice(0, 7);
    return Promise.resolve({
      today_appointments: appts.filter((a) => a.appointment_date === todayStr && a.status !== '취소').length,
      total_patients: (read(K.patients) || []).length,
      total_doctors: (read(K.doctors) || []).length,
      monthly_appointments: appts.filter((a) => a.appointment_date.startsWith(monthStr) && a.status !== '취소').length,
    });
  },
  getToday: () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const items = (read(K.appointments) || [])
      .filter((a) => a.appointment_date === todayStr)
      .map(enrichAppointment)
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    return Promise.resolve(items);
  },
};

// ── sync 헬퍼 (AIBooking에서 직접 사용) ──────────────────────
export const store = {
  getDoctors: () => (read(K.doctors) || []).map(enrichDoctor),
  getDepartments: () => read(K.departments) || [],
  getAppointments: () => (read(K.appointments) || []).map(enrichAppointment),
  getPatients: () => read(K.patients) || [],
  findOrCreatePatient: (name, phone = '') => {
    const patients = read(K.patients) || [];
    const existing = patients.find((p) => p.name === name);
    if (existing) return existing;
    const newP = { name, phone, gender: '', birth_date: '', email: '', address: '', memo: 'AI 예약으로 등록', id: nextId(patients), created_at: new Date().toISOString() };
    write(K.patients, [...patients, newP]);
    return newP;
  },
  createAppointment: (data) => {
    const items = read(K.appointments) || [];
    const newItem = { ...data, id: nextId(items), created_at: new Date().toISOString() };
    write(K.appointments, [...items, newItem]);
    return enrichAppointment(newItem);
  },
};

export default { departmentsApi, doctorsApi, patientsApi, appointmentsApi, dashboardApi, store };
