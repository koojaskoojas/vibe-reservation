const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/patients - 전체 목록 (검색: name, phone)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { name, phone } = req.query;
    let query = 'SELECT * FROM patients WHERE 1=1';
    const params = [];

    if (name) {
      query += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }
    if (phone) {
      query += ' AND phone LIKE ?';
      params.push(`%${phone}%`);
    }
    query += ' ORDER BY created_at DESC';

    const patients = db.prepare(query).all(...params);
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '환자 목록 조회 실패' });
  }
});

// GET /api/patients/:id - 단건 조회
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ error: '환자를 찾을 수 없습니다' });
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '환자 조회 실패' });
  }
});

// POST /api/patients - 등록
router.post('/', (req, res) => {
  try {
    const { name, birth_date, gender, phone, email, address, memo } = req.body;
    if (!name) return res.status(400).json({ error: '환자 이름은 필수입니다' });

    const db = getDb();
    const result = db
      .prepare(
        'INSERT INTO patients (name, birth_date, gender, phone, email, address, memo) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        name,
        birth_date || null,
        gender || null,
        phone || '',
        email || '',
        address || '',
        memo || ''
      );

    const newPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newPatient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '환자 등록 실패' });
  }
});

// PUT /api/patients/:id - 수정
router.put('/:id', (req, res) => {
  try {
    const { name, birth_date, gender, phone, email, address, memo } = req.body;
    if (!name) return res.status(400).json({ error: '환자 이름은 필수입니다' });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '환자를 찾을 수 없습니다' });

    db.prepare(
      'UPDATE patients SET name = ?, birth_date = ?, gender = ?, phone = ?, email = ?, address = ?, memo = ? WHERE id = ?'
    ).run(
      name,
      birth_date || null,
      gender || null,
      phone || '',
      email || '',
      address || '',
      memo || '',
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '환자 수정 실패' });
  }
});

// DELETE /api/patients/:id - 삭제
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '환자를 찾을 수 없습니다' });

    const apptCount = db
      .prepare("SELECT COUNT(*) as cnt FROM appointments WHERE patient_id = ? AND status = '예약됨'")
      .get(req.params.id);
    if (apptCount.cnt > 0) {
      return res.status(400).json({ error: '예약된 일정이 있는 환자는 삭제할 수 없습니다' });
    }

    db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    res.json({ message: '환자 정보가 삭제되었습니다' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '환자 삭제 실패' });
  }
});

module.exports = router;
