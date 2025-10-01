require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// 🔗 Conexión pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --------- RUTAS ---------

// POST /students
app.post('/students', async (req, res) => {
  try {
    const { nombre, correo } = req.body;
    if (!nombre || !correo)
      return res.status(400).json({ error: 'Nombre y correo requeridos' });

    const [result] = await pool.query(
      'INSERT INTO students (nombre, correo) VALUES (?, ?)',
      [nombre, correo]
    );
    res.status(201).json({ id: result.insertId, nombre, correo });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
});

// POST /courses
app.post('/courses', async (req, res) => {
  try {
    const { titulo, descripcion } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título requerido' });

    const [result] = await pool.query(
      'INSERT INTO courses (titulo, descripcion) VALUES (?, ?)',
      [titulo, descripcion || null]
    );
    res.status(201).json({ id: result.insertId, titulo, descripcion });
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
      'INSERT INTO enrollments (student_id, course_id, puntaje, estado) VALUES (?, ?, ?, ?)',
      [studentId, courseId, 100, 'Activo']
    );
    res.status(201).json({
      id: result.insertId,
      studentId,
      courseId,
      puntaje: 100,
      estado: 'Activo'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor', details: error.message });
  }
});

// PUT /enrollments/:id
app.put('/enrollments/:id', async (req, res) => {
  try {
    const { estado } = req.body;
    const { id } = req.params;
    if (!estado) return res.status(400).json({ error: 'Estado requerido' });

    await pool.query('UPDATE enrollments SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ id, estado });
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
      `SELECT e.id, c.titulo AS curso, e.puntaje, e.estado, e.fecha_matricula
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
