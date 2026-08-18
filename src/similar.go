package main

import (
	"math"
	"regexp"
	"sort"
	"strings"
)

var wordRe = regexp.MustCompile(`[a-zA-Z0-9]+`)

// 中文虚字集合：含任一虚字的相邻两字组合视为噪声，不参与相似度计算
var stopChars = map[rune]bool{}

func init() {
	for _, c := range "的 了 在 是 与 为 所 及 和 对 从 则 时 中 于 不 且 或 即 得 并 也 都 而 但 若 由 故 此 其 这 那 个 一 有 可 能 将 被 把 让 使 之 者 等 已 就 又 再 如 因 至 依 按" {
		stopChars[c] = true
	}
}

// tokenize 中英混合分词：英文/数字按词，中文按相邻两字（bigram，过滤虚字组合）
func tokenize(s string) []string {
	var toks []string
	for _, w := range wordRe.FindAllString(s, -1) {
		toks = append(toks, strings.ToLower(w))
	}
	runes := []rune(s)
	for i := 0; i+1 < len(runes); i++ {
		a, b := runes[i], runes[i+1]
		if a >= 0x4e00 && a <= 0x9fff && b >= 0x4e00 && b <= 0x9fff {
			if stopChars[a] || stopChars[b] {
				continue
			}
			toks = append(toks, string([]rune{a, b}))
		}
	}
	return toks
}

// SimilarResult 相似题结果
type SimilarResult struct {
	Question Question `json:"question"`
	Score    float64  `json:"score"`
}

// findSimilar 同科目相似题检索：标签 Jaccard + 题干 TF-IDF 余弦，各占 0.5
func findSimilar(id int64, limit int) ([]SimilarResult, error) {
	target, err := getQuestion(id)
	if err != nil {
		return nil, err
	}
	// 同科目同年级其他题
	rows, err := db.Query("SELECT id, body, tags FROM questions WHERE subject = ? AND grade = ? AND id != ?", target.Subject, target.Grade, id)
	if err != nil {
		return nil, err
	}
	type rowT struct {
		id   int64
		body string
		tags []string
	}
	rowsData := []rowT{}
	for rows.Next() {
		var r rowT
		var tags string
		if err := rows.Scan(&r.id, &r.body, &tags); err != nil {
			rows.Close()
			return nil, err
		}
		r.tags = unmarshalStrings(tags)
		rowsData = append(rowsData, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 30 {
		limit = 8
	}

	// 文档频率（目标题 + 候选）
	df := map[string]int{}
	docs := make([][]string, len(rowsData)+1)
	docs[0] = tokenize(target.Body)
	for i, r := range rowsData {
		docs[i+1] = tokenize(r.body)
	}
	for _, toks := range docs {
		seen := map[string]bool{}
		for _, t := range toks {
			if !seen[t] {
				seen[t] = true
				df[t]++
			}
		}
	}
	N := float64(len(docs))
	tfidf := func(toks []string) map[string]float64 {
		tf := map[string]int{}
		for _, t := range toks {
			tf[t]++
		}
		v := map[string]float64{}
		for t, c := range tf {
			if d, ok := df[t]; ok && d > 0 {
				v[t] = float64(c) * math.Log(N/float64(d))
			}
		}
		return v
	}
	targetVec := tfidf(docs[0])
	cosSim := func(v map[string]float64) float64 {
		var dot, na, nb float64
		for t, w := range v {
			if tw, ok := targetVec[t]; ok {
				dot += w * tw
			}
			nb += w * w
		}
		for _, w := range targetVec {
			na += w * w
		}
		if na == 0 || nb == 0 {
			return 0
		}
		return dot / (math.Sqrt(na) * math.Sqrt(nb))
	}
	tagSim := func(a, b []string) float64 {
		if len(a) == 0 || len(b) == 0 {
			return 0
		}
		related := func(x, y string) bool {
			if x == y {
				return true
			}
			// 子串包含匹配（至少两字），单字标签只做完全相等匹配
			return len([]rune(x)) >= 2 && len([]rune(y)) >= 2 && (strings.Contains(x, y) || strings.Contains(y, x))
		}
		// 交集 = 两侧覆盖数的较大值；分母 = 两侧长度的较大值
		// 保证结果恒在 [0,1]（包含关系下普通 Jaccard 会超 1）
		coverA := 0
		for _, x := range a {
			for _, y := range b {
				if related(x, y) {
					coverA++
					break
				}
			}
		}
		coverB := 0
		for _, y := range b {
			for _, x := range a {
				if related(x, y) {
					coverB++
					break
				}
			}
		}
		inter := coverA
		if coverB > inter {
			inter = coverB
		}
		denom := len(a)
		if len(b) > denom {
			denom = len(b)
		}
		if denom == 0 {
			return 0
		}
		return float64(inter) / float64(denom)
	}

	type scored struct {
		q     Question
		score float64
	}
	list := []scored{}
	for i, r := range rowsData {
		textSim := cosSim(tfidf(docs[i+1]))
		tagSimVal := tagSim(target.Tags, r.tags)
		score := 0.5*textSim + 0.5*tagSimVal
		if score < 0.08 {
			continue
		}
		q, err := getQuestion(r.id)
		if err != nil {
			continue
		}
		list = append(list, scored{q: q, score: score})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].score > list[j].score })
	if len(list) > limit {
		list = list[:limit]
	}
	out := make([]SimilarResult, 0, len(list))
	for _, s := range list {
		out = append(out, SimilarResult{Question: s.q, Score: math.Round(s.score*1000) / 10})
	}
	return out, nil
}
