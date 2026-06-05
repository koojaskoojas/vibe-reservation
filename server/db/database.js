const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'reservation.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db) {
  // 진료과 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 의사 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id INTEGER,
      specialty TEXT,
      phone TEXT,
      email TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  // 환자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      birth_date TEXT,
      gender TEXT CHECK(gender IN ('남', '여')),
      phone TEXT,
      email TEXT,
      address TEXT,
      memo TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 예약 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT '예약됨' CHECK(status IN ('예약됨', '완료', '취소', '노쇼')),
      reason TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  // 샘플 데이터 삽입 (이미 존재하면 스킵)
  const deptCount = db.prepare('SELECT COUNT(*) as cnt FROM departments').get();
  if (deptCount.cnt === 0) {
    insertSampleData(db);
  }
}

function insertSampleData(db) {
  // 진료과 샘플 데이터
  const insertDept = db.prepare('INSERT INTO departments (name, description) VALUES (?, ?)');
  insertDept.run('내과', '내과 질환 전문 진료');
  insertDept.run('외과', '외과적 수술 및 처치');
  insertDept.run('소아과', '소아 및 청소년 진료');

  // 의사 샘플 데이터
  const insertDoctor = db.prepare(
    'INSERT INTO doctors (name, department_id, specialty, phone, email) VALUES (?, ?, ?, ?, ?)'
  );
  insertDoctor.run('김민준', 1, '소화기내과', '010-1111-2222', 'minjun.kim@hospital.com');
  insertDoctor.run('이서연', 1, '호흡기내과', '010-2222-3333', 'seoyeon.lee@hospital.com');
  insertDoctor.run('박지훈', 2, '일반외과', '010-3333-4444', 'jihoon.park@hospital.com');
  insertDoctor.run('최수아', 3, '소아청소년과', '010-4444-5555', 'sua.choi@hospital.com');

  // 환자 샘플 데이터
  const insertPatient = db.prepare(
    'INSERT INTO patients (name, birth_date, gender, phone, email, address, memo) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertPatient.run('홍길동', '1985-03-15', '남', '010-5555-6666', 'hong@email.com', '서울시 강남구', '고혈압 병력');
  insertPatient.run('김영희', '1992-07-22', '여', '010-6666-7777', 'young@email.com', '서울시 서초구', '');
  insertPatient.run('이철수', '1978-11-08', '남', '010-7777-8888', 'chul@email.com', '경기도 수원시', '당뇨 주의');
  insertPatient.run('박미나', '2001-01-30', '여', '010-8888-9999', 'mina@email.com', '서울시 마포구', '');
  insertPatient.run('정태양', '1965-09-05', '남', '010-9999-0000', 'tayang@email.com', '경기도 성남시', '심장 질환 병력');

  // 예약 샘플 데이터 (오늘 날짜 기준)
  const today = new Date();
  const formatDate = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => {
    const date = new Date(d);
    date.setDate(date.getDate() + n);
    return date;
  };

  const insertAppt = db.prepare(
    'INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertAppt.run(1, 1, formatDate(today), '09:00', '예약됨', '정기 검진', '');
  insertAppt.run(2, 2, formatDate(today), '10:30', '예약됨', '기침 및 호흡 곤란', '');
  insertAppt.run(3, 1, formatDate(today), '11:00', '완료', '소화 불량', '처방전 발급');
  insertAppt.run(4, 4, formatDate(today), '14:00', '예약됨', '예방 접종', '');
  insertAppt.run(5, 3, formatDate(addDays(today, 1)), '09:30', '예약됨', '복부 통증 상담', '');
  insertAppt.run(1, 2, formatDate(addDays(today, 1)), '11:00', '예약됨', '폐 기능 검사', '');
  insertAppt.run(2, 4, formatDate(addDays(today, 2)), '15:00', '예약됨', '성장 발달 검사', '');
  insertAppt.run(3, 3, formatDate(addDays(today, -1)), '10:00', '완료', '수술 후 경과 확인', '경과 양호');
  insertAppt.run(4, 1, formatDate(addDays(today, -2)), '13:00', '취소', '복통', '환자 취소');
  insertAppt.run(5, 2, formatDate(addDays(today, -3)), '09:00', '노쇼', '정기 검진', '');
}

module.exports = { getDb };
