require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db/database');

const departmentsRouter = require('./routes/departments');
const doctorsRouter = require('./routes/doctors');
const patientsRouter = require('./routes/patients');
const appointmentsRouter = require('./routes/appointments');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 요청 로깅
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString('ko-KR')}] ${req.method} ${req.url}`);
  next();
});

// DB 초기화
try {
  getDb();
  console.log('데이터베이스가 초기화되었습니다.');
} catch (err) {
  console.error('데이터베이스 초기화 실패:', err);
  process.exit(1);
}

// 라우터 등록
app.use('/api/departments', departmentsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);

// 대시보드 통계 API
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = today.substring(0, 7) + '-01';
    const lastDayOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    )
      .toISOString()
      .split('T')[0];

    const todayAppts = db
      .prepare("SELECT COUNT(*) as cnt FROM appointments WHERE appointment_date = ? AND status != '취소'")
      .get(today);
    const totalPatients = db.prepare('SELECT COUNT(*) as cnt FROM patients').get();
    const totalDoctors = db.prepare('SELECT COUNT(*) as cnt FROM doctors').get();
    const monthlyAppts = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM appointments WHERE appointment_date BETWEEN ? AND ? AND status != '취소'"
      )
      .get(firstDayOfMonth, lastDayOfMonth);

    res.json({
      today_appointments: todayAppts.cnt,
      total_patients: totalPatients.cnt,
      total_doctors: totalDoctors.cnt,
      monthly_appointments: monthlyAppts.cnt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '통계 조회 실패' });
  }
});

// 오늘 예약 목록
app.get('/api/dashboard/today', (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const appointments = db
      .prepare(
        `SELECT
          a.*,
          p.name as patient_name,
          p.phone as patient_phone,
          d.name as doctor_name,
          dept.name as department_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE a.appointment_date = ?
        ORDER BY a.appointment_time ASC`
      )
      .all(today);
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '오늘 예약 조회 실패' });
  }
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다' });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다' });
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`URL: http://localhost:${PORT}`);
});
