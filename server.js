/**
 * server.js — Express REST API + Static File Server
 * Court Interest Calculator
 *
 * รันด้วย:  node server.js
 * เข้าใช้:  http://localhost:3001  (หรือ http://[IP-Server]:3001 จากเครื่องอื่น)
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── Serve static frontend files ──────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ─── REST API: /api/cases ─────────────────────────────────────────

/** GET /api/cases — รายการคดีทั้งหมด */
app.get('/api/cases', (req, res) => {
  try {
    const cases = db.getAllCases();
    res.json({ success: true, data: cases, count: cases.length });
  } catch (err) {
    console.error('[GET /api/cases]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/cases/:id — คดีรายเดียว */
app.get('/api/cases/:id', (req, res) => {
  try {
    const caseData = db.getCaseById(Number(req.params.id));
    if (!caseData) return res.status(404).json({ success: false, error: 'ไม่พบคดีนี้ในระบบ' });
    res.json({ success: true, data: caseData });
  } catch (err) {
    console.error('[GET /api/cases/:id]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/cases — สร้างคดีใหม่ */
app.post('/api/cases', (req, res) => {
  try {
    const newCase = db.insertCase(req.body);
    console.log(`[DB] บันทึกคดีใหม่ id=${newCase.id} จำเลย="${newCase.defendant_name}"`);
    res.status(201).json({ success: true, data: newCase });
  } catch (err) {
    console.error('[POST /api/cases]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** PUT /api/cases/:id — อัปเดตคดี */
app.put('/api/cases/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!db.getCaseById(id)) return res.status(404).json({ success: false, error: 'ไม่พบคดีนี้ในระบบ' });
    const updated = db.updateCase(id, req.body);
    console.log(`[DB] อัปเดตคดี id=${id}`);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PUT /api/cases/:id]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** DELETE /api/cases/:id — ลบคดี */
app.delete('/api/cases/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = db.deleteCase(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'ไม่พบคดีนี้ในระบบ' });
    console.log(`[DB] ลบคดี id=${id}`);
    res.json({ success: true, message: `ลบคดี id=${id} เรียบร้อยแล้ว` });
  } catch (err) {
    console.error('[DELETE /api/cases/:id]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── SPA Fallback: serve index.html for any unknown route ─────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────
db.initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   Court Interest Calculator — Server กำลังทำงาน     ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  Local:    http://localhost:${PORT}                    ║`);
    console.log(`║  Network:  http://[IP-เครื่องนี้]:${PORT}               ║`);
    console.log('║                                                      ║');
    console.log('║  กด Ctrl+C เพื่อหยุด Server                         ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
  });
}).catch(err => {
  console.error('[FATAL] ไม่สามารถเริ่มฐานข้อมูลได้:', err.message);
  process.exit(1);
});
