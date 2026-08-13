/**
 * database.js — SQLite Database Manager (sql.js edition)
 * ใช้ sql.js (Pure JavaScript / WebAssembly) ไม่ต้อง compile native code
 * ข้อมูลถูกบันทึกลงไฟล์ cases.db บน disk ทุกครั้งที่มีการเปลี่ยนแปลง
 */

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'cases.db');

let db = null;
let SQL = null;

async function initDb() {
  if (db) return db;

  // โหลด sql.js
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  // โหลดไฟล์ db ที่มีอยู่ หรือสร้างใหม่
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log(`[DB] โหลดฐานข้อมูลจากไฟล์ → ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log(`[DB] สร้างฐานข้อมูลใหม่ → ${DB_PATH}`);
  }

  createSchema();
  saveToDisk(); // บันทึกทันทีหลังสร้าง schema
  return db;
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS cases (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      case_black_no           TEXT    DEFAULT '',
      case_red_no             TEXT    DEFAULT '',
      plaintiff_name          TEXT    DEFAULT '',
      defendant_name          TEXT    DEFAULT '',
      principal_amount        REAL    DEFAULT 0,
      default_date            TEXT    DEFAULT '',
      filing_date             TEXT    DEFAULT '',
      judgment_date           TEXT    DEFAULT '',
      court_fee               REAL    DEFAULT 0,
      attorney_fee            REAL    DEFAULT 0,
      pre_litigation_debt      REAL    DEFAULT 0,
      rental_penalty_fee      REAL    DEFAULT 0,
      pre_litigation_notes     TEXT    DEFAULT '',
      pre_litigation_debtor   TEXT    DEFAULT '',
      pre_litigation_rate     REAL    DEFAULT 7.5,
      interest_stages         TEXT    DEFAULT '[]',
      partial_payments        TEXT    DEFAULT '[]',
      saved_at                TEXT    NOT NULL,
      updated_at              TEXT    NOT NULL
    )
  `);

  // Migrations for existing database
  try { db.run(`ALTER TABLE cases ADD COLUMN pre_litigation_debt REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE cases ADD COLUMN rental_penalty_fee REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE cases ADD COLUMN pre_litigation_notes TEXT DEFAULT ''`); } catch (e) {}
  try { db.run(`ALTER TABLE cases ADD COLUMN pre_litigation_debtor TEXT DEFAULT ''`); } catch (e) {}
  try { db.run(`ALTER TABLE cases ADD COLUMN pre_litigation_rate REAL DEFAULT 1.5`); } catch (e) {}
  try { db.run(`ALTER TABLE cases ADD COLUMN rental_penalty_type TEXT DEFAULT 'flat'`); } catch (e) {}
  try { db.run(`ALTER TABLE cases ADD COLUMN category TEXT DEFAULT 'prelit'`); } catch (e) {}
}

function saveToDisk() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('[DB] บันทึกไฟล์ไม่สำเร็จ:', err.message);
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeJson(str, fallback) {
  try { return JSON.parse(str || '[]'); } catch { return fallback; }
}

function rowToCase(row) {
  return {
    id:                 row.id,
    caseBlackNo:        row.case_black_no,
    caseRedNo:          row.case_red_no,
    plaintiffName:      row.plaintiff_name,
    defendantName:      row.defendant_name,
    principalAmount:    row.principal_amount,
    defaultDate:        row.default_date,
    filingDate:         row.filing_date,
    judgmentDate:       row.judgment_date,
    courtFeeAwarded:    row.court_fee,
    attorneyFeeAwarded: row.attorney_fee,
    preLitigationDebt:    row.pre_litigation_debt || 0,
    rentalPenaltyFee:     row.rental_penalty_fee || 0,
    preLitigationNotes:   row.pre_litigation_notes || '',
    preLitigationDebtor:  row.pre_litigation_debtor || '',
    preLitigationRate:    row.pre_litigation_rate !== undefined ? row.pre_litigation_rate : 1.5,
    rentalPenaltyType:    row.rental_penalty_type || 'flat',
    category:             row.category || (row.case_black_no ? 'court' : 'prelit'),
    interestStages:       safeJson(row.interest_stages, []),
    partialPayments:      safeJson(row.partial_payments, []),
    savedAt:              row.saved_at,
    updatedAt:            row.updated_at,
    // snake_case aliases (for badge count etc.)
    case_black_no:  row.case_black_no,
    case_red_no:    row.case_red_no,
    saved_at:       row.saved_at,
  };
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

// ─── Public CRUD ──────────────────────────────────────────────────

function getAllCases() {
  const rows = queryAll('SELECT * FROM cases ORDER BY id DESC');
  return rows.map(rowToCase);
}

function getCaseById(id) {
  const row = queryOne('SELECT * FROM cases WHERE id = ?', [id]);
  return row ? rowToCase(row) : null;
}

function insertCase(data) {
  const now = today();
  db.run(`
    INSERT INTO cases
      (case_black_no, case_red_no, plaintiff_name, defendant_name,
       principal_amount, default_date, filing_date, judgment_date,
       court_fee, attorney_fee, pre_litigation_debt, rental_penalty_fee,
       pre_litigation_notes, pre_litigation_debtor, pre_litigation_rate,
       rental_penalty_type, category,
       interest_stages, partial_payments,
       saved_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [
    data.caseBlackNo    || '',
    data.caseRedNo      || '',
    data.plaintiffName  || '',
    data.defendantName  || '',
    data.principalAmount || 0,
    data.defaultDate    || '',
    data.filingDate     || '',
    data.judgmentDate   || '',
    data.courtFeeAwarded    || 0,
    data.attorneyFeeAwarded || 0,
    data.preLitigationDebt  || 0,
    data.rentalPenaltyFee   || 0,
    data.preLitigationNotes || '',
    data.preLitigationDebtor || '',
    data.preLitigationRate !== undefined ? data.preLitigationRate : 7.5,
    data.rentalPenaltyType || 'flat',
    data.category || 'prelit',
    JSON.stringify(data.interestStages  || []),
    JSON.stringify(data.partialPayments || []),
    now, now
  ]);

  const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  saveToDisk();
  return getCaseById(id);
}

function updateCase(id, data) {
  const now = today();
  db.run(`
    UPDATE cases SET
      case_black_no = ?, case_red_no = ?, plaintiff_name = ?, defendant_name = ?,
      principal_amount = ?, default_date = ?, filing_date = ?, judgment_date = ?,
      court_fee = ?, attorney_fee = ?, pre_litigation_debt = ?, rental_penalty_fee = ?,
      pre_litigation_notes = ?, pre_litigation_debtor = ?, pre_litigation_rate = ?,
      rental_penalty_type = ?, category = ?,
      interest_stages = ?, partial_payments = ?,
      updated_at = ?
    WHERE id = ?
  `, [
    data.caseBlackNo    || '',
    data.caseRedNo      || '',
    data.plaintiffName  || '',
    data.defendantName  || '',
    data.principalAmount || 0,
    data.defaultDate    || '',
    data.filingDate     || '',
    data.judgmentDate   || '',
    data.courtFeeAwarded    || 0,
    data.attorneyFeeAwarded || 0,
    data.preLitigationDebt  || 0,
    data.rentalPenaltyFee   || 0,
    data.preLitigationNotes || '',
    data.preLitigationDebtor || '',
    data.preLitigationRate !== undefined ? data.preLitigationRate : 7.5,
    data.rentalPenaltyType || 'flat',
    data.category || 'prelit',
    JSON.stringify(data.interestStages  || []),
    JSON.stringify(data.partialPayments || []),
    now,
    id
  ]);
  saveToDisk();
  return getCaseById(id);
}

function deleteCase(id) {
  db.run('DELETE FROM cases WHERE id = ?', [id]);
  const affected = db.getRowsModified();
  if (affected > 0) saveToDisk();
  return affected > 0;
}

module.exports = { initDb, getAllCases, getCaseById, insertCase, updateCase, deleteCase };
