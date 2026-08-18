# -*- coding: utf-8 -*-
"""题库演示数据生成脚本：向运行中的服务批量写入题目
用法：python seed_demo.py  （先启动 题库系统.exe）"""
import json, base64, math, urllib.request

BASE = "http://127.0.0.1:8787"

def post(path, data):
    req = urllib.request.Request(BASE + path,
        data=json.dumps(data, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urllib.request.urlopen(req).read())

def svg_data_uri(svg):
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode()

def parabola_svg():
    """y=x^2 在 [-2,2] 上的图像"""
    w, h = 320, 240
    pts = []
    for i in range(41):
        x = -2 + 4 * i / 40
        y = x * x
        px = 20 + (x + 2) / 4 * (w - 40)
        py = h - 30 - y / 4 * (h - 60)
        pts.append(f"{px:.1f},{py:.1f}")
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<rect width="{w}" height="{h}" fill="#ffffff"/>
<line x1="20" y1="{h-30}" x2="{w-20}" y2="{h-30}" stroke="#333" stroke-width="1.5"/>
<line x1="{w/2}" y1="15" x2="{w/2}" y2="{h-30}" stroke="#333" stroke-width="1.5"/>
<path d="M {" ".join(pts)}" stroke="#2563eb" stroke-width="2.5" fill="none"/>
<text x="{w/2-18}" y="{h-8}" font-size="13" fill="#555">-2</text>
<text x="{w-38}" y="{h-8}" font-size="13" fill="#555">2</text>
<text x="{w/2+6}" y="{h-8}" font-size="13" fill="#555">0</text>
<text x="{w-16}" y="{h-38}" font-size="13" fill="#555">x</text>
<text x="{w/2+8}" y="18" font-size="13" fill="#555">y</text>
<text x="30" y="22" font-size="13" fill="#888">y=x²</text>
</svg>'''
    return svg_data_uri(svg)

def sine_svg():
    """y=sin(2x) 在 [0,2π] 上的图像（两个周期）"""
    w, h = 320, 240
    pts = []
    for i in range(81):
        x = 2 * math.pi * i / 80
        y = math.sin(2 * x)
        px = 20 + x / (2 * math.pi) * (w - 40)
        py = h / 2 - y * (h / 2 - 30)
        pts.append(f"{px:.1f},{py:.1f}")
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<rect width="{w}" height="{h}" fill="#ffffff"/>
<line x1="20" y1="{h/2}" x2="{w-20}" y2="{h/2}" stroke="#333" stroke-width="1.5"/>
<line x1="20" y1="15" x2="20" y2="{h-15}" stroke="#333" stroke-width="1.5"/>
<path d="M {" ".join(pts)}" stroke="#059669" stroke-width="2.5" fill="none"/>
<text x="28" y="20" font-size="13" fill="#555">1</text>
<text x="28" y="{h-10}" font-size="13" fill="#555">-1</text>
<text x="{w-16}" y="{h-38}" font-size="13" fill="#555">x</text>
<text x="26" y="{h-2}" font-size="13" fill="#555">O</text>
<text x="30" y="42" font-size="13" fill="#888">y=sin 2x</text>
</svg>'''
    return svg_data_uri(svg)

P = parabola_svg()
S = sine_svg()

def svg_img(width=60):
    return [{"data": P if width == 60 else S, "width": width}]

questions = [
    # ---------- 单选题 ----------
    {"subject": "数学", "qtype": "single", "difficulty": 1, "tags": ["集合"], "source": "2023新高考I卷改编",
     "body": "已知集合 $A=\\{x\\mid x^2-3x+2=0\\}$，$B=\\{x\\mid 0<x<3\\}$，则 $A\\cap B=$（　）",
     "options": ["A. {1}", "B. {2}", "C. {1,2}", "D. ∅"],
     "answer": "C", "analysis": "解方程 $x^2-3x+2=0$ 得 $x=1$ 或 $x=2$，即 $A=\\{1,2\\}$，两个元素都在 $B$ 内，故 $A\\cap B=\\{1,2\\}$。"},

    {"subject": "数学", "qtype": "single", "difficulty": 2, "tags": ["函数"], "source": "2024新高考II卷改编",
     "body": "函数 $f(x)=\\sqrt{x-1}+\\dfrac{1}{x-2}$ 的定义域是（　）",
     "options": ["A. (1,2)∪(2,+∞)", "B. [1,2)∪(2,+∞)", "C. [1,+∞)", "D. (1,+∞)"],
     "answer": "B", "analysis": "被开方数 $x-1\\ge 0$ 得 $x\\ge 1$；分母 $x-2\\neq 0$ 得 $x\\neq 2$。取交集得 $[1,2)\\cup(2,+\\infty)$。"},

    {"subject": "数学", "qtype": "single", "difficulty": 2, "tags": ["三角函数"], "source": "2023全国乙卷改编",
     "body": "函数 $f(x)=\\sin(2x+\\dfrac{\\pi}{3})$ 的最小正周期是（　）",
     "options": ["A. π", "B. 2π", "C. π/2", "D. 4π"],
     "answer": "A", "analysis": "$T=\\dfrac{2\\pi}{|\\omega|}=\\dfrac{2\\pi}{2}=\\pi$。"},

    {"subject": "数学", "qtype": "single", "difficulty": 3, "tags": ["导数", "函数图像"], "source": "原创",
     "body": "如图，曲线 $y=x^2$ 在点 $(1,1)$ 处的切线方程为（　）{{图1}}",
     "options": ["A. y=2x-1", "B. y=x", "C. y=2x+1", "D. y=x-1"],
     "answer": "A",
     "analysis": "$y'=2x$，在 $x=1$ 处切线斜率 $k=2$，切线过点 $(1,1)$：$y-1=2(x-1)$，即 $y=2x-1$。",
     "images": svg_img(60)},

    {"subject": "数学", "qtype": "single", "difficulty": 3, "tags": ["三角函数", "函数图像"], "source": "原创",
     "body": "如图是函数 $y=\\sin(\\omega x)$ 在 $[0,2\\pi]$ 上的图像（图中恰有两个完整周期），则 $\\omega=$（　）{{图1}}",
     "options": ["A. 1", "B. 2", "C. 1/2", "D. 4"],
     "answer": "B",
     "analysis": "图像在 $[0,2\\pi]$ 上恰有 2 个周期，故 $\\omega=2$。",
     "images": [{"data": S, "width": 60}]},

    {"subject": "数学", "qtype": "single", "difficulty": 4, "tags": ["数列"], "source": "2024新高考I卷改编",
     "body": "已知等差数列 $\\{a_n\\}$ 中，$a_3+a_7=12$，则 $a_5=$（　）",
     "options": ["A. 4", "B. 6", "C. 8", "D. 12"],
     "answer": "B",
     "analysis": "等差数列中 $a_3+a_7=2a_5$（等差中项性质：$3+7=2\\times 5$），故 $a_5=6$。"},

    # ---------- 多选题 ----------
    {"subject": "数学", "qtype": "multi", "difficulty": 3, "tags": ["函数"], "source": "原创",
     "body": "下列函数中，既是奇函数又在 $(0,+\\infty)$ 上单调递增的有（　）",
     "options": ["A. f(x)=x³", "B. f(x)=x+1/x", "C. f(x)=x", "D. f(x)=x²"],
     "answer": "AC",
     "analysis": "A、C 均为奇函数且在 $(0,+\\infty)$ 递增；B 为奇函数但在 $(0,1)$ 上递减；D 是偶函数。"},

    {"subject": "数学", "qtype": "multi", "difficulty": 3, "tags": ["立体几何"], "source": "2023新高考II卷改编",
     "body": "已知 $m$，$n$ 是两条不同直线，$\\alpha$，$\\beta$ 是两个不同平面，下列命题正确的有（　）",
     "options": ["A. 若 m∥α，n⊂α，则 m∥n", "B. 若 m⊥α，n⊥α，则 m∥n", "C. 若 m⊥α，m⊥β，则 α∥β", "D. 若 α⊥β，m⊂α，则 m⊥β"],
     "answer": "BC",
     "analysis": "A 错：$m$ 与 $n$ 可能异面；D 错：$m$ 与 $\\beta$ 可能斜交。B：垂直于同一平面的两条直线平行；C：垂直于同一直线的两个平面平行。"},

    {"subject": "数学", "qtype": "multi", "difficulty": 4, "tags": ["不等式"], "source": "2024新高考I卷改编",
     "body": "已知 $a>0$，$b>0$，$a+b=1$，下列不等式恒成立的有（　）",
     "options": ["A. ab ≤ 1/4", "B. a²+b² ≥ 1/2", "C. 1/a+1/b ≥ 4", "D. √a+√b ≤ √2"],
     "answer": "ABCD",
     "analysis": "A：$ab\\le(\\frac{a+b}{2})^2=\\frac14$；B：$a^2+b^2\\ge\\frac{(a+b)^2}{2}=\\frac12$；C：$\\frac1a+\\frac1b=\\frac{a+b}{ab}=\\frac1{ab}\\ge 4$；D：$(\\sqrt a+\\sqrt b)^2=1+2\\sqrt{ab}\\le 2$。四个选项均为均值不等式的直接推论。"},

    # ---------- 填空题 ----------
    {"subject": "数学", "qtype": "fill", "difficulty": 2, "tags": ["向量"], "source": "2023全国甲卷改编",
     "body": "已知向量 $\\vec a=(1,2)$，$\\vec b=(3,-1)$，则 $\\vec a\\cdot\\vec b=$______",
     "answer": "1",
     "analysis": "$\\vec a\\cdot\\vec b=1\\times 3+2\\times(-1)=3-2=1$。"},

    {"subject": "数学", "qtype": "fill", "difficulty": 3, "tags": ["计数原理"], "source": "2024新高考II卷改编",
     "body": "$(x+\\dfrac{1}{x})^6$ 的展开式中常数项为______",
     "answer": "20",
     "analysis": "通项 $T_{r+1}=C_6^r x^{6-r}x^{-r}=C_6^r x^{6-2r}$，令 $6-2r=0$ 得 $r=3$，常数项 $C_6^3=20$。"},

    {"subject": "数学", "qtype": "fill", "difficulty": 4, "tags": ["圆锥曲线"], "source": "2023新高考I卷改编",
     "body": "椭圆 $\\dfrac{x^2}{9}+\\dfrac{y^2}{4}=1$ 的离心率为______",
     "answer": "√5/3",
     "analysis": "$a^2=9$，$b^2=4$，$c^2=a^2-b^2=5$，$e=\\dfrac ca=\\dfrac{\\sqrt5}{3}$。"},

    # ---------- 解答题 ----------
    {"subject": "数学", "qtype": "essay", "difficulty": 3, "tags": ["三角函数"], "source": "2024新高考II卷改编",
     "body": "已知函数 $f(x)=2\\sin x\\cos x+2\\cos^2x-1$。\n\n（1）求 $f(x)$ 的最小正周期；\n\n（2）当 $x\\in[0,\\dfrac{\\pi}{2}]$ 时，求 $f(x)$ 的最大值。",
     "answer": "（1）$f(x)=\\sin 2x+\\cos 2x=\\sqrt2\\sin(2x+\\dfrac{\\pi}{4})$，最小正周期 $T=\\pi$。\n（2）$x\\in[0,\\frac{\\pi}{2}]$ 时 $2x+\\frac{\\pi}{4}\\in[\\frac{\\pi}{4},\\frac{5\\pi}{4}]$，当 $2x+\\frac{\\pi}{4}=\\frac{\\pi}{2}$ 即 $x=\\frac{\\pi}{8}$ 时取最大值 $\\sqrt2$。",
     "analysis": "先用二倍角公式合并：$2\\sin x\\cos x=\\sin 2x$，$2\\cos^2x-1=\\cos 2x$，再辅助角公式合并为一个正弦函数，周期与最值就清楚了。"},

    {"subject": "数学", "qtype": "essay", "difficulty": 4, "tags": ["数列"], "source": "原创",
     "body": "已知等差数列 $\\{a_n\\}$ 的前几项如下表：{{表1}}\n\n（1）求 $\\{a_n\\}$ 的通项公式；\n\n（2）求数列 $\\{a_n\\}$ 的前 $n$ 项和 $S_n$。",
     "tables": [{"markdown": "| n | 1 | 2 | 3 | 4 |\n|---|---|---|---|---|\n| aₙ | 2 | 5 | 8 | 11 |"}],
     "answer": "（1）$a_n=3n-1$；\n（2）$S_n=\\dfrac{n(3n+1)}{2}$。",
     "analysis": "公差 $d=3$，$a_1=2$，故 $a_n=2+3(n-1)=3n-1$。$S_n=\\dfrac{n(a_1+a_n)}{2}=\\dfrac{n(2+3n-1)}{2}=\\dfrac{n(3n+1)}{2}$。"},

    {"subject": "数学", "qtype": "essay", "difficulty": 4, "tags": ["概率统计"], "source": "原创",
     "body": "某班 40 名学生数学月考成绩的频率分布表如下：{{表1}}\n\n（1）估计该班数学成绩的平均分（用各组区间中点值估计）；\n\n（2）若成绩不低于 90 分评为优秀，估计该班优秀率。",
     "tables": [{"markdown": "| 分数段 | [60,70) | [70,80) | [80,90) | [90,100] |\n|--------|---------|---------|---------|----------|\n| 频数 | 6 | 12 | 14 | 8 |"}],
     "answer": "（1）平均分 $=\\dfrac{65\\times6+75\\times12+85\\times14+95\\times8}{40}=\\dfrac{3240}{40}=81$ 分；\n（2）优秀率 $=\\dfrac{8}{40}=20\\%$。",
     "analysis": "区间中点值分别取 65、75、85、95，乘以频数后求和再除以总人数。频数分布的分组数据只能用组中值近似平均分。"},

    {"subject": "数学", "qtype": "essay", "difficulty": 5, "tags": ["导数"], "source": "2023新高考I卷改编",
     "body": "已知函数 $f(x)=e^x-ax$。\n\n（1）讨论 $f(x)$ 的单调性；\n\n（2）若 $f(x)\\ge 0$ 恒成立，求 $a$ 的取值范围。",
     "answer": "（1）$f'(x)=e^x-a$。当 $a\\le 0$ 时，$f'(x)>0$，$f(x)$ 在 $\\mathbb R$ 上单调递增；当 $a>0$ 时，$f(x)$ 在 $(-\\infty,\\ln a)$ 上单调递减，在 $(\\ln a,+\\infty)$ 上单调递增。\n（2）由（1），当 $a\\le 0$ 时 $f(x)\\to -\\infty$（$x\\to-\\infty$），不合题意；当 $a>0$ 时最小值为 $f(\\ln a)=a-a\\ln a$，需 $a-a\\ln a\\ge 0$ 即 $\\ln a\\le 1$，故 $0<a\\le e$。综上 $a\\in(0,e]$。",
     "analysis": "恒成立问题转化为求最小值。注意 $a\\le0$ 时函数无下界，直接排除；$a>0$ 时由最小值非负解出 $a\\le e$。端点 $a=0$ 时 $f(x)=e^x>0$ 也成立，实际答案应为 $a\\le e$（含 0）。"},

    # ---------- 物理一道 ----------
    {"subject": "物理", "qtype": "single", "difficulty": 2, "tags": ["运动学"], "source": "原创",
     "body": "物体做匀加速直线运动，初速度 $v_0=2\\ \\text{m/s}$，加速度 $a=3\\ \\text{m/s}^2$，则 4 s 末的速度为（　）",
     "options": ["A. 10 m/s", "B. 12 m/s", "C. 14 m/s", "D. 20 m/s"],
     "answer": "C",
     "analysis": "由 $v=v_0+at=2+3\\times 4=14\\ \\text{m/s}$。"},
]

# 统计
stats = {"single": 0, "multi": 0, "fill": 0, "essay": 0}
for q in questions:
    q.setdefault("grade", "高中")
for q in questions:
    r = post("/api/questions", q)
    stats[q["qtype"]] += 1
    print(f"  {r['code']}  [{q['qtype']:6s}] 难度{q['difficulty']}  {q['tags']}  {q['body'][:24]}…")

total = sum(stats.values())
print(f"\n完成：共写入 {total} 道题（单选 {stats['single']}、多选 {stats['multi']}、填空 {stats['fill']}、解答 {stats['essay']}）")
