const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/departments - 전체 목록
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const departments = db.prepare('SELECT * FROM departments ORDER BY id').all();
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '진료과 목록 조회 실패' });
  }
});

// GET /api/departments/:id - 단건 조회
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
    if (!dept) return res.status(404).json({ error: '진료과를 찾을 수 없습니다' });
    res.json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '진료과 조회 실패' });
  }
});

// POST /api/departments - 등록
router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: '진료과 이름은 필수입니다' });

    const db = getDb();
    const result = db
      .prepare('INSERT INTO departments (name, description) VALUES (?, ?)')
      .run(name, description || '');
    const newDept = db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newDept);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '이미 존재하는 진료과 이름입니다' });
    }
    console.error(err);
    res.status(500).json({ error: '진료과 등록 실패' });
  }
});

// PUT /api/departments/:id - 수정
router.put('/:id', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: '진료과 이름은 필수입니다' });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '진료과를 찾을 수 없습니다' });

    db.prepare('UPDATE departments SET name = ?, description = ? WHERE id = ?').run(
      name,
      description || '',
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '이미 존재하는 진료과 이름입니다' });
    }
    console.error(err);
    res.status(500).json({ error: '진료과 수정 실패' });
  }
});

// DELETE /api/departments/:id - 삭제
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '진료과를 찾을 수 없습니다' });

    const doctorCount = db
      .prepare('SELECT COUNT(*) as cnt FROM doctors WHERE department_id = ?')
      .get(req.params.id);
    if (doctorCount.cnt > 0) {
      return res.status(400).json({ error: '소속 의사가 있는 진료과는 삭제할 수 없습니다' });
    }

    db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
    res.json({ message: '진료과가 삭제되었습니다' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '진료과 삭제 실패' });
  }
});

module.exports = router;
