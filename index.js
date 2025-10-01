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
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
});

// POST /courses
app.post('/courses', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Título requerido' });
    const [result] = await pool.query('INSERT INTO courses (title) VALUES (?)', [title]);
    res.status(201).json({ id: result.insertId, title });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
});

// POST /enrollments
app.post('/enrollments', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId)
      return res.status(400).json({ error: 'studentId y courseId requeridos' });

    const [result] = await pool.query(
      'INSERT INTO enrollments (student_id, course_id, score, status) VALUES (?, ?, ?, ?)',
      [studentId, courseId, 100, 'Activo']
    );
    res.status(201).json({ id: result.insertId, studentId, courseId, score: 100, status: 'Activo' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
});

// PUT /enrollments/:id
app.put('/enrollments/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    await pool.query('UPDATE enrollments SET status = ? WHERE id = ?', [status, id]);
    res.json({ id, status });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
});

// GET /students/:id/enrollments
app.get('/students/:id/enrollments', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT e.id, c.title, e.score, e.status
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as test');
    res.json({ status: 'OK', db: 'connected', test: rows });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', db: 'disconnected', error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: '✅ API funcionando correctamente',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      students: '/students',
      courses: '/courses',
      enrollments: '/enrollments',
      studentEnrollments: '/students/:id/enrollments'
    }
  });
});

// start - Cloud Run usa PORT automáticamente
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 API escuchando en puerto ${PORT}`)
);
