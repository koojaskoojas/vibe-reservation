const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/appointments - 전체 목록 (필터: 날짜 범위, doctor_id, status)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { start_date, end_date, doctor_id, status, patient_id } = req.query;

    let query = `
      SELECT
        a.*,
        p.name as patient_name,
        p.phone as patient_phone,
        d.name as doctor_name,
        dept.name as department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND a.appointment_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND a.appointment_date <= ?';
      params.push(end_date);
    }
    if (doctor_id) {
      query += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (patient_id) {
      query += ' AND a.patient_id = ?';
      params.push(patient_id);
    }

    query += ' ORDER BY a.appointment_date ASC, a.appointment_time ASC';

    const appointments = db.prepare(query).all(...params);
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '예약 목록 조회 실패' });
  }
});

// GET /api/appointments/:id - 단건 조회
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const appointment = db
      .prepare(
        `SELECT
          a.*,
          p.name as patient_name,
          p.phone as patient_phone,
          p.birth_date as patient_birth_date,
          d.name as doctor_name,
          dept.name as department_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE a.id = ?`
      )
      .get(req.params.id);
    if (!appointment) return res.status(404).json({ error: '예약을 찾을 수 없습니다' });
    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '예약 조회 실패' });
  }
});

// POST /api/appointments - 등록
router.post('/', (req, res) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes } =
      req.body;

    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: '환자, 의사, 날짜, 시간은 필수입니다' });
    }

    const db = getDb();

    // 중복 예약 확인
    const conflict = db
      .prepare(
        `SELECT id FROM appointments
         WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status = '예약됨'`
      )
      .get(doctor_id, appointment_date, appointment_time);
    if (conflict) {
      return res.status(400).json({ error: '해당 의사의 해당 시간에 이미 예약이 있습니다' });
    }

    const result = db
      .prepare(
        `INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        status || '예약됨',
        reason || '',
        notes || ''
      );

    const newAppt = db
      .prepare(
        `SELECT a.*, p.name as patient_name, d.name as doctor_name, dept.name as department_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors d ON a.doctor_id = d.id
         LEFT JOIN departments dept ON d.department_id = dept.id
         WHERE a.id = ?`
      )
      .get(result.lastInsertRowid);
    res.status(201).json(newAppt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '예약 등록 실패' });
  }
});

// PUT /api/appointments/:id - 수정 (상태 변경 포함)
router.put('/:id', (req, res) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes } =
      req.body;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '예약을 찾을 수 없습니다' });

    // 다른 예약과 시간 충돌 확인 (자기 자신 제외)
    if (doctor_id && appointment_date && appointment_time) {
      const conflict = db
        .prepare(
          `SELECT id FROM appointments
           WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?
           AND status = '예약됨' AND id != ?`
        )
        .get(doctor_id, appointment_date, appointment_time, req.params.id);
      if (conflict) {
        return res.status(400).json({ error: '해당 의사의 해당 시간에 이미 예약이 있습니다' });
      }
    }

    db.prepare(
      `UPDATE appointments SET
        patient_id = ?, doctor_id = ?, appointment_date = ?, appointment_time = ?,
        status = ?, reason = ?, notes = ?
       WHERE id = ?`
    ).run(
      patient_id || existing.patient_id,
      doctor_id || existing.doctor_id,
      appointment_date || existing.appointment_date,
      appointment_time || existing.appointment_time,
      status || existing.status,
      reason !== undefined ? reason : existing.reason,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const updated = db
      .prepare(
        `SELECT a.*, p.name as patient_name, d.name as doctor_name, dept.name as department_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors d ON a.doctor_id = d.id
         LEFT JOIN departments dept ON d.department_id = dept.id
         WHERE a.id = ?`
      )
      .get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '예약 수정 실패' });
  }
});

// DELETE /api/appointments/:id - 삭제
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '예약을 찾을 수 없습니다' });

    db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    res.json({ message: '예약이 삭제되었습니다' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '예약 삭제 실패' });
  }
});

module.exports = router;
