package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

func apiHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/questions", handleListQuestions)
	mux.HandleFunc("POST /api/questions", handleCreateQuestion)
	mux.HandleFunc("GET /api/questions/{id}", handleGetQuestion)
	mux.HandleFunc("PUT /api/questions/{id}", handleUpdateQuestion)
	mux.HandleFunc("DELETE /api/questions/{id}", handleDeleteQuestion)
	mux.HandleFunc("GET /api/questions/{id}/similar", handleSimilar)
	mux.HandleFunc("GET /api/questions/{id}/favs", handleQuestionFavs)
	mux.HandleFunc("GET /api/favorites", handleListFavorites)
	mux.HandleFunc("POST /api/favorites", handleCreateFavorite)
	mux.HandleFunc("GET /api/favorites/{id}", handleGetFavorite)
	mux.HandleFunc("PUT /api/favorites/{id}", handleUpdateFavorite)
	mux.HandleFunc("DELETE /api/favorites/{id}", handleDeleteFavorite)
	mux.HandleFunc("POST /api/favorites/{id}/items", handleAddFavoriteItem)
	mux.HandleFunc("DELETE /api/favorites/{id}/items/{qid}", handleRemoveFavoriteItem)
	mux.HandleFunc("GET /api/meta", handleMeta)
	mux.HandleFunc("GET /api/tags/manage", handleTagStats)
	mux.HandleFunc("POST /api/tags/replace", handleTagReplace)
	mux.HandleFunc("GET /api/stats", handleStats)
	mux.HandleFunc("GET /api/papers", handleListPapers)
	mux.HandleFunc("POST /api/papers", handleCreatePaper)
	mux.HandleFunc("GET /api/papers/{id}", handleGetPaper)
	mux.HandleFunc("PUT /api/papers/{id}", handleUpdatePaper)
	mux.HandleFunc("DELETE /api/papers/{id}", handleDeletePaper)
	mux.HandleFunc("POST /api/export", handleExport)
	mux.HandleFunc("GET /api/snapshot", handleSnapshotExport)
	mux.HandleFunc("POST /api/import", handleSnapshotImport)
	return mux
}

// ---------- 工具 ----------

func writeJSON(w http.ResponseWriter, code int, v any) {
	// API 数据必须禁缓存：浏览器启发式缓存曾导致修改后读到旧数据（如 qtype 显示旧值）
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

func readJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func pathID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil
}

func marshalStrings(ss []string) string {
	if ss == nil {
		ss = []string{}
	}
	b, _ := json.Marshal(ss)
	return string(b)
}

func unmarshalStrings(s string) []string {
	var out []string
	if s == "" {
		return []string{}
	}
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return []string{}
	}
	return out
}

func sortStrings(ss []string) { sort.Strings(ss) }

// ---------- 筛选 ----------

type QueryFilter struct {
	Subject       string `json:"subject"`
	QType         string `json:"qtype"`
	Grade         string `json:"grade"`
	DifficultyMin int    `json:"difficultyMin"`
	DifficultyMax int    `json:"difficultyMax"`
	Tag           string `json:"tag"`
	Source        string `json:"source"`
	Search        string `json:"search"`
	Unused        bool   `json:"unused"`
	Page          int    `json:"page"`
	PageSize      int    `json:"pageSize"`
}

func parseFilter(r *http.Request) QueryFilter {
	q := r.URL.Query()
	f := QueryFilter{
		Subject: q.Get("subject"),
		QType:   q.Get("qtype"),
		Grade:   q.Get("grade"),
		Tag:     q.Get("tag"),
		Source:  q.Get("source"),
		Search:  q.Get("search"),
		Page:    1,
	}
	f.DifficultyMin, _ = strconv.Atoi(q.Get("difficultyMin"))
	f.DifficultyMax, _ = strconv.Atoi(q.Get("difficultyMax"))
	if f.DifficultyMax == 0 {
		f.DifficultyMax = 5
	}
	f.Unused = q.Get("unused") == "1"
	if p, err := strconv.Atoi(q.Get("page")); err == nil && p > 0 {
		f.Page = p
	}
	if ps, err := strconv.Atoi(q.Get("pageSize")); err == nil && ps > 0 {
		f.PageSize = ps
	}
	return f
}

// ---------- 题目 ----------

func handleListQuestions(w http.ResponseWriter, r *http.Request) {
	f := parseFilter(r)
	qs, total, err := listQuestions(f)
	if err != nil {
		log.Println("listQuestions:", err)
		writeErr(w, 500, "查询失败")
		return
	}
	writeJSON(w, 200, map[string]any{"questions": qs, "total": total})
}

func handleGetQuestion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	q, err := getQuestion(id)
	if err != nil {
		writeErr(w, 404, "题目不存在")
		return
	}
	writeJSON(w, 200, q)
}

func handleCreateQuestion(w http.ResponseWriter, r *http.Request) {
	var q Question
	if err := readJSON(r, &q); err != nil {
		writeErr(w, 400, "请求格式错误: "+err.Error())
		return
	}
	if strings.TrimSpace(q.Body) == "" {
		writeErr(w, 400, "题干不能为空")
		return
	}
	q, err := insertQuestion(q)
	if err != nil {
		log.Println("insertQuestion:", err)
		writeErr(w, 500, "保存失败")
		return
	}
	writeJSON(w, 201, q)
}

func handleUpdateQuestion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	var q Question
	if err := readJSON(r, &q); err != nil {
		writeErr(w, 400, "请求格式错误: "+err.Error())
		return
	}
	q.ID = id
	if strings.TrimSpace(q.Body) == "" {
		writeErr(w, 400, "题干不能为空")
		return
	}
	if err := updateQuestion(q); err != nil {
		log.Println("updateQuestion:", err)
		writeErr(w, 500, "保存失败")
		return
	}
	updated, err := getQuestion(id)
	if err != nil {
		writeErr(w, 404, "题目不存在")
		return
	}
	writeJSON(w, 200, updated)
}

func handleDeleteQuestion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	refs, err := deleteQuestion(id)
	if err != nil {
		log.Println("deleteQuestion:", err)
		writeErr(w, 500, "删除失败")
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "refs": refs})
}

// ---------- 相似题 ----------

func handleSimilar(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	limit := 8
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 {
		limit = l
	}
	sims, err := findSimilar(id, limit)
	if err != nil {
		log.Println("findSimilar:", err)
		writeErr(w, 500, "相似题检索失败")
		return
	}
	writeJSON(w, 200, map[string]any{"similar": sims})
}

// ---------- 收藏夹 ----------

func handleQuestionFavs(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	ids, err := favoriteIdsForQuestion(id)
	if err != nil {
		writeErr(w, 500, "查询失败")
		return
	}
	writeJSON(w, 200, map[string]any{"favoriteIds": ids})
}

func handleListFavorites(w http.ResponseWriter, r *http.Request) {
	fs, err := listFavorites()
	if err != nil {
		writeErr(w, 500, "查询失败")
		return
	}
	writeJSON(w, 200, fs)
}

func handleCreateFavorite(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := readJSON(r, &body); err != nil {
		writeErr(w, 400, "请求格式错误")
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		writeErr(w, 400, "收藏夹名称不能为空")
		return
	}
	f, err := insertFavorite(strings.TrimSpace(body.Name))
	if err != nil {
		writeErr(w, 500, "创建失败")
		return
	}
	writeJSON(w, 201, f)
}

func handleGetFavorite(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	f, err := getFavorite(id)
	if err != nil {
		writeErr(w, 404, "收藏夹不存在")
		return
	}
	writeJSON(w, 200, f)
}

func handleUpdateFavorite(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	var f Favorite
	if err := readJSON(r, &f); err != nil {
		writeErr(w, 400, "请求格式错误")
		return
	}
	f.ID = id
	if strings.TrimSpace(f.Name) == "" {
		writeErr(w, 400, "收藏夹名称不能为空")
		return
	}
	if err := updateFavorite(f); err != nil {
		log.Println("updateFavorite:", err)
		writeErr(w, 500, "保存失败")
		return
	}
	updated, err := getFavorite(id)
	if err != nil {
		writeErr(w, 404, "收藏夹不存在")
		return
	}
	writeJSON(w, 200, updated)
}

func handleDeleteFavorite(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	if err := deleteFavorite(id); err != nil {
		writeErr(w, 500, "删除失败")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func handleAddFavoriteItem(w http.ResponseWriter, r *http.Request) {
	fid, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	var body struct {
		QuestionID int64 `json:"questionId"`
	}
	if err := readJSON(r, &body); err != nil {
		writeErr(w, 400, "请求格式错误")
		return
	}
	exists, err := addFavoriteItem(fid, body.QuestionID)
	if err != nil {
		writeErr(w, 500, "收藏失败")
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "exists": exists})
}

func handleRemoveFavoriteItem(w http.ResponseWriter, r *http.Request) {
	fid, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	qid, err2 := strconv.ParseInt(r.PathValue("qid"), 10, 64)
	if err2 != nil {
		writeErr(w, 400, "无效题目 ID")
		return
	}
	if err := removeFavoriteItem(fid, qid); err != nil {
		writeErr(w, 500, "移除失败")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// ---------- 元数据 ----------

func handleMeta(w http.ResponseWriter, r *http.Request) {
	subjects, _ := listSubjects()
	tags, _ := listTags()
	writeJSON(w, 200, map[string]any{"subjects": subjects, "tags": tags})
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	var total int
	_ = db.QueryRow("SELECT COUNT(*) FROM questions").Scan(&total)
	type row struct {
		Subject string `json:"subject"`
		QType   string `json:"qtype"`
		N       int    `json:"n"`
	}
	rows, err := db.Query("SELECT subject, qtype, COUNT(*) FROM questions GROUP BY subject, qtype ORDER BY subject, qtype")
	if err != nil {
		writeErr(w, 500, "统计失败")
		return
	}
	defer rows.Close()
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.Subject, &r.QType, &r.N); err != nil {
			continue
		}
		out = append(out, r)
	}
	writeJSON(w, 200, map[string]any{"total": total, "bySubjectType": out})
}

// ---------- 卷子 ----------

func handleListPapers(w http.ResponseWriter, r *http.Request) {
	ps, err := listPapers()
	if err != nil {
		writeErr(w, 500, "查询失败")
		return
	}
	writeJSON(w, 200, ps)
}

func handleCreatePaper(w http.ResponseWriter, r *http.Request) {
	var p Paper
	if err := readJSON(r, &p); err != nil {
		writeErr(w, 400, "请求格式错误: "+err.Error())
		return
	}
	if strings.TrimSpace(p.Name) == "" {
		writeErr(w, 400, "卷名不能为空")
		return
	}
	created, err := insertPaper(p.Name, p.Subject, p.Items)
	if err != nil {
		log.Println("insertPaper:", err)
		writeErr(w, 500, "保存失败")
		return
	}
	writeJSON(w, 201, created)
}

func handleGetPaper(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	p, err := getPaper(id)
	if err != nil {
		writeErr(w, 404, "卷子不存在")
		return
	}
	writeJSON(w, 200, p)
}

func handleUpdatePaper(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	var p Paper
	if err := readJSON(r, &p); err != nil {
		writeErr(w, 400, "请求格式错误: "+err.Error())
		return
	}
	p.ID = id
	if err := updatePaper(p); err != nil {
		log.Println("updatePaper:", err)
		writeErr(w, 500, "保存失败")
		return
	}
	updated, err := getPaper(id)
	if err != nil {
		writeErr(w, 404, "卷子不存在")
		return
	}
	writeJSON(w, 200, updated)
}

func handleDeletePaper(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		writeErr(w, 400, "无效 ID")
		return
	}
	if err := deletePaper(id); err != nil {
		writeErr(w, 500, "删除失败")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// ---------- 导出 ----------

func handleExport(w http.ResponseWriter, r *http.Request) {
	var req ExportRequest
	if err := readJSON(r, &req); err != nil {
		writeErr(w, 400, "请求格式错误: "+err.Error())
		return
	}
	md, filename, err := buildMarkdown(req)
	if err != nil {
		log.Println("buildMarkdown:", err)
		writeErr(w, 500, "导出失败: "+err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename*=UTF-8''`+urlEncode(filename))
	w.WriteHeader(200)
	_, _ = w.Write([]byte(md))
}

func urlEncode(s string) string {
	return url.PathEscape(s)
}

// ---------- 快照 ----------

func handleSnapshotExport(w http.ResponseWriter, r *http.Request) {
	sn, err := exportSnapshot()
	if err != nil {
		writeErr(w, 500, "导出失败")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename*=UTF-8''%E9%A2%98%E5%BA%93%E5%BF%AB%E7%85%A7.json`)
	_ = json.NewEncoder(w).Encode(sn)
}

func handleSnapshotImport(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var sn Snapshot
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&sn); err != nil {
		writeErr(w, 400, "文件格式错误: "+err.Error())
		return
	}
	overwrite := r.URL.Query().Get("overwrite") == "1"
	added, updated, skipped, err := importSnapshot(sn, overwrite)
	if err != nil {
		log.Println("importSnapshot:", err)
		writeErr(w, 500, "导入失败: "+err.Error())
		return
	}
	writeJSON(w, 200, map[string]int{"added": added, "updated": updated, "skipped": skipped})
}
