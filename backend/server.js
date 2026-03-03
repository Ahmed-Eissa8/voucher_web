import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: "db.env" });

const usersRouter = express.Router();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

const JWT_SECRET = process.env.JWT_SECRET;

// ================== Middleware للتحقق ==================
function authMiddleware() {
  return (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(400).json({ error: "Invalid token" });
    }
  };
}


// requireCompanyAdmin.js
export function requireCompanyAdmin() {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Access denied" });
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    next();
  };
}


// ================== Auth APIs ==================

// تسجيل شركة جديدة
app.post("/api/register-company", async (req, res) => {
  const { name, location, tel, email, taxid } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "اسم الشركة مطلوب" });
  }

  try {
    // تحقق لو الشركة موجودة
    const [existing] = await pool.query("SELECT * FROM company WHERE name = ?", [name]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "الشركة موجودة بالفعل" });
    }

    const [result] = await pool.query(
      `INSERT INTO company (name, location, tel, email, taxid) VALUES (?, ?, ?, ?, ?)`,
      [name, location, tel, email, taxid]
    );

    res.json({ message: "تم تسجيل الشركة بنجاح", companyId: result.insertId });
  } catch (err) {
    console.error("Company Register Error:", err);
    res.status(500).json({ error: "فشل تسجيل الشركة" });
  }
});

// تسجيل مستخدم جديد
app.post("/api/register-user", async (req, res) => {
  const { username, password, role, company_id } = req.body;

  if (!username || !password || !company_id) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }

  try {
    // تحقق لو المستخدم موجود بالفعل في نفس الشركة
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND company_id = ?",
      [username, company_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "المستخدم موجود بالفعل في هذه الشركة" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (username, password, role, company_id) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, role || "user", company_id]
    );

    res.json({ message: "تم تسجيل المستخدم بنجاح", userId: result.insertId });
  } catch (err) {
    console.error("User Register Error:", err);
    res.status(500).json({ error: "فشل تسجيل المستخدم" });
  }
});

// تسجيل الدخول
// app.post("/api/login", async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
//     if (users.length === 0) return res.status(400).json({ error: "User not found" });

//     const user = users[0];
//     const validPass = await bcrypt.compare(password, user.password);
//     if (!validPass) return res.status(400).json({ error: "Invalid password" });

//     const token = jwt.sign(
//       { id: user.id, username: user.username, role: user.role, company_id: user.company_id },
//       JWT_SECRET,
//       { expiresIn: "8h" }
//     );
//  res.json({
//   token,
//   role: user.role,
//   username: user.username,
//   company_id: user.company_id,
//   permissions: JSON.parse(user.permissions || '{}'),
//   screens: user.screens ? JSON.parse(user.screens) : (user.role === 'admin' ? ["Accounts","Journal","Reports","Users"] : [])
// });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// تسجيل الدخول مع اسم الشركة
app.post("/api/login", async (req, res) => {
  const { company_name, username, password } = req.body;

  if (!company_name || !username || !password) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }

  try {
    // أولاً تحقق من الشركة
    const [companies] = await pool.query(
      "SELECT * FROM company WHERE name = ?",
      [company_name]
    );
    if (companies.length === 0) {
      return res.status(400).json({ error: "الشركة غير موجودة" });
    }
    const company = companies[0];

    // ثم تحقق من المستخدم داخل هذه الشركة
    const [users] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND company_id = ?",
      [username, company.id]
    );
    if (users.length === 0) return res.status(400).json({ error: "User not found" });

    const user = users[0];
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, company_id: user.company_id },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      role: user.role,
      username: user.username,
      company_id: user.company_id,
      permissions: JSON.parse(user.permissions || '{}'),
      screens: user.screens ? JSON.parse(user.screens) : (user.role === 'admin' ? ["Accounts","Journal","Reports","Users"] : [])
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================== Voucher APIs ==================

// رقم قيد جديد
app.get("/api/voucher/new", authMiddleware(), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const year = new Date().getFullYear();
    const [rows] = await conn.query(
      "SELECT MAX(TOPNO) AS max_no FROM yeartopno WHERE SYSYEAR = ? AND company_id = ? FOR UPDATE",
      [year, req.user.company_id]
    );
    const nextNo = (rows[0].max_no || 0) + 1;
    res.json({ newVoucherNo: nextNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// قيد واحد
app.get("/api/voucher/:id", authMiddleware(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT j.*, s.SUBMAIN_NAME 
       FROM journal j 
       LEFT JOIN submain s ON j.JOURNAL_SUBMAIN_NO = s.SUBMAIN_NO AND s.company_id = ?
       WHERE j.JOURNAL_NO = ? AND j.company_id = ?`,
      [req.user.company_id, req.params.id, req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// حفظ القيد
app.post("/api/voucher", authMiddleware(), async (req, res) => {
  const { voucherNo: incomingNo, date, entries = [], isNew } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    let voucherNo = incomingNo;

    if (isNew) {
      const year = new Date().getFullYear();
      const [rows] = await conn.query(
        "SELECT MAX(TOPNO) AS max_no FROM yeartopno WHERE SYSYEAR = ? AND company_id = ? FOR UPDATE",
        [year, req.user.company_id]
      );
      voucherNo = (rows[0].max_no || 0) + 1;

      await conn.query(
        `INSERT INTO yeartopno (SYSYEAR, TOPNO, company_id) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE TOPNO = VALUES(TOPNO)`,
        [year, voucherNo, req.user.company_id]
      );
    } else {
      await conn.query(
        "DELETE FROM journal WHERE JOURNAL_NO = ? AND company_id = ?",
        [voucherNo, req.user.company_id]
      );
    }

    let totalDr = 0, totalCr = 0;

    for (const e of entries) {
      const dr = parseFloat(e.dr) || 0;
      const cr = parseFloat(e.cr) || 0;
      totalDr += dr; totalCr += cr;

await conn.query(
  `INSERT INTO journal 
   (JOURNAL_NO, JOURNAL_SUBMAIN_NO, JOURNAL_DR, JOURNAL_CR, JOURNAL_DESC,
    JOURNAL_DATE, JOURNAL_DOCNO, JOURNAL_USER, company_id, user_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    voucherNo,
    e.accNo || null,
    dr,
    cr,
    e.desc || "",
    date || new Date().toISOString().slice(0, 10),
    e.reference || "",
    req.user.username,
    req.user.company_id,
    req.user.id 
  ]
);

    }

    if (Math.abs(totalDr - totalCr) > 0.001) {
      await conn.rollback();
      return res.status(400).json({ error: "Debit and Credit totals must match" });
    }

    await conn.commit();
    res.json({ message: "Voucher saved", voucherNo });
  }catch (err) {
  console.error("Voucher save error:", err); // 👈 هذي تطبع لك الخطأ الكامل في السيرفر
  await conn.rollback();
  res.status(500).json({ error: err.message });
}
 finally {
    conn.release();
  }
});

// حذف القيد
app.delete("/api/voucher/:id", authMiddleware(), async (req, res) => {
  const voucherNo = parseInt(req.params.id);
  if (!voucherNo) return res.status(400).json({ error: "Invalid voucher number" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // حذف القيد من جدول journal
    const [result] = await conn.query(
      "DELETE FROM journal WHERE JOURNAL_NO = ? AND company_id = ?",
      [voucherNo, req.user.company_id]
    );
    
    // إذا كان هناك سجل تم حذفه من جدول journal، يجب حذف الرقم من جدول yeartopno أيضًا
    if (result.affectedRows > 0) {
      await conn.query(
        "DELETE FROM yeartopno WHERE TOPNO = ? AND company_id = ?",
        [voucherNo, req.user.company_id]
      );

      // التأكد من أن التعديل تم
      await conn.commit();
      res.json({ message: "Voucher deleted successfully" });
    } else {
      await conn.rollback();
      res.status(404).json({ error: "Voucher not found" });
    }
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});


app.get("/api/accounts", async (req, res) => {
  const { query, type } = req.query;
  if (!query) return res.json([]);

  try {
    const sql =
      type === "accNo"
        ? `SELECT SUBMAIN_NO, SUBMAIN_NAME 
           FROM submain 
           WHERE SUBMAIN_NO LIKE ? OR SUBMAIN_NAME LIKE ? 
           LIMIT 20`
        : `SELECT SUBMAIN_NO, SUBMAIN_NAME 
           FROM submain 
           WHERE SUBMAIN_NAME LIKE ? OR SUBMAIN_NO LIKE ? 
           LIMIT 20`;

    const [rows] = await pool.query(sql, [`${query}%`, `${query}%`]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================== Accounts APIs ==================

// جلب الحسابات الخاصة بالشركة
// app.get("/api/accounts", authMiddleware(), async (req, res) => {
//   const { query, type } = req.query; // type = accNo or accName
//   try {
//     let sql = "";
//     if (type === "accNo") {
//       sql = "SELECT SUBMAIN_NO, SUBMAIN_NAME FROM submain WHERE SUBMAIN_NO LIKE ? AND company_id = ?";
//     } else {
//       sql = "SELECT SUBMAIN_NO, SUBMAIN_NAME FROM submain WHERE SUBMAIN_NAME LIKE ? AND company_id = ?";
//     }

//     const [rows] = await pool.query(sql, [`%${query}%`, req.user.company_id]);
//     res.json(rows);
//   } catch (err) {
//     console.error("Accounts Search Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });


// ================== Accounts APIs ==================
// app.get("/api/accounts", authMiddleware(), async (req, res) => {
//   const { query = "", type = "accNo" } = req.query;

//   try {
//     let sql = "";
//     if (type === "accNo") {
//       sql = `
//         SELECT SUBMAIN_NO, SUBMAIN_NAME, SUBMAIN_MAIN_NO, MAIN_NAME
//         FROM submain
//         LEFT JOIN main ON submain.SUBMAIN_MAIN_NO = main.MAIN_NO
//         WHERE submain.SUBMAIN_NO LIKE ? AND submain.company_id = ?`;
//     } else {
//       sql = `
//         SELECT SUBMAIN_NO, SUBMAIN_NAME, SUBMAIN_MAIN_NO, MAIN_NAME
//         FROM submain
//         LEFT JOIN main ON submain.SUBMAIN_MAIN_NO = main.MAIN_NO
//         WHERE submain.SUBMAIN_NAME LIKE ? AND submain.company_id = ?`;
//     }

//     const [rows] = await pool.query(sql, [`%${query}%`, req.user.company_id]);
//     res.json(rows);
//   } catch (err) {
//     console.error("Accounts Search Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// جلب كل الحسابات (مع البحث)
app.get("/api/accounts/all", authMiddleware(), async (req, res) => {
  const { search = "" } = req.query;
  try {
    const [rows] = await pool.query(
      `SELECT s.SUBMAIN_NO, s.SUBMAIN_NAME, s.SUBMAIN_MAIN_NO, m.MAIN_NAME
       FROM submain s
       LEFT JOIN main m ON s.SUBMAIN_MAIN_NO = m.MAIN_NO
       WHERE (s.SUBMAIN_NO LIKE ? OR s.SUBMAIN_NAME LIKE ?)
       AND s.company_id = ?`,
      [`%${search}%`, `%${search}%`, req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Accounts Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// جلب الحسابات الرئيسية
app.get("/api/main-accounts", authMiddleware(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT MAIN_NO, MAIN_NAME FROM main WHERE company_id = ?",
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Main Accounts Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// إضافة حساب جديد
app.post("/api/accounts", authMiddleware(), async (req, res) => {
  const { accNo, accName, mainNo } = req.body;
  if (!accNo || !accName || !mainNo)
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });

  try {
    const [exists] = await pool.query(
      "SELECT * FROM submain WHERE SUBMAIN_NO = ? AND company_id = ?",
      [accNo, req.user.company_id]
    );
    if (exists.length > 0)
      return res.status(400).json({ error: "الحساب موجود مسبقاً" });

    await pool.query(
      `INSERT INTO submain (SUBMAIN_NO, SUBMAIN_NAME, SUBMAIN_MAIN_NO, company_id, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [accNo, accName, mainNo, req.user.company_id, req.user.id]
    );

    res.json({ message: "تم الحفظ بنجاح" });
  } catch (err) {
    console.error("Account Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// تعديل الحساب
app.put("/api/accounts/:id", authMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { accNo, accName, mainNo } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE submain 
       SET SUBMAIN_NO = ?, SUBMAIN_NAME = ?, SUBMAIN_MAIN_NO = ?
       WHERE SUBMAIN_NO = ? AND company_id = ?`,
      [accNo, accName, mainNo, id, req.user.company_id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "الحساب غير موجود" });

    res.json({ message: "تم التعديل بنجاح" });
  } catch (err) {
    console.error("Account Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// حذف الحساب
app.delete("/api/accounts/:id", authMiddleware(), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      "DELETE FROM submain WHERE SUBMAIN_NO = ? AND company_id = ?",
      [id, req.user.company_id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "الحساب غير موجود" });

    res.json({ message: "تم الحذف بنجاح" });
  } catch (err) {
    console.error("Account Delete Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== الحسابات العليا (subband) ====================

// جلب الحسابات العليا
app.get("/api/high-accounts", authMiddleware(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ID, subbno, subbname, subb_band_no 
       FROM subband 
       WHERE company_id = ? 
       ORDER BY subbno ASC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("High Accounts Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== الحسابات الفرعية (main) ====================

// جلب الحسابات الفرعية مع البحث
app.get("/api/sub-accounts", authMiddleware(), async (req, res) => {
  const { search = "" } = req.query;
  try {
    const sql = `
      SELECT m.ID, m.MAIN_NO, m.MAIN_NAME, m.MAIN_BAND_NO,
             h.subbname AS high_account_name
      FROM main m
      LEFT JOIN subband h 
        ON m.MAIN_BAND_NO = h.subbno
        AND h.company_id = m.company_id
      WHERE m.company_id = ? 
        AND (m.MAIN_NO LIKE ? OR m.MAIN_NAME LIKE ? OR h.subbname LIKE ?)
      ORDER BY m.MAIN_NO ASC LIMIT 100
    `;
    const [rows] = await pool.query(sql, [
      req.user.company_id,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
    ]);
    res.json(rows);
  } catch (err) {
    console.error("Sub Accounts Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// إضافة حساب فرعي جديد
app.post("/api/sub-accounts", authMiddleware(), async (req, res) => {
  const { MAIN_NO, MAIN_NAME, MAIN_BAND_NO } = req.body;

  if (!MAIN_NO || !MAIN_NAME || !MAIN_BAND_NO)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const [exist] = await pool.query(
      "SELECT * FROM main WHERE MAIN_NO = ? AND company_id = ?",
      [MAIN_NO, req.user.company_id]
    );
    if (exist.length > 0)
      return res.status(400).json({ error: "Sub Account already exists" });

    const [result] = await pool.query(
      `INSERT INTO main (MAIN_NO, MAIN_NAME, MAIN_BAND_NO, company_id, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [MAIN_NO, MAIN_NAME, MAIN_BAND_NO, req.user.company_id, req.user.id]
    );
    res.json({ message: "Sub Account created", id: result.insertId });
  } catch (err) {
    console.error("Account Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// تعديل حساب فرعي
app.put("/api/sub-accounts/:id", authMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { MAIN_NO, MAIN_NAME, MAIN_BAND_NO } = req.body;

  if (!MAIN_NO || !MAIN_NAME || !MAIN_BAND_NO)
    return res.status(400).json({ error: "All fields required" });

  try {
    const [current] = await pool.query(
      "SELECT * FROM main WHERE ID = ? AND company_id = ?",
      [id, req.user.company_id]
    );
    if (current.length === 0)
      return res.status(404).json({ error: "Sub Account not found" });

    if (current[0].MAIN_NO !== MAIN_NO) {
      const [exist] = await pool.query(
        "SELECT * FROM main WHERE MAIN_NO = ? AND company_id = ?",
        [MAIN_NO, req.user.company_id]
      );
      if (exist.length > 0)
        return res.status(400).json({ error: "Sub Account No already exists" });
    }

    await pool.query(
      `UPDATE main 
       SET MAIN_NO = ?, MAIN_NAME = ?, MAIN_BAND_NO = ? 
       WHERE ID = ? AND company_id = ?`,
      [MAIN_NO, MAIN_NAME, MAIN_BAND_NO, id, req.user.company_id]
    );

    res.json({ message: "Sub Account updated successfully" });
  } catch (err) {
    console.error("Account Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// حذف حساب فرعي
app.delete("/api/sub-accounts/:mainNo", authMiddleware(), async (req, res) => {
  const mainNo = req.params.mainNo;
  try {
    const [result] = await pool.query(
      "DELETE FROM main WHERE MAIN_NO = ? AND company_id = ?",
      [mainNo, req.user.company_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Account not found" });
    res.json({ message: "Sub Account deleted" });
  } catch (err) {
    console.error("Account Delete Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== الحسابات العليا (subband) ====================

// جلب الحسابات العليا للمستخدم الحالي وشركته فقط
app.get("/api/bands", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT BAND_NO, BAND_NAME FROM band ORDER BY BAND_NO ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// جلب الـ Subband (High Accounts) مع بحث للمستخدم الحالي والشركة فقط
app.get("/api/high-accounts", authMiddleware(), async (req, res) => {
  const { search = "" } = req.query;
  try {
    const sql = `
      SELECT s.ID, s.subbno, s.subbname, s.subb_band_no, b.BAND_NAME as band_name
      FROM subband s
      LEFT JOIN band b ON s.subb_band_no = b.BAND_NO
      WHERE s.company_id = ? AND s.user_id = ?
        AND (s.subbno LIKE ? OR s.subbname LIKE ? OR b.BAND_NAME LIKE ?)
      ORDER BY s.subbno ASC
      LIMIT 50
    `;
    const [rows] = await pool.query(sql, [
      req.user.company_id,
      req.user.id,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    ]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إضافة Subband مرتبط بالمستخدم والشركة
app.post("/api/high-accounts", authMiddleware(), async (req, res) => {
  const { subbno, subbname, subb_band_no } = req.body;
  if (!subbno || !subbname || !subb_band_no)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const [exist] = await pool.query(
      "SELECT * FROM subband WHERE subbno = ? AND company_id = ? AND user_id = ?",
      [subbno, req.user.company_id, req.user.id]
    );
    if (exist.length > 0)
      return res.status(400).json({ error: "Subband already exists" });

    const [result] = await pool.query(
      "INSERT INTO subband (subbno, subbname, subb_band_no, company_id, user_id) VALUES (?, ?, ?, ?, ?)",
      [subbno, subbname, subb_band_no, req.user.company_id, req.user.id]
    );

    res.json({ message: "Subband created", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تعديل Subband مرتبط بالمستخدم والشركة
app.put("/api/high-accounts/:id", authMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { subbno, subbname, subb_band_no } = req.body;

  if (!subbno || !subbname || !subb_band_no)
    return res.status(400).json({ error: "All fields are required" });

  try {
    // تأكد من ملكية الحساب
    const [current] = await pool.query(
      "SELECT * FROM subband WHERE ID = ? AND company_id = ? AND user_id = ?",
      [id, req.user.company_id, req.user.id]
    );
    if (current.length === 0)
      return res.status(404).json({ error: "Subband not found" });

    // تحقق من التكرار إذا تم تغيير الرقم
    if (current[0].subbno !== subbno) {
      const [exist] = await pool.query(
        "SELECT * FROM subband WHERE subbno = ? AND company_id = ? AND user_id = ?",
        [subbno, req.user.company_id, req.user.id]
      );
      if (exist.length > 0)
        return res.status(400).json({ error: "Subband No already exists" });
    }

    await pool.query(
      "UPDATE subband SET subbno = ?, subbname = ?, subb_band_no = ? WHERE ID = ? AND company_id = ? AND user_id = ?",
      [subbno, subbname, subb_band_no, id, req.user.company_id, req.user.id]
    );

    res.json({ message: "Subband updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// حذف Subband مرتبط بالمستخدم والشركة
app.delete("/api/high-accounts/:id", authMiddleware(), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "DELETE FROM subband WHERE ID = ? AND company_id = ? AND user_id = ?",
      [id, req.user.company_id, req.user.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Subband not found" });

    res.json({ message: "Subband deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


usersRouter.get("/", authMiddleware(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, role, company_id, permissions FROM users WHERE company_id = ?",
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



usersRouter.post("/", authMiddleware(), async (req, res) => {
  const { username, password, role = "user", permissions = { view: true, edit: false } } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password required" });

  try {
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND company_id = ?",
      [username, req.user.company_id]
    );
    if (existing.length > 0) return res.status(400).json({ error: "User already exists in this company" });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (username, password, role, company_id, permissions) VALUES (?, ?, ?, ?, ?)",
      [username, hashed, role, req.user.company_id, JSON.stringify(permissions)]
    );

    res.json({
  id: result.insertId,
  username,
  role,
  screens: [],
  permissions: {},
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// PUT /api/users/:id -> Admin يعدل دور/صلاحيات/اسم المستخدم (لكن فقط لمستخدمي نفس الشركة)
// usersRouter.put("/:id", authMiddleware(), requireCompanyAdmin(), async (req, res) => {
//   const { id } = req.params;
//   const { username, role, permissions } = req.body;

//   try {
//     // تأكد أن المستخدم الذي سيتم تعديله تابع لنفس الشركة
//     const [target] = await pool.query("SELECT * FROM users WHERE id = ? AND company_id = ?", [id, req.user.company_id]);
//     if (target.length === 0) return res.status(404).json({ error: "User not found in your company" });

//     // منع تعديل نفسك لتفادي حذف admin الرئيسي (اختياري)
//     // if (req.user.id === Number(id)) return res.status(400).json({ error: "Cannot change own role" });

//     const updates = [];
//     const params = [];

//     if (username) { updates.push("username = ?"); params.push(username); }
//     if (role) { updates.push("role = ?"); params.push(role); }
//     if (permissions) { updates.push("permissions = ?"); params.push(JSON.stringify(permissions)); }

//     if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

//     params.push(id, req.user.company_id);
//     const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ? AND company_id = ?`;
//     const [result] = await pool.query(sql, params);

//     res.json({ message: "User updated" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

usersRouter.put("/:id", authMiddleware(), async (req, res) => {
  const { id } = req.params;
  const { username, role, permissions } = req.body;

  try {
    const [target] = await pool.query("SELECT * FROM users WHERE id = ? AND company_id = ?", [id, req.user.company_id]);
    if (target.length === 0) return res.status(404).json({ error: "User not found in your company" });

    const updates = [];
    const params = [];

    if (username) { updates.push("username = ?"); params.push(username); }
    if (role) { updates.push("role = ?"); params.push(role); }
    if (permissions) { updates.push("permissions = ?"); params.push(JSON.stringify(permissions)); }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    params.push(id, req.user.company_id);
    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ? AND company_id = ?`;
    await pool.query(sql, params);

    res.json({ message: "User updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/users/:id -> Admin يحذف مستخدم داخل نفس الشركة
usersRouter.delete("/:id", authMiddleware(), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM users WHERE id = ? AND company_id = ?", [id, req.user.company_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// mount router
app.use("/api/users", usersRouter);


// 🔐 جلب كل المستخدمين (لأدمن فقط)
// app.get("/api/users", async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       "SELECT id, name, email, role, can_add, can_edit, can_delete FROM users"
//     );
//     res.json(rows);
//   } catch (err) {
//     console.error("Fetch Users Error:", err);
//     res.status(500).json({ message: "Error fetching users" });
//   }
// });

// ✏️ تعديل صلاحيات مستخدم
// app.put("/api/users/:id", async (req, res) => {
//   const { id } = req.params;
//   const { role, can_add, can_edit, can_delete } = req.body;

//   try {
//     await pool.query(
//       "UPDATE users SET role=?, can_add=?, can_edit=?, can_delete=? WHERE id=?",
//       [role, can_add, can_edit, can_delete, id]
//     );
//     res.json({ message: "User updated successfully" });
//   } catch (err) {
//     console.error("Update User Error:", err);
//     res.status(500).json({ message: "Error updating user" });
//   }
// });

// 🗑️ حذف مستخدم
// app.delete("/api/users/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     await pool.query("DELETE FROM users WHERE id=?", [id]);
//     res.json({ message: "User deleted successfully" });
//   } catch (err) {
//     console.error("Delete User Error:", err);
//     res.status(500).json({ message: "Error deleting user" });
//   }
// });

usersRouter.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
});



// ✅ GET صلاحيات المستخدم
usersRouter.get("/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT permissions, screens FROM users WHERE id = ?", [id]);

    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const user = rows[0];
    res.json({
      permissions: user.permissions ? JSON.parse(user.permissions) : {},
      screens: user.screens ? JSON.parse(user.screens) : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ PUT لتحديث صلاحيات المستخدم
usersRouter.put("/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, screens } = req.body;

    const permissionsStr = JSON.stringify(permissions || {});
    const screensStr = JSON.stringify(screens || []);

    await pool.query("UPDATE users SET permissions = ?, screens = ? WHERE id = ?", [
      permissionsStr,
      screensStr,
      id,
    ]);

    res.json({ message: "Permissions updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// ==================== تقرير الميزانية العمومية ====================

app.get("/api/reports/balance-sheet", authMiddleware(), async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const [rows] = await pool.query(`
      SELECT 
        sb.subbname AS subband_name,
        SUM(IFNULL(j.JOURNAL_DR, 0) - IFNULL(j.JOURNAL_CR, 0)) AS total_balance
      FROM journal j
      LEFT JOIN submain sm ON j.JOURNAL_SUBMAIN_NO = sm.SUBMAIN_NO AND sm.company_id = j.company_id
      LEFT JOIN main m ON sm.SUBMAIN_MAIN_NO = m.MAIN_NO AND m.company_id = j.company_id
      LEFT JOIN subband sb ON m.MAIN_BAND_NO = sb.subbno AND sb.company_id = j.company_id
      WHERE j.company_id = ?
      GROUP BY sb.subbname
      ORDER BY sb.subbno;
    `, [company_id]);

    // هيكل البيانات النهائي
    const subbands = rows.map(r => ({
      name: r.subband_name,
      amount: Number(r.total_balance) || 0,
    }));

    res.json({ subbands });
  } catch (err) {
    console.error("Balance Sheet Report Error:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/account-statement', authMiddleware(), async (req, res) => {
  const { sub_no, fdate, ldate } = req.query;
  const company_id = req.user.company_id;
  
  try {
    const SYSYEAR = new Date().getFullYear();

    const [result] = await pool.query(
      `
      SELECT
          j.idauto,
          j.journal_no,
          j.journal_date,
          j.journal_docno,
          j.journal_dr,
          j.journal_cr,
          j.journal_desc,
          sm.submain_name,

          --  الرصيد الجاري (Running Balance)
          (
              SELECT
                  SUM(COALESCE(j2.journal_dr, 0) - COALESCE(j2.journal_cr, 0))
              FROM journal j2
              WHERE
                  j2.journal_submain_no = j.journal_submain_no
                  AND (
                      j2.journal_date < j.journal_date
                      OR (j2.journal_date = j.journal_date AND j2.journal_no < j.journal_no)
                      OR (j2.journal_date = j.journal_date AND j2.journal_no = j.journal_no AND j2.idauto <= j.idauto)
                  )
                  AND YEAR(j2.journal_date) = ?
                  AND j2.company_id = ?
          ) AS running_balance,

          --  إجمالي رصيد السنة كلها (Final balance)
          (
              SELECT
                  SUM(COALESCE(j3.journal_dr, 0) - COALESCE(j3.journal_cr, 0))
              FROM journal j3
              WHERE
                  j3.journal_submain_no = j.journal_submain_no
                  AND YEAR(j3.journal_date) = ?
                  AND j3.company_id = ?
          ) AS final_balance,

          --  رصيد الفترة فقط (Period balance)
          (
              SELECT
                  SUM(COALESCE(j4.journal_dr, 0) - COALESCE(j4.journal_cr, 0))
              FROM journal j4
              WHERE
                  j4.journal_submain_no = j.journal_submain_no
                  AND j4.journal_date BETWEEN ? AND ?
                  AND j4.company_id = ?
          ) AS period_balance

      FROM journal j
      INNER JOIN submain sm ON j.journal_submain_no = sm.submain_no AND sm.company_id = ?

      WHERE
          j.journal_submain_no = ?
          AND YEAR(j.journal_date) = ?
          AND j.journal_date BETWEEN ? AND ?
          AND j.company_id = ?

      ORDER BY
          j.journal_date,
          j.journal_no,
          j.idauto;
      `,
      [
        SYSYEAR, company_id, SYSYEAR, company_id, fdate, ldate, company_id, 
        company_id, sub_no, SYSYEAR, fdate, ldate, company_id
      ]
    );
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'فشل في تحميل التقرير' });
  }
});



// البحث عن الحسابات بالاسم
app.get('/api/accounts1', authMiddleware(), async (req, res) => {
  const { search } = req.query;
  const company_id = req.user.company_id;
  try {
    const [rows] = await pool.query(
      `SELECT submain_no AS sub_no, submain_name AS name 
       FROM submain 
       WHERE submain_name LIKE ? AND company_id = ?
       LIMIT 20`,
      [`%${search}%`, company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('فشل في جلب الحسابات:', err);
    res.status(500).json({ error: 'خطأ في الخادم أثناء جلب الحسابات' });
  }
});

// جلب تفاصيل الشركة الحالية
app.get("/api/company-details", authMiddleware(), async (req, res) => {
  try {
    const [company] = await pool.query(
      "SELECT name, location FROM company WHERE id = ?",
      [req.user.company_id]
    );
    if (company.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company[0]);
  } catch (err) {
    console.error("Company Details Error:", err);
    res.status(500).json({ error: "Failed to fetch company details" });
  }
});

// تقرير ميزان المراجعة حسب المستوى
app.get("/api/trial-balance", authMiddleware(), async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { level, fromDate, toDate } = req.query;

    let query = "";

    switch (level) {
      case "band":
        query = `
          SELECT 
            B.BAND_NO AS ACCNO,
            B.BAND_NAME AS ACCNAME,
            SUM(IFNULL(J.JOURNAL_DR,0)) AS DEBIT,
            SUM(IFNULL(J.JOURNAL_CR,0)) AS CREDIT
          FROM JOURNAL J
          INNER JOIN SUBMAIN SM ON J.JOURNAL_SUBMAIN_NO = SM.SUBMAIN_NO
          INNER JOIN MAIN M ON SM.SUBMAIN_MAIN_NO = M.MAIN_NO
          INNER JOIN SUBBAND SB ON M.MAIN_BAND_NO = SB.SUBBNO
          INNER JOIN BAND B ON SB.SUBB_BAND_NO = B.BAND_NO
          WHERE J.JOURNAL_DATE BETWEEN ? AND ? AND J.company_id = ?
          GROUP BY B.BAND_NO, B.BAND_NAME
          ORDER BY B.BAND_NO;
        `;
        break;

      case "subband":
        query = `
          SELECT 
            SB.SUBBNO AS ACCNO,
            SB.SUBBNAME AS ACCNAME,
            SUM(IFNULL(J.JOURNAL_DR,0)) AS DEBIT,
            SUM(IFNULL(J.JOURNAL_CR,0)) AS CREDIT
          FROM JOURNAL J
          INNER JOIN SUBMAIN SM ON J.JOURNAL_SUBMAIN_NO = SM.SUBMAIN_NO
          INNER JOIN MAIN M ON SM.SUBMAIN_MAIN_NO = M.MAIN_NO
          INNER JOIN SUBBAND SB ON M.MAIN_BAND_NO = SB.SUBBNO
          WHERE J.JOURNAL_DATE BETWEEN ? AND ? AND J.company_id = ?
          GROUP BY SB.SUBBNO, SB.SUBBNAME
          ORDER BY SB.SUBBNO;
        `;
        break;

      case "main":
        query = `
          SELECT 
            M.MAIN_NO AS ACCNO,
            M.MAIN_NAME AS ACCNAME,
            SUM(IFNULL(J.JOURNAL_DR,0)) AS DEBIT,
            SUM(IFNULL(J.JOURNAL_CR,0)) AS CREDIT
          FROM JOURNAL J
          INNER JOIN SUBMAIN SM ON J.JOURNAL_SUBMAIN_NO = SM.SUBMAIN_NO
          INNER JOIN MAIN M ON SM.SUBMAIN_MAIN_NO = M.MAIN_NO
          WHERE J.JOURNAL_DATE BETWEEN ? AND ? AND J.company_id = ?
          GROUP BY M.MAIN_NO, M.MAIN_NAME
          ORDER BY M.MAIN_NO;
        `;
        break;

      case "submain":
        query = `
          SELECT 
            SM.SUBMAIN_NO AS ACCNO,
            SM.SUBMAIN_NAME AS ACCNAME,
            SUM(IFNULL(J.JOURNAL_DR,0)) AS DEBIT,
            SUM(IFNULL(J.JOURNAL_CR,0)) AS CREDIT
          FROM JOURNAL J
          INNER JOIN SUBMAIN SM ON J.JOURNAL_SUBMAIN_NO = SM.SUBMAIN_NO
          WHERE J.JOURNAL_DATE BETWEEN ? AND ? AND J.company_id = ?
          GROUP BY SM.SUBMAIN_NO, SM.SUBMAIN_NAME
          ORDER BY SM.SUBMAIN_NO;
        `;
        break;

      default:
        return res.status(400).json({ error: "Invalid level" });
    }

    const [rows] = await pool.execute(query, [fromDate, toDate, company_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});





// تشغيل السيرفر
const PORT = process.env.PORT || 4400;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
