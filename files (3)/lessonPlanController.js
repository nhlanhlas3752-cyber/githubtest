const { query, withTransaction } = require('../config/database');

// ─── LIST ────────────────────────────────────────────────────────────────────
// GET /api/lesson-plans
// Teachers: own plans only. HOD/Principal/Admin: all school plans.
const list = async (req, res) => {
  const { role, id: userId, school_id } = req.user;
  const {
    status, term, grade, subject, teacher_id,
    search, from_date, to_date,
    page = 1, limit = 20, sort = 'lesson_date', order = 'desc',
  } = req.query;

  const conditions = ['lp.school_id = $1'];
  const params = [school_id];
  let p = 2;

  // Scope to own plans unless elevated role
  if (role === 'teacher') {
    conditions.push(`lp.teacher_id = $${p++}`);
    params.push(userId);
  } else if (teacher_id) {
    conditions.push(`lp.teacher_id = $${p++}`);
    params.push(teacher_id);
  }

  if (status) { conditions.push(`lp.status = $${p++}`); params.push(status); }
  if (term)   { conditions.push(`lp.term = $${p++}`);   params.push(term); }
  if (grade)  { conditions.push(`lp.grade = $${p++}`);  params.push(grade); }
  if (subject){ conditions.push(`lp.subject ILIKE $${p++}`); params.push(`%${subject}%`); }
  if (from_date){ conditions.push(`lp.lesson_date >= $${p++}`); params.push(from_date); }
  if (to_date)  { conditions.push(`lp.lesson_date <= $${p++}`); params.push(to_date); }
  if (search) {
    conditions.push(`(lp.topic ILIKE $${p} OR lp.subject ILIKE $${p} OR lp.grade ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSorts = { lesson_date: 'lp.lesson_date', created_at: 'lp.created_at', topic: 'lp.topic' };
  const sortCol = allowedSorts[sort] || 'lp.lesson_date';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
  const pageLimit = Math.min(100, parseInt(limit));

  const [dataRes, countRes] = await Promise.all([
    query(
      `SELECT lp.id, lp.subject, lp.grade, lp.topic, lp.lesson_date, lp.term,
              lp.duration_mins, lp.status, lp.week_number, lp.submitted_at, lp.approved_at,
              u.first_name || ' ' || u.last_name AS teacher_name, u.department,
              rv.first_name || ' ' || rv.last_name AS reviewed_by_name
       FROM lesson_plans lp
       JOIN users u ON u.id = lp.teacher_id
       LEFT JOIN users rv ON rv.id = lp.reviewed_by
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ${pageLimit} OFFSET ${offset}`,
      params
    ),
    query(`SELECT COUNT(*) FROM lesson_plans lp ${where}`, params),
  ]);

  res.json({
    plans: dataRes.rows,
    total: parseInt(countRes.rows[0].count),
    page: parseInt(page),
    pages: Math.ceil(parseInt(countRes.rows[0].count) / pageLimit),
  });
};

// ─── GET ONE ─────────────────────────────────────────────────────────────────
const get = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId, school_id } = req.user;

  const { rows } = await query(
    `SELECT lp.*,
            u.first_name || ' ' || u.last_name AS teacher_name,
            u.email AS teacher_email, u.department,
            rv.first_name || ' ' || rv.last_name AS reviewed_by_name,
            s.name AS school_name, s.address AS school_address
     FROM lesson_plans lp
     JOIN users u ON u.id = lp.teacher_id
     LEFT JOIN users rv ON rv.id = lp.reviewed_by
     JOIN schools s ON s.id = lp.school_id
     WHERE lp.id = $1 AND lp.school_id = $2`,
    [id, school_id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Lesson plan not found' });
  const plan = rows[0];

  // Teachers can only view their own
  if (role === 'teacher' && plan.teacher_id !== userId)
    return res.status(403).json({ error: 'Access denied' });

  res.json(plan);
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
const create = async (req, res) => {
  const { id: userId, school_id } = req.user;
  const {
    subject, grade, topic, lesson_date, term, duration_mins = 60, week_number,
    objectives, introduction, development, consolidation,
    assessment, resources, homework, status = 'draft',
  } = req.body;

  if (!subject || !grade || !topic || !lesson_date || !term)
    return res.status(400).json({ error: 'subject, grade, topic, lesson_date and term are required' });

  const finalStatus = ['draft', 'submitted'].includes(status) ? status : 'draft';

  const { rows } = await query(
    `INSERT INTO lesson_plans
     (school_id, teacher_id, subject, grade, topic, lesson_date, term, duration_mins,
      week_number, objectives, introduction, development, consolidation,
      assessment, resources, homework, status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
             CASE WHEN $17 = 'submitted' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [school_id, userId, subject, grade, topic, lesson_date, term, duration_mins,
     week_number || null, objectives, introduction, development, consolidation,
     assessment, resources, homework, finalStatus]
  );

  res.status(201).json(rows[0]);
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
const update = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role, school_id } = req.user;

  const existing = await query(
    `SELECT * FROM lesson_plans WHERE id = $1 AND school_id = $2`,
    [id, school_id]
  );
  if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });
  const plan = existing.rows[0];

  if (role === 'teacher' && plan.teacher_id !== userId)
    return res.status(403).json({ error: 'Access denied' });

  // Approved plans are locked for teachers
  if (role === 'teacher' && plan.status === 'approved')
    return res.status(409).json({ error: 'Approved plans cannot be edited. Contact your HOD.' });

  const fields = ['subject','grade','topic','lesson_date','term','duration_mins','week_number',
                  'objectives','introduction','development','consolidation',
                  'assessment','resources','homework','reflection'];
  const updates = [];
  const params = [];
  let p = 1;

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${p++}`);
      params.push(req.body[f]);
    }
  }

  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  params.push(id);

  const { rows } = await query(
    `UPDATE lesson_plans SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${p} RETURNING *`,
    params
  );
  res.json(rows[0]);
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
const remove = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role, school_id } = req.user;

  const { rows } = await query(
    `SELECT teacher_id, status FROM lesson_plans WHERE id = $1 AND school_id = $2`,
    [id, school_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });

  if (role === 'teacher') {
    if (rows[0].teacher_id !== userId) return res.status(403).json({ error: 'Access denied' });
    if (rows[0].status === 'approved') return res.status(409).json({ error: 'Cannot delete an approved plan' });
  }

  await query(`DELETE FROM lesson_plans WHERE id = $1`, [id]);
  res.json({ message: 'Deleted' });
};

// ─── SUBMIT ───────────────────────────────────────────────────────────────────
const submit = async (req, res) => {
  const { id } = req.params;
  const { id: userId, school_id } = req.user;

  const { rows } = await query(
    `UPDATE lesson_plans SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND school_id = $2 AND teacher_id = $3 AND status = 'draft'
     RETURNING *`,
    [id, school_id, userId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Plan not found or already submitted' });
  res.json(rows[0]);
};

// ─── APPROVE (HOD / Principal) ────────────────────────────────────────────────
const approve = async (req, res) => {
  const { id } = req.params;
  const { id: reviewerId, school_id } = req.user;
  const { comment } = req.body;

  const { rows } = await query(
    `UPDATE lesson_plans
     SET status = 'approved', reviewed_by = $1, review_comment = $2,
         approved_at = NOW(), updated_at = NOW()
     WHERE id = $3 AND school_id = $4 AND status = 'submitted'
     RETURNING *`,
    [reviewerId, comment || null, id, school_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Plan not found or not in submitted state' });
  res.json(rows[0]);
};

// ─── RETURN (send back to teacher) ───────────────────────────────────────────
const returnPlan = async (req, res) => {
  const { id } = req.params;
  const { id: reviewerId, school_id } = req.user;
  const { comment } = req.body;

  const { rows } = await query(
    `UPDATE lesson_plans
     SET status = 'returned', reviewed_by = $1, review_comment = $2,
         updated_at = NOW()
     WHERE id = $3 AND school_id = $4 AND status = 'submitted'
     RETURNING *`,
    [reviewerId, comment || null, id, school_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Plan not found or not submitted' });
  res.json(rows[0]);
};

// ─── STATS (dashboard numbers) ────────────────────────────────────────────────
const stats = async (req, res) => {
  const { role, id: userId, school_id } = req.user;
  const scope = role === 'teacher' ? `AND teacher_id = '${userId}'` : '';

  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE TRUE) AS total,
       COUNT(*) FILTER (WHERE status = 'draft') AS drafts,
       COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
       COUNT(*) FILTER (WHERE status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE status = 'returned') AS returned,
       COUNT(DISTINCT teacher_id) AS teacher_count
     FROM lesson_plans
     WHERE school_id = $1 ${scope}`,
    [school_id]
  );
  res.json(rows[0]);
};

module.exports = { list, get, create, update, remove, submit, approve, returnPlan, stats };
