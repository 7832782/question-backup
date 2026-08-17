package main

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var attachTagRe = regexp.MustCompile(`\{\{(图|表)\d+\}\}`)
var optPrefixRe = regexp.MustCompile(`^[A-Za-z][.．、:：]\s*`)

type ExportRequest struct {
	PaperName   string     `json:"paperName"`
	Questions   []Question `json:"questions"`
	Scores      []float64  `json:"scores"` // 与 questions 平行的分值列表
	WithBody    bool       `json:"withBody"` // 是否导出题目正文（false = 只导出答案/解析）
	AnswerPos   string     `json:"answerPos"`   // off / after / end
	AnalysisPos string     `json:"analysisPos"` // off / after / end
}

var qtypeNames = map[string]string{
	"single": "单项选择题",
	"multi":  "多项选择题",
	"fill":   "填空题",
	"essay":  "解答题",
}

type groupedQ struct {
	qtype  string
	qs     []Question
	scores []float64
}

func buildMarkdown(req ExportRequest) (string, string, error) {
	if len(req.Questions) == 0 {
		return "", "", fmt.Errorf("没有题目")
	}
	// 分值并行数组，缺失时补 0
	scores := make([]float64, len(req.Questions))
	for i := range req.Questions {
		if i < len(req.Scores) {
			scores[i] = req.Scores[i]
		}
	}
	// 先收集答案/解析（无论是否导出题目，编号始终按全量题目 1..N）
	nums := []int{}
	answers := []string{}
	analyses := []string{}
	for i, q := range req.Questions {
		nums = append(nums, i+1)
		answers = append(answers, answerText(q))
		analyses = append(analyses, q.Analysis)
	}
	// 按「连续相同题型」分块：导出顺序与组卷预览顺序完全一致
	// 连续的同题型自动合成一个分组（配合「按题型排序」即为标准试卷格式）
	groups := []groupedQ{}
	for i, q := range req.Questions {
		if len(groups) > 0 && groups[len(groups)-1].qtype == q.QType {
			last := &groups[len(groups)-1]
			last.qs = append(last.qs, q)
			last.scores = append(last.scores, scores[i])
		} else {
			groups = append(groups, groupedQ{qtype: q.QType, qs: []Question{q}, scores: []float64{scores[i]}})
		}
	}

	var b strings.Builder
	if req.PaperName != "" {
		b.WriteString("# " + req.PaperName + "\n\n")
	}
	cn := []string{"一", "二", "三", "四", "五", "六", "七", "八", "九", "十"}

	// 题目正文（按 withBody 开关：false 时只输出答案/解析，即答案卷）
	if req.WithBody {
		num := 0
		for gi, g := range groups {
			name := qtypeNames[g.qtype]
			if name == "" {
				name = "题目"
			}
			gs := g.scores
			sameScore := true
			for _, s := range gs {
				if s != gs[0] {
					sameScore = false
					break
				}
			}
			head := fmt.Sprintf("%s、%s（共 %d 题", cn[gi%len(cn)], name, len(g.qs))
			if sameScore && gs[0] > 0 {
				head += fmt.Sprintf("，每题 %s 分", fmtScore(gs[0]))
			}
			head += "）"
			b.WriteString("## " + head + "\n\n")

			for qi, q := range g.qs {
				num++
				sc := gs[qi]

				title := fmt.Sprintf("%d. ", num)
				if !sameScore && sc > 0 {
					title += fmt.Sprintf("（%s分）", fmtScore(sc))
				}
				body := renderBody(q.Body, q.Images, q.Tables)
				b.WriteString(title + body + "\n")

			if len(q.Options) > 0 {
				for i, opt := range q.Options {
					content := strings.TrimSpace(opt)
					if content == "" {
						continue
					}
					content = optPrefixRe.ReplaceAllString(content, "")
					letter := string(rune('A' + i))
					b.WriteString("\n   " + letter + ". " + content + "  ")
				}
				b.WriteString("\n")
			}
			b.WriteString("\n")

			if req.AnswerPos == "after" && answers[len(answers)-1] != "" {
				b.WriteString("**答案：**" + answers[len(answers)-1] + "\n\n")
			}
			if req.AnalysisPos == "after" && q.Analysis != "" {
				b.WriteString("**解析：**" + renderAnalysis(q.Analysis) + "\n\n")
			}
		}
	}
	}

	if req.AnswerPos == "end" {
		any := false
		for _, a := range answers {
			if strings.TrimSpace(a) != "" {
				any = true
				break
			}
		}
		if any {
			b.WriteString("## 参考答案\n\n")
			for i, a := range answers {
				if strings.TrimSpace(a) == "" {
					continue
				}
				b.WriteString(fmt.Sprintf("%d. %s\n\n", nums[i], a))
			}
		}
	}
	if req.AnalysisPos == "end" {
		any := false
		for _, an := range analyses {
			if strings.TrimSpace(an) != "" {
				any = true
				break
			}
		}
		if any {
			b.WriteString("## 解析\n\n")
			for i, an := range analyses {
				if strings.TrimSpace(an) == "" {
					continue
				}
				an = renderAnalysis(an)
				b.WriteString(fmt.Sprintf("%d. %s\n\n", nums[i], an))
			}
		}
	}

	date := time.Now().Format("20060102")
	// 文件名：卷名_内容_日期.md，内容按导出组合拼接
	suffix := ""
	if req.WithBody {
		suffix += "题目"
	}
	if req.AnswerPos != "off" {
		suffix += "答案"
	}
	if req.AnalysisPos != "off" {
		suffix += "解析"
	}
	if suffix == "" {
		suffix = "题目"
	}
	fn := "试卷"
	if req.PaperName != "" {
		fn = req.PaperName
	}
	return b.String(), fn + "_" + suffix + "_" + date + ".md", nil
}

func fmtScore(v float64) string {
	if v == float64(int64(v)) {
		return strconv.FormatInt(int64(v), 10)
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}

// answerText 生成答案文本
func answerText(q Question) string {
	a := strings.TrimSpace(q.Answer)
	if a == "" {
		return ""
	}
	if q.QType == "single" || q.QType == "multi" {
		a = strings.ToUpper(a)
		a = strings.NewReplacer(" ", "", ",", "", "，", "", "、", "", ";", "", "；", "").Replace(a)
	}
	return a
}

// renderBody 渲染题干：图、表统一追加在末尾（不再需要 {{图N}}/{{表N}} 占位符）
func renderBody(text string, images []Image, tables []Table) string {
	if text == "" {
		return ""
	}
	t := attachTagRe.ReplaceAllString(text, "")
	for i, im := range images {
		if im.Data == "" {
			continue
		}
		w := im.Width
		if w <= 0 {
			w = 30
		}
		if w > 100 {
			w = 100
		}
		img := fmt.Sprintf(`<img src="%s" style="width:%d%%;max-width:100%%" alt="图%d">`, im.Data, w, i+1)
		t += "\n\n" + img
	}
	for _, tb := range tables {
		if strings.TrimSpace(tb.Markdown) == "" {
			continue
		}
		t += "\n\n" + tb.Markdown
	}
	return t
}

// renderAnalysis 渲染解析：附件占位符静默移除（附件已统一在题干后）
func renderAnalysis(text string) string {
	if text == "" {
		return ""
	}
	return attachTagRe.ReplaceAllString(text, "")
}
