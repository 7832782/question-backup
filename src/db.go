package main

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

var db *sql.DB

// qCols 显式列出查询列：不依赖表内实际列顺序（ALTER TABLE 加列会排到末尾）
const qCols = "id, code, subject, qtype, grade, difficulty, tags, source, body, options, answer, analysis, use_count, created_at, updated_at"

func initDB(path string) error {
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)", path)
	d, err := sql.Open("sqlite", dsn)
	if err != nil {
		return err
	}
	d.SetMaxOpenConns(1) // SQLite 单写者，串行访问最稳
	if err := d.Ping(); err != nil {
		return err
	}
	db = d
	return migrate()
}

func migrate() error {
	schema := `
CREATE TABLE IF NOT EXISTS questions (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	code        TEXT NOT NULL UNIQUE,
	subject     TEXT NOT NULL DEFAULT '',
	qtype       TEXT NOT NULL DEFAULT 'single',
	grade       TEXT NOT NULL DEFAULT '高中',
	difficulty  INTEGER NOT NULL DEFAULT 3,
	tags        TEXT NOT NULL DEFAULT '[]',
	source      TEXT NOT NULL DEFAULT '',
	body        TEXT NOT NULL DEFAULT '',
	options     TEXT NOT NULL DEFAULT '[]',
	answer      TEXT NOT NULL DEFAULT '',
	analysis    TEXT NOT NULL DEFAULT '',
	use_count   INTEGER NOT NULL DEFAULT 0,
	created_at  TEXT NOT NULL,
	updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS images (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
	position    INTEGER NOT NULL DEFAULT 0,
	data        TEXT NOT NULL,
	width       INTEGER NOT NULL DEFAULT 60
);
CREATE TABLE IF NOT EXISTS tables (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
	position    INTEGER NOT NULL DEFAULT 0,
	markdown    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS papers (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	name        TEXT NOT NULL,
	subject     TEXT NOT NULL DEFAULT '',
	created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS paper_items (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	paper_id    INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
	question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
	position    INTEGER NOT NULL DEFAULT 0,
	score       REAL NOT NULL DEFAULT 5,
	deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS favorites (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	name       TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS favorite_items (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	favorite_id INTEGER NOT NULL REFERENCES favorites(id) ON DELETE CASCADE,
	question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
	position    INTEGER NOT NULL DEFAULT 0,
	deleted     INTEGER NOT NULL DEFAULT 0,
	created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_q_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_q_qtype  ON questions(qtype);
CREATE INDEX IF NOT EXISTS idx_q_diff   ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_pi_paper ON paper_items(paper_id);
CREATE INDEX IF NOT EXISTS idx_fi_fav ON favorite_items(favorite_id);
`
	_, err := db.Exec(schema)
	if err != nil {
		return err
	}
	// 兼容旧库：给已存在的表补 grade 列（幂等）
	return ensureColumn("questions", "grade", "TEXT NOT NULL DEFAULT '高中'")
}

// ensureColumn 检查列是否存在，不存在则 ALTER TABLE 添加
func ensureColumn(table, col, ddl string) error {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt any
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return err
		}
		if name == col {
			return nil // 已存在
		}
	}
	_, err = db.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, col, ddl))
	return err
}

func now() string { return time.Now().Format("2006-01-02 15:04:05") }

// ---------- 题目 ----------

type Question struct {
	ID         int64    `json:"id"`
	Code       string   `json:"code"`
	Subject    string   `json:"subject"`
	QType      string   `json:"qtype"`
	Grade      string   `json:"grade"`
	Difficulty int      `json:"difficulty"`
	Tags       []string `json:"tags"`
	Source     string   `json:"source"`
	Body       string   `json:"body"`
	Options    []string `json:"options"`
	Answer     string   `json:"answer"`
	Analysis   string   `json:"analysis"`
	UseCount   int      `json:"useCount"`
	CreatedAt  string   `json:"createdAt"`
	UpdatedAt  string   `json:"updatedAt"`
	Images     []Image  `json:"images"`
	Tables     []Table  `json:"tables"`
}

type Image struct {
	ID       int64  `json:"id"`
	Position int    `json:"position"`
	Data     string `json:"data"`
	Width    int    `json:"width"`
}

type Table struct {
	ID       int64  `json:"id"`
	Position int    `json:"position"`
	Markdown string `json:"markdown"`
}

func scanQuestion(rows *sql.Rows) (Question, error) {
	var q Question
	var tags string
	var opts string
	err := rows.Scan(&q.ID, &q.Code, &q.Subject, &q.QType, &q.Grade, &q.Difficulty, &tags,
		&q.Source, &q.Body, &opts, &q.Answer, &q.Analysis, &q.UseCount,
		&q.CreatedAt, &q.UpdatedAt)
	q.Tags = unmarshalStrings(tags)
	q.Options = unmarshalStrings(opts)
	return q, err
}

// listQuestions 筛选 + 分页查询，返回题目列表和总数
func listQuestions(f QueryFilter) ([]Question, int, error) {
	where := "WHERE 1=1"
	args := []any{}
	if f.Subject != "" {
		where += " AND subject = ?"
		args = append(args, f.Subject)
	}
	if f.Grade != "" {
		where += " AND grade = ?"
		args = append(args, f.Grade)
	}
	if f.QType != "" {
		where += " AND qtype = ?"
		args = append(args, f.QType)
	}
	if f.DifficultyMin > 0 {
		where += " AND difficulty >= ?"
		args = append(args, f.DifficultyMin)
	}
	if f.DifficultyMax > 0 {
		where += " AND difficulty <= ?"
		args = append(args, f.DifficultyMax)
	}
	if f.Source != "" {
		where += " AND source LIKE ?"
		args = append(args, "%"+f.Source+"%")
	}
	if f.Unused {
		where += " AND use_count = 0"
	}
	if f.Search != "" {
		where += " AND (body LIKE ? OR code LIKE ? OR answer LIKE ? OR analysis LIKE ?)"
		s := "%" + f.Search + "%"
		args = append(args, s, s, s, s)
	}
	if f.Tag != "" {
		where += " AND EXISTS (SELECT 1 FROM json_each(tags) WHERE json_each.value = ?)"
		args = append(args, f.Tag)
	}

	var total int
	if err := db.QueryRow("SELECT COUNT(*) FROM questions "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	order := "ORDER BY id DESC"
	pageSize := f.PageSize
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 50
	}
	offset := (f.Page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	rows, err := db.Query("SELECT "+qCols+" FROM questions "+where+" "+order+" LIMIT ? OFFSET ?",
		append(args, pageSize, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	qs := []Question{}
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			rows.Close()
			return nil, 0, err
		}
		qs = append(qs, q)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	// rows 已关闭，此时可安全加载附件（图片/表格），保证列表预览完整
	for i := range qs {
		if err := loadAttachments(&qs[i]); err != nil {
			return nil, 0, err
		}
	}
	return qs, total, nil
}

func getQuestion(id int64) (Question, error) {
	row := db.QueryRow("SELECT "+qCols+" FROM questions WHERE id = ?", id)
	q, err := scanRow(row)
	if err != nil {
		return Question{}, err
	}
	if err := loadAttachments(&q); err != nil {
		return Question{}, err
	}
	return q, nil
}

func scanRow(row *sql.Row) (Question, error) {
	var q Question
	var tags string
	var opts string
	err := row.Scan(&q.ID, &q.Code, &q.Subject, &q.QType, &q.Grade, &q.Difficulty, &tags,
		&q.Source, &q.Body, &opts, &q.Answer, &q.Analysis, &q.UseCount,
		&q.CreatedAt, &q.UpdatedAt)
	q.Tags = unmarshalStrings(tags)
	q.Options = unmarshalStrings(opts)
	return q, err
}

func loadAttachments(q *Question) error {
	rows, err := db.Query("SELECT id, position, data, width FROM images WHERE question_id = ? ORDER BY position, id", q.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var im Image
		if err := rows.Scan(&im.ID, &im.Position, &im.Data, &im.Width); err != nil {
			return err
		}
		q.Images = append(q.Images, im)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	rows2, err := db.Query("SELECT id, position, markdown FROM tables WHERE question_id = ? ORDER BY position, id", q.ID)
	if err != nil {
		return err
	}
	defer rows2.Close()
	for rows2.Next() {
		var t Table
		if err := rows2.Scan(&t.ID, &t.Position, &t.Markdown); err != nil {
			return err
		}
		q.Tables = append(q.Tables, t)
	}
	return rows2.Err()
}

// insertQuestion 插入题目及其附件，返回完整题目
func insertQuestion(q Question) (Question, error) {
	ts := now()
	code := nextCode()
	res, err := db.Exec(`INSERT INTO questions
		(code, subject, qtype, grade, difficulty, tags, source, body, options, answer, analysis, created_at, updated_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		code, q.Subject, q.QType, q.Grade, q.Difficulty, marshalStrings(q.Tags), q.Source,
		q.Body, marshalStrings(q.Options), q.Answer, q.Analysis, ts, ts)
	if err != nil {
		return Question{}, err
	}
	id, _ := res.LastInsertId()
	q.ID = id
	q.Code = code
	q.CreatedAt = ts
	q.UpdatedAt = ts
	q.UseCount = 0
	if err := saveAttachments(id, q.Images, q.Tables); err != nil {
		return Question{}, err
	}
	return getQuestion(id)
}

// nextCode 生成下一个题目编号 Q0001, Q0002...
func nextCode() string {
	var maxID int64
	_ = db.QueryRow("SELECT COALESCE(MAX(id),0)+1 FROM questions").Scan(&maxID)
	return fmt.Sprintf("Q%04d", maxID)
}

func updateQuestion(q Question) error {
	ts := now()
	_, err := db.Exec(`UPDATE questions SET
		subject=?, qtype=?, grade=?, difficulty=?, tags=?, source=?, body=?, options=?, answer=?, analysis=?, updated_at=?
		WHERE id=?`,
		q.Subject, q.QType, q.Grade, q.Difficulty, marshalStrings(q.Tags), q.Source,
		q.Body, marshalStrings(q.Options), q.Answer, q.Analysis, ts, q.ID)
	if err != nil {
		return err
	}
	if _, err := db.Exec("DELETE FROM images WHERE question_id = ?", q.ID); err != nil {
		return err
	}
	if _, err := db.Exec("DELETE FROM tables WHERE question_id = ?", q.ID); err != nil {
		return err
	}
	return saveAttachments(q.ID, q.Images, q.Tables)
}

func saveAttachments(qid int64, images []Image, tables []Table) error {
	for i, im := range images {
		if im.Data == "" {
			continue
		}
		if _, err := db.Exec("INSERT INTO images (question_id, position, data, width) VALUES (?,?,?,?)",
			qid, i, im.Data, im.Width); err != nil {
			return err
		}
	}
	for i, t := range tables {
		if t.Markdown == "" {
			continue
		}
		if _, err := db.Exec("INSERT INTO tables (question_id, position, markdown) VALUES (?,?,?)",
			qid, i, t.Markdown); err != nil {
			return err
		}
	}
	return nil
}

func deleteQuestion(id int64) (refs int, err error) {
	err = db.QueryRow("SELECT COUNT(*) FROM paper_items WHERE question_id = ? AND deleted = 0", id).Scan(&refs)
	if err != nil {
		return 0, err
	}
	// 先标记引用为已删除（保留卷子结构），再删题；外键 SET NULL 会把 question_id 置空
	if _, err := db.Exec("UPDATE paper_items SET deleted = 1 WHERE question_id = ?", id); err != nil {
		return 0, err
	}
	_, err = db.Exec("DELETE FROM questions WHERE id = ?", id)
	return refs, err
}

// ---------- 元数据 ----------

func listSubjects() ([]string, error) {
	rows, err := db.Query("SELECT DISTINCT subject FROM questions WHERE subject != '' ORDER BY subject")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func listTags() ([]string, error) {
	rows, err := db.Query("SELECT tags FROM questions")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	set := map[string]bool{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		for _, t := range unmarshalStrings(s) {
			set[t] = true
		}
	}
	out := []string{}
	for t := range set {
		out = append(out, t)
	}
	sortStrings(out)
	return out, rows.Err()
}

// ---------- 卷子 ----------

type Paper struct {
	ID           int64       `json:"id"`
	Name         string      `json:"name"`
	Subject      string      `json:"subject"`
	CreatedAt    string      `json:"createdAt"`
	ItemCount    int         `json:"itemCount"`
	DeletedCount int         `json:"deletedCount"`
	Items        []PaperItem `json:"items"`
}

type PaperItem struct {
	ID         int64  `json:"id"`
	QuestionID int64  `json:"questionId"`
	Position   int    `json:"position"`
	Score      float64 `json:"score"`
	Deleted    int    `json:"deleted"`
	Question   *Question `json:"question,omitempty"`
}

func listPapers() ([]Paper, error) {
	rows, err := db.Query(`SELECT id, name, subject, created_at,
		(SELECT COUNT(*) FROM paper_items WHERE paper_id = papers.id) AS cnt,
		(SELECT COUNT(*) FROM paper_items WHERE paper_id = papers.id AND deleted = 1) AS dc
		FROM papers ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Paper{}
	for rows.Next() {
		var p Paper
		if err := rows.Scan(&p.ID, &p.Name, &p.Subject, &p.CreatedAt, &p.ItemCount, &p.DeletedCount); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func getPaper(id int64) (Paper, error) {
	var p Paper
	err := db.QueryRow("SELECT id, name, subject, created_at FROM papers WHERE id = ?", id).
		Scan(&p.ID, &p.Name, &p.Subject, &p.CreatedAt)
	if err != nil {
		return Paper{}, err
	}
	rows, err := db.Query("SELECT id, COALESCE(question_id, 0), position, score, deleted FROM paper_items WHERE paper_id = ? ORDER BY position, id", id)
	if err != nil {
		return Paper{}, err
	}
	items := []PaperItem{}
	for rows.Next() {
		var it PaperItem
		if err := rows.Scan(&it.ID, &it.QuestionID, &it.Position, &it.Score, &it.Deleted); err != nil {
			rows.Close()
			return Paper{}, err
		}
		items = append(items, it)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return Paper{}, err
	}
	// rows 已关闭，此时才可发起新查询加载题目
	for i := range items {
		if items[i].Deleted == 0 {
			q, err := getQuestion(items[i].QuestionID)
			if err == nil {
				items[i].Question = &q
			}
		}
	}
	p.Items = items
	return p, nil
}

func insertPaper(name, subject string, items []PaperItem) (Paper, error) {
	res, err := db.Exec("INSERT INTO papers (name, subject, created_at) VALUES (?,?,?)", name, subject, now())
	if err != nil {
		return Paper{}, err
	}
	pid, _ := res.LastInsertId()
	if err := savePaperItems(pid, items); err != nil {
		return Paper{}, err
	}
	return getPaper(pid)
}

func updatePaper(p Paper) error {
	_, err := db.Exec("UPDATE papers SET name=?, subject=? WHERE id=?", p.Name, p.Subject, p.ID)
	if err != nil {
		return err
	}
	// 回退旧引用的使用次数，避免重复保存虚增
	rows, err := db.Query("SELECT question_id FROM paper_items WHERE paper_id = ? AND deleted = 0 AND question_id IS NOT NULL", p.ID)
	if err != nil {
		return err
	}
	oldIDs := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		oldIDs = append(oldIDs, id)
	}
	rows.Close()
	for _, id := range oldIDs {
		_, _ = db.Exec("UPDATE questions SET use_count = use_count - 1 WHERE id = ? AND use_count > 0", id)
	}
	if _, err := db.Exec("DELETE FROM paper_items WHERE paper_id = ?", p.ID); err != nil {
		return err
	}
	return savePaperItems(p.ID, p.Items)
}

func savePaperItems(pid int64, items []PaperItem) error {
	// 更新题目使用次数
	for _, it := range items {
		if it.Deleted == 0 {
			_, _ = db.Exec("UPDATE questions SET use_count = use_count + 1 WHERE id = ?", it.QuestionID)
		}
	}
	for i, it := range items {
		if _, err := db.Exec("INSERT INTO paper_items (paper_id, question_id, position, score, deleted) VALUES (?,?,?,?,?)",
			pid, it.QuestionID, i, it.Score, it.Deleted); err != nil {
			return err
		}
	}
	return nil
}

func deletePaper(id int64) error {
	// 回退卷内题目的使用次数
	rows, err := db.Query("SELECT question_id FROM paper_items WHERE paper_id = ? AND deleted = 0 AND question_id IS NOT NULL", id)
	if err != nil {
		return err
	}
	ids := []int64{}
	for rows.Next() {
		var qid int64
		if err := rows.Scan(&qid); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, qid)
	}
	rows.Close()
	for _, qid := range ids {
		_, _ = db.Exec("UPDATE questions SET use_count = use_count - 1 WHERE id = ? AND use_count > 0", qid)
	}
	_, err = db.Exec("DELETE FROM papers WHERE id = ?", id)
	return err
}

// ---------- 收藏夹 ----------

type Favorite struct {
	ID           int64          `json:"id"`
	Name         string         `json:"name"`
	CreatedAt    string         `json:"createdAt"`
	ItemCount    int            `json:"itemCount"`
	DeletedCount int            `json:"deletedCount"`
	Items        []FavoriteItem `json:"items"`
}

type FavoriteItem struct {
	ID         int64     `json:"id"`
	QuestionID int64     `json:"questionId"`
	Position   int       `json:"position"`
	Deleted    int       `json:"deleted"`
	CreatedAt  string    `json:"createdAt"`
	Question   *Question `json:"question,omitempty"`
}

func listFavorites() ([]Favorite, error) {
	rows, err := db.Query(`SELECT id, name, created_at,
		(SELECT COUNT(*) FROM favorite_items WHERE favorite_id = favorites.id) AS cnt,
		(SELECT COUNT(*) FROM favorite_items WHERE favorite_id = favorites.id AND deleted = 1) AS dc
		FROM favorites ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Favorite{}
	for rows.Next() {
		var f Favorite
		if err := rows.Scan(&f.ID, &f.Name, &f.CreatedAt, &f.ItemCount, &f.DeletedCount); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func getFavorite(id int64) (Favorite, error) {
	var f Favorite
	err := db.QueryRow("SELECT id, name, created_at FROM favorites WHERE id = ?", id).
		Scan(&f.ID, &f.Name, &f.CreatedAt)
	if err != nil {
		return Favorite{}, err
	}
	rows, err := db.Query("SELECT id, COALESCE(question_id, 0), position, deleted, created_at FROM favorite_items WHERE favorite_id = ? ORDER BY position, id", id)
	if err != nil {
		return Favorite{}, err
	}
	items := []FavoriteItem{}
	for rows.Next() {
		var it FavoriteItem
		if err := rows.Scan(&it.ID, &it.QuestionID, &it.Position, &it.Deleted, &it.CreatedAt); err != nil {
			rows.Close()
			return Favorite{}, err
		}
		items = append(items, it)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return Favorite{}, err
	}
	// rows 已关闭，此时才可加载题目
	for i := range items {
		if items[i].Deleted == 0 && items[i].QuestionID > 0 {
			q, err := getQuestion(items[i].QuestionID)
			if err == nil {
				items[i].Question = &q
			}
		}
	}
	f.Items = items
	return f, nil
}

func insertFavorite(name string) (Favorite, error) {
	res, err := db.Exec("INSERT INTO favorites (name, created_at) VALUES (?,?)", name, now())
	if err != nil {
		return Favorite{}, err
	}
	id, _ := res.LastInsertId()
	return getFavorite(id)
}

func updateFavorite(f Favorite) error {
	if _, err := db.Exec("UPDATE favorites SET name=? WHERE id=?", f.Name, f.ID); err != nil {
		return err
	}
	// 重建条目（保持去重与顺序）
	if _, err := db.Exec("DELETE FROM favorite_items WHERE favorite_id = ?", f.ID); err != nil {
		return err
	}
	seen := map[int64]bool{}
	for i, it := range f.Items {
		if it.QuestionID <= 0 || seen[it.QuestionID] {
			continue
		}
		seen[it.QuestionID] = true
		if _, err := db.Exec("INSERT INTO favorite_items (favorite_id, question_id, position, deleted, created_at) VALUES (?,?,?,0,?)",
			f.ID, it.QuestionID, i, now()); err != nil {
			return err
		}
	}
	return nil
}

func deleteFavorite(id int64) error {
	_, err := db.Exec("DELETE FROM favorites WHERE id = ?", id)
	return err
}

// addFavoriteItem 收题：同夹同题自动忽略（返回是否已存在）
func addFavoriteItem(fid, qid int64) (bool, error) {
	var exists int64
	err := db.QueryRow("SELECT COUNT(*) FROM favorite_items WHERE favorite_id = ? AND question_id = ? AND deleted = 0", fid, qid).Scan(&exists)
	if err != nil {
		return false, err
	}
	if exists > 0 {
		return true, nil
	}
	var maxPos int
	_ = db.QueryRow("SELECT COALESCE(MAX(position),-1) FROM favorite_items WHERE favorite_id = ?", fid).Scan(&maxPos)
	_, err = db.Exec("INSERT INTO favorite_items (favorite_id, question_id, position, deleted, created_at) VALUES (?,?,?,0,?)",
		fid, qid, maxPos+1, now())
	return false, err
}

func removeFavoriteItem(fid, qid int64) error {
	_, err := db.Exec("DELETE FROM favorite_items WHERE favorite_id = ? AND question_id = ?", fid, qid)
	return err
}

// favoriteIdsForQuestion 返回包含该题的收藏夹 id 列表
func favoriteIdsForQuestion(qid int64) ([]int64, error) {
	rows, err := db.Query("SELECT favorite_id FROM favorite_items WHERE question_id = ? AND deleted = 0", qid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// ---------- JSON 快照 ----------

type Snapshot struct {
	Version   int        `json:"version"`
	Exported  string     `json:"exportedAt"`
	Questions []Question `json:"questions"`
}

func exportSnapshot() (Snapshot, error) {
	rows, err := db.Query("SELECT " + qCols + " FROM questions ORDER BY id")
	if err != nil {
		return Snapshot{}, err
	}
	defer rows.Close()
	qs := []Question{}
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			return Snapshot{}, err
		}
		qs = append(qs, q)
	}
	for i := range qs {
		if err := loadAttachments(&qs[i]); err != nil {
			return Snapshot{}, err
		}
	}
	return Snapshot{Version: 1, Exported: now(), Questions: qs}, nil
}

// importSnapshot 返回 (新增, 更新, 跳过)；按题干+选项精确匹配去重（简单可靠，不误判）
func importSnapshot(sn Snapshot, overwrite bool) (added, updated, skipped int, err error) {
	for _, q := range sn.Questions {
		// 按 body+options 精确查重
		var existing int64
		e := db.QueryRow(`SELECT id FROM questions WHERE body = ? AND options = ?`, q.Body, marshalStrings(q.Options)).Scan(&existing)
		if e == nil {
			if overwrite {
				q.ID = existing
				if err = updateQuestion(q); err != nil {
					return
				}
				updated++
			} else {
				skipped++
			}
			continue
		}
		if e != sql.ErrNoRows {
			err = e
			return
		}
		if _, err = insertQuestion(q); err != nil {
			return
		}
		added++
	}
	return
}
