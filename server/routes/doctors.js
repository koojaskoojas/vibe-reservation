const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/doctors - 전체 목록 (진료과 JOIN)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { department_id } = req.query;
    let query = `
      SELECT d.*, dept.name as department_name
      FROM doctors d
      LEFT JOIN departments dept ON d.department_id = dept.id
    `;
    const params = [];
    if (department_id) {
      query += ' WHERE d.department_id = ?';
      params.push(department_id);
    }
    query += ' ORDER BY d.id';
    const doctors = db.prepare(query).all(...params);
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '의사 목록 조회 실패' });
  }
});

// GET /api/doctors/:id - 단건 조회
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const doctor = db
      .prepare(
        `SELECT d.*, dept.name as department_name
         FROM doctors d
         LEFT JOIN departments dept ON d.department_id = dept.id
         WHERE d.id = ?`
      )
      .get(req.params.id);
    if (!doctor) return res.status(404).json({ error: '의사를 찾을 수 없습니다' });
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '의사 조회 실패' });
  }
});

// POST /api/doctors - 등록
router.post('/', (req, res) => {
  try {
    const { name, department_id, specialty, phone, email } = req.body;
    if (!name) return res.status(400).json({ error: '의사 이름은 필수입니다' });

    const db = getDb();
    const result = db
      .prepare(
        'INSERT INTO doctors (name, department_id, specialty, phone, email) VALUES (?, ?, ?, ?, ?)'
      )
      .run(name, department_id || null, specialty || '', phone || '', email || '');

    const newDoctor = db
      .prepare(
        `SELECT d.*, dept.name as department_name
         FROM doctors d
         LEFT JOIN departments dept ON d.department_id = dept.id
         WHERE d.id = ?`
      )
      .get(result.lastInsertRowid);
    res.status(201).json(newDoctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '의사 등록 실패' });
  }
});

// PUT /api/doctors/:id - 수정
router.put('/:id', (req, res) => {
  try {
    const { name, department_id, specialty, phone, email } = req.body;
    if (!name) return res.status(400).json({ error: '의사 이름은 필수입니다' });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '의사를 찾을 수 없습니다' });

    db.prepare(
      'UPDATE doctors SET name = ?, department_id = ?, specialty = ?, phone = ?, email = ? WHERE id = ?'
    ).run(name, department_id || null, specialty || '', phone || '', email || '', req.params.id);

    const updated = db
      .prepare(
        `SELECT d.*, dept.name as department_name
         FROM doctors d
         LEFT JOIN departments dept ON d.department_id = dept.id
         WHERE d.id = ?`
      )
      .get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '의사 수정 실패' });
  }
});

// DELETE /api/doctors/:id - 삭제
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '의사를 찾을 수 없습니다' });

    const apptCount = db
      .prepare("SELECT COUNT(*) as cnt FROM appointments WHERE doctor_id = ? AND status = '예약됨'")
      .get(req.params.id);
    if (apptCount.cnt > 0) {
      return res.status(400).json({ error: '예약된 일정이 있는 의사는 삭제할 수 없습니다' });
    }

    db.prepare('DELETE FROM doctors WHERE id = ?').run(req.params.id);
    res.json({ message: '의사 정보가 삭제되었습니다' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '의사 삭제 실패' });
  }
});

module.exports = router;
