package main

import (
	"log"
	"net/http"
	"sort"
	"strings"
)

// TagStat 标签统计项
type TagStat struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// tagStats 按科目+年级聚合题目上的标签
func tagStats(subject, grade string) ([]TagStat, error) {
	rows, err := db.Query("SELECT tags FROM questions WHERE subject = ? AND grade = ?", subject, grade)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	counts := map[string]int{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		for _, t := range unmarshalStrings(s) {
			counts[t]++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := make([]TagStat, 0, len(counts))
	for name, n := range counts {
		out = append(out, TagStat{Name: name, Count: n})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Count > out[j].Count })
	return out, nil
}

// replaceTag 批量替换标签：from -> to（改名与合并通用），返回受影响题数
func replaceTag(subject, grade, from, to string) (int, error) {
	from = strings.TrimSpace(from)
	to = strings.TrimSpace(to)
	if from == "" || to == "" || from == to {
		return 0, nil
	}
	rows, err := db.Query("SELECT id, tags FROM questions WHERE subject = ? AND grade = ?", subject, grade)
	if err != nil {
		return 0, err
	}
	type rowT struct {
		id   int64
		tags []string
	}
	affected := []rowT{}
	for rows.Next() {
		var id int64
		var s string
		if err := rows.Scan(&id, &s); err != nil {
			rows.Close()
			return 0, err
		}
		tags := unmarshalStrings(s)
		hit := false
		newTags := []string{}
		seen := map[string]bool{}
		for _, t := range tags {
			nt := t
			if t == from {
				nt = to
				hit = true
			}
			if !seen[nt] {
				seen[nt] = true
				newTags = append(newTags, nt)
			}
		}
		if hit {
			affected = append(affected, rowT{id: id, tags: newTags})
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}
	// rows 已关闭，此时才可更新
	for _, r := range affected {
		if _, err := db.Exec("UPDATE questions SET tags = ?, updated_at = ? WHERE id = ?",
			marshalStrings(r.tags), now(), r.id); err != nil {
			return 0, err
		}
	}
	return len(affected), nil
}

func handleTagStats(w http.ResponseWriter, r *http.Request) {
	subject := r.URL.Query().Get("subject")
	grade := r.URL.Query().Get("grade")
	if subject == "" || grade == "" {
		writeErr(w, 400, "缺少 subject 或 grade 参数")
		return
	}
	stats, err := tagStats(subject, grade)
	if err != nil {
		log.Println("tagStats:", err)
		writeErr(w, 500, "统计失败")
		return
	}
	writeJSON(w, 200, map[string]any{"tags": stats})
}

func handleTagReplace(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Subject string `json:"subject"`
		Grade   string `json:"grade"`
		From    string `json:"from"`
		To      string `json:"to"`
	}
	if err := readJSON(r, &body); err != nil {
		writeErr(w, 400, "请求格式错误")
		return
	}
	n, err := replaceTag(body.Subject, body.Grade, body.From, body.To)
	if err != nil {
		log.Println("replaceTag:", err)
		writeErr(w, 500, "替换失败")
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "affected": n})
}
