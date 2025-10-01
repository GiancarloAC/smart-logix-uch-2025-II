require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// 🔗 conexión pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// --------- RUTAS ---------

// POST /students
app.post('/students', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query('INSERT INTO students (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// POST /courses
app.post('/courses', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Título requerido' });
  const [result] = await pool.query('INSERT INTO courses (title) VALUES (?)', [title]);
  res.status(201).json({ id: result.insertId, title });
});

// POST /enrollments
app.post('/enrollments', async (req, res) => {
  const { studentId, courseId } = req.body;
  if (!studentId || !courseId)
    return res.status(400).json({ error: 'studentId y courseId requeridos' });

  const [result] = await pool.query(
    'INSERT INTO enrollments (student_id, course_id, score, status) VALUES (?, ?, ?, ?)',
    [studentId, courseId, 100, 'Activo']
  );
  res.status(201).json({ id: result.insertId, studentId, courseId, score: 100, status: 'Activo' });
});

// PUT /enrollments/:id
app.put('/enrollments/:id', async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  await pool.query('UPDATE enrollments SET status = ? WHERE id = ?', [status, id]);
  res.json({ id, status });
});

// GET /students/:id/enrollments
app.get('/students/:id/enrollments', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT e.id, c.title, e.score, e.status
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     WHERE e.student_id = ?`,
    [id]
  );
  res.json(rows);
});

// start - Cloud Run usa PORT automáticamente
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 API escuchando en puerto ${PORT}`)
);
