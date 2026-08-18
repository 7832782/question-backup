# -*- coding: utf-8 -*-
"""初中数学题库生成：数与代数 42 题"""
import json, urllib.request

BASE = "http://127.0.0.1:8787"

def post(path, data):
    req = urllib.request.Request(BASE + path,
        data=json.dumps(data, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urllib.request.urlopen(req).read())

Q = []
def add(subject="数学", qtype="single", diff=3, tags=None, source="原创", body="", options=None, answer="", analysis=""):
    Q.append({"subject": subject, "qtype": qtype, "difficulty": diff, "grade": "初中",
              "tags": tags or [], "source": source, "body": body,
              "options": options or [], "answer": answer, "analysis": analysis})

# ================= 单选 24 题 =================
add(diff=1, tags=["有理数"], body="$-3$ 的相反数是（　）",
    options=["A. 3", "B. $-3$", "C. $\\frac{1}{3}$", "D. $-\\frac{1}{3}$"], answer="A",
    analysis="相反数：绝对值相等、符号相反的两个数，$-3$ 的相反数是 3。")

add(diff=1, tags=["有理数"], body="计算 $|-5|$ 的结果是（　）",
    options=["A. 5", "B. $-5$", "C. $\\frac{1}{5}$", "D. 0"], answer="A",
    analysis="绝对值表示数轴上该点到原点的距离，$|-5|=5$。")

add(diff=1, tags=["有理数"], body="计算 $(-2)^3$ 的结果是（　）",
    options=["A. $-8$", "B. 8", "C. $-6$", "D. 6"], answer="A",
    analysis="负数的奇数次幂仍为负数：$(-2)^3=-8$。")

add(diff=1, tags=["幂运算"], body="用科学记数法表示 $0.000052$ 为（　）",
    options=["A. $5.2\\times10^{-5}$", "B. $5.2\\times10^{5}$", "C. $52\\times10^{-6}$", "D. $5.2\\times10^{-4}$"], answer="A",
    analysis="科学记数法要求 $1\\le|a|<10$，小数点右移 5 位，指数为 $-5$。")

add(diff=1, tags=["幂运算"], body="计算 $a^6\\div a^2$ 的结果是（　）",
    options=["A. $a^4$", "B. $a^3$", "C. $a^8$", "D. $a^{12}$"], answer="A",
    analysis="同底数幂相除，底数不变指数相减：$a^6\\div a^2=a^{6-2}=a^4$。")

add(diff=1, tags=["整式"], body="合并同类项 $3x+2x-5x$ 的结果是（　）",
    options=["A. 0", "B. $x$", "C. $-x$", "D. $10x$"], answer="A",
    analysis="系数相加：$3+2-5=0$，故结果为 0。")

add(diff=2, tags=["乘法公式"], body="计算 $(x+3)(x-3)$ 的结果是（　）",
    options=["A. $x^2-9$", "B. $x^2+9$", "C. $x^2-6x+9$", "D. $x^2+6x+9$"], answer="A",
    analysis="平方差公式：$(a+b)(a-b)=a^2-b^2$，即 $x^2-9$。")

add(diff=2, tags=["乘法公式"], body="计算 $(x-2)^2$ 的结果是（　）",
    options=["A. $x^2-4x+4$", "B. $x^2-4$", "C. $x^2+4x+4$", "D. $x^2-4x-4$"], answer="A",
    analysis="完全平方公式：$(a-b)^2=a^2-2ab+b^2=x^2-4x+4$。")

add(diff=2, tags=["因式分解"], body="把 $x^2-4$ 因式分解，结果是（　）",
    options=["A. $(x+2)(x-2)$", "B. $(x+2)^2$", "C. $(x-2)^2$", "D. $(x+4)(x-1)$"], answer="A",
    analysis="平方差公式：$x^2-4=(x+2)(x-2)$。")

add(diff=2, tags=["因式分解"], body="把 $x^2-5x+6$ 因式分解，结果是（　）",
    options=["A. $(x-2)(x-3)$", "B. $(x+2)(x+3)$", "C. $(x-1)(x-6)$", "D. $(x+1)(x-6)$"], answer="A",
    analysis="十字相乘法：找两数乘积为 6、和为 $-5$，即 $-2$ 和 $-3$，故 $(x-2)(x-3)$。")

add(diff=2, tags=["分式"], body="当 $x=2$ 时，分式 $\\dfrac{x^2-1}{x-1}$ 的值是（　）",
    options=["A. 3", "B. 1", "C. 2", "D. 4"], answer="A",
    analysis="先约分：$\\dfrac{x^2-1}{x-1}=\\dfrac{(x+1)(x-1)}{x-1}=x+1$，代入 $x=2$ 得 3。")

add(diff=1, tags=["分式"], body="分式 $\\dfrac{1}{x-2}$ 有意义的条件是（　）",
    options=["A. $x\\neq2$", "B. $x\\neq0$", "C. $x>2$", "D. $x<2$"], answer="A",
    analysis="分母不为零：$x-2\\neq0$，即 $x\\neq2$。")

add(diff=1, tags=["二次根式"], body="化简 $\\sqrt{12}$ 的结果是（　）",
    options=["A. $2\\sqrt{3}$", "B. $3\\sqrt{2}$", "C. $4\\sqrt{3}$", "D. $2\\sqrt{6}$"], answer="A",
    analysis="$\\sqrt{12}=\\sqrt{4\\times3}=2\\sqrt{3}$。")

add(diff=2, tags=["二次根式"], body="计算 $\\sqrt{8}\\times\\sqrt{2}$ 的结果是（　）",
    options=["A. 4", "B. $2\\sqrt{2}$", "C. $2\\sqrt{3}$", "D. $\\sqrt{16}$"], answer="A",
    analysis="$\\sqrt{8}\\times\\sqrt{2}=\\sqrt{16}=4$。")

add(diff=1, tags=["一元一次方程"], body="方程 $2x-3=7$ 的解是（　）",
    options=["A. $x=5$", "B. $x=4$", "C. $x=3$", "D. $x=6$"], answer="A",
    analysis="移项得 $2x=10$，系数化为 1 得 $x=5$。")

add(diff=2, tags=["一元一次方程"], body="一个数的 3 倍加 5 等于 20，这个数是（　）",
    options=["A. 5", "B. 15", "C. 25", "D. 10"], answer="A",
    analysis="设这个数为 $x$，$3x+5=20$，解得 $x=5$。")

add(diff=2, tags=["二元一次方程组"], body="方程组 $\\begin{cases}x+y=5\\\\x-y=1\\end{cases}$ 的解是（　）",
    options=["A. $x=3,y=2$", "B. $x=2,y=3$", "C. $x=4,y=1$", "D. $x=1,y=4$"], answer="A",
    analysis="两式相加得 $2x=6$，$x=3$；代入得 $y=2$。")

add(diff=3, tags=["分式方程"], body="分式方程 $\\dfrac{1}{x-1}=2$ 的解是（　）",
    options=["A. $x=\\frac{3}{2}$", "B. $x=\\frac{1}{2}$", "C. $x=3$", "D. 无解"], answer="A",
    analysis="去分母：$1=2(x-1)$，得 $x=\\frac{3}{2}$，代入检验分母不为零，是原方程的解。")

add(diff=2, tags=["一元二次方程"], body="方程 $x^2-4x+3=0$ 的根是（　）",
    options=["A. $x_1=1,x_2=3$", "B. $x_1=1,x_2=-3$", "C. $x_1=-1,x_2=3$", "D. $x_1=2,x_2=2$"], answer="A",
    analysis="因式分解：$(x-1)(x-3)=0$，故 $x_1=1,x_2=3$。")

add(diff=3, tags=["一元二次方程"], body="若关于 $x$ 的方程 $x^2+2x+m=0$ 有两个相等的实数根，则 $m=$（　）",
    options=["A. 1", "B. $-1$", "C. 2", "D. 4"], answer="A",
    analysis="$\\Delta=b^2-4ac=4-4m=0$，解得 $m=1$。")

add(diff=2, tags=["一元二次方程"], body="方程 $x^2-3x+2=0$ 的两根之和是（　）",
    options=["A. 3", "B. $-3$", "C. 2", "D. $-2$"], answer="A",
    analysis="韦达定理：$x_1+x_2=-\\frac{b}{a}=3$。")

add(diff=3, tags=["一元二次方程"], body="矩形菜地的长比宽多 3 米，面积为 40 平方米，则宽为（　）",
    options=["A. 5 米", "B. 8 米", "C. 10 米", "D. 4 米"], answer="A",
    analysis="设宽为 $x$，则长 $x+3$，$x(x+3)=40$，解得 $x=5$（$x=-8$ 不合题意舍去）。")

add(diff=1, tags=["不等式"], body="不等式 $-2x>4$ 的解集是（　）",
    options=["A. $x<-2$", "B. $x>-2$", "C. $x<2$", "D. $x>2$"], answer="A",
    analysis="两边除以 $-2$，不等号方向改变：$x<-2$。")

add(diff=2, tags=["不等式"], body="不等式组 $\\begin{cases}x>2\\\\x\\le5\\end{cases}$ 的解集是（　）",
    options=["A. $2<x\\le5$", "B. $2\\le x<5$", "C. $x>2$", "D. $x\\le5$"], answer="A",
    analysis="同大取大、同小取小，相交部分为 $2<x\\le5$。")

add(diff=2, tags=["一次函数"], body="一次函数 $y=2x-1$ 的图象经过的象限是（　）",
    options=["A. 一、三、四", "B. 一、二、三", "C. 二、三、四", "D. 一、二、四"], answer="A",
    analysis="$k=2>0$ 过一、三象限，$b=-1<0$ 与 $y$ 轴交于负半轴，故过一、三、四象限。")

add(diff=2, tags=["一次函数"], body="一次函数 $y=kx+b$ 的图象经过点 $(1,3)$ 和 $(0,1)$，则 $k=$（　）",
    options=["A. 2", "B. 1", "C. 3", "D. $\\frac{1}{2}$"], answer="A",
    analysis="待定系数法：$b=1$，代入 $(1,3)$ 得 $k+1=3$，$k=2$。")

add(diff=1, tags=["反比例函数"], body="反比例函数 $y=\\dfrac{6}{x}$ 的图象位于（　）",
    options=["A. 第一、三象限", "B. 第二、四象限", "C. 第一、二象限", "D. 第三、四象限"], answer="A",
    analysis="$k=6>0$，图象位于第一、三象限。")

add(diff=2, tags=["反比例函数"], body="反比例函数 $y=\\dfrac{k}{x}$ 的图象经过点 $(2,3)$，则 $k=$（　）",
    options=["A. 6", "B. $\\frac{3}{2}$", "C. $\\frac{2}{3}$", "D. 5"], answer="A",
    analysis="代入：$3=\\frac{k}{2}$，$k=6$。")

add(diff=3, tags=["二次函数"], body="二次函数 $y=x^2-2x+1$ 的顶点坐标是（　）",
    options=["A. $(1,0)$", "B. $(-1,0)$", "C. $(0,1)$", "D. $(1,2)$"], answer="A",
    analysis="配方：$y=(x-1)^2$，顶点为 $(1,0)$。")

add(diff=1, tags=["二次函数"], body="二次函数 $y=-x^2$ 的图象开口（　）",
    options=["A. 向下", "B. 向上", "C. 向左", "D. 向右"], answer="A",
    analysis="$a=-1<0$，抛物线开口向下。")

add(diff=3, tags=["二次函数"], body="二次函数 $y=x^2-4x+3$ 的最小值是（　）",
    options=["A. $-1$", "B. 1", "C. 3", "D. 7"], answer="A",
    analysis="配方：$y=(x-2)^2-1$，当 $x=2$ 时取最小值 $-1$。")

# ================= 多选 6 题 =================
add(qtype="multi", diff=1, tags=["有理数"], body="下列各数中，属于有理数的有（　）",
    options=["A. $\\frac{3}{4}$", "B. $\\pi$", "C. $-2$", "D. $\\sqrt{2}$"], answer="AC",
    analysis="$\\pi$ 和 $\\sqrt{2}$ 是无限不循环小数，属于无理数；$\\frac{3}{4}$ 和 $-2$ 是有理数。")

add(qtype="multi", diff=2, tags=["乘法公式"], body="下列计算正确的有（　）",
    options=["A. $(a+b)^2=a^2+b^2$", "B. $(a-b)(a+b)=a^2-b^2$", "C. $(a+1)^2=a^2+2a+1$", "D. $(a-1)(a+1)=a^2+1$"], answer="BC",
    analysis="A 漏了 $2ab$；D 应为 $a^2-1$。B 是平方差公式，C 是完全平方公式，均正确。")

add(qtype="multi", diff=2, tags=["一元二次方程"], body="下列哪些是方程 $x^2-5x+6=0$ 的根（　）",
    options=["A. 2", "B. 3", "C. 1", "D. 6"], answer="AB",
    analysis="$(x-2)(x-3)=0$，根为 2 和 3。")

add(qtype="multi", diff=2, tags=["函数"], body="下列函数的图象经过原点 $(0,0)$ 的有（　）",
    options=["A. $y=2x$", "B. $y=2x+1$", "C. $y=x^2$", "D. $y=\\frac{1}{x}$"], answer="AC",
    analysis="把 $(0,0)$ 代入：A、C 满足；B 代入得 $1\\neq0$，D 中 $x=0$ 无意义。")

add(qtype="multi", diff=3, tags=["不等式"], body="若 $a>b$，则下列一定成立的有（　）",
    options=["A. $a+1>b+1$", "B. $-a>-b$", "C. $2a>2b$", "D. $a^2>b^2$"], answer="AC",
    analysis="不等式两边同加、同乘正数，方向不变，A、C 正确；同乘 $-1$ 方向改变，B 错；D 在 $a=1,b=-2$ 时不成立。")

add(qtype="multi", diff=2, tags=["整式"], body="下列各式从左到右变形正确的有（　）",
    options=["A. $2a+3a=5a$", "B. $a\\cdot a^2=a^2$", "C. $(a^2)^3=a^6$", "D. $a^3\\div a=a^3$"], answer="AC",
    analysis="B 应为 $a^3$（同底数幂相乘指数相加）；D 应为 $a^2$（指数相减）。A 合并同类项、C 幂的乘方均正确。")

# ================= 填空 8 题 =================
add(qtype="fill", diff=1, tags=["有理数"], body="计算 $|-3|+(-2)^2=$______",
    answer="7", analysis="$|-3|=3$，$(-2)^2=4$，$3+4=7$。")

add(qtype="fill", diff=2, tags=["幂运算"], body="计算 $(2a^2b)^2=$______",
    answer="4a⁴b²", analysis="积的乘方：$(2a^2b)^2=2^2\\cdot a^4\\cdot b^2=4a^4b^2$。")

add(qtype="fill", diff=2, tags=["因式分解"], body="因式分解：$x^2+6x+9=$______",
    answer="(x+3)²", analysis="完全平方公式：$x^2+6x+9=(x+3)^2$。")

add(qtype="fill", diff=2, tags=["二次根式"], body="计算 $\\sqrt{18}+\\sqrt{2}=$______",
    answer="4√2", analysis="$\\sqrt{18}=3\\sqrt{2}$，$3\\sqrt{2}+\\sqrt{2}=4\\sqrt{2}$。")

add(qtype="fill", diff=1, tags=["一元一次方程"], body="方程 $3x-1=x+5$ 的解是 $x=$______",
    answer="3", analysis="移项：$3x-x=5+1$，$2x=6$，$x=3$。")

add(qtype="fill", diff=2, tags=["一元二次方程"], body="方程 $x^2+2x-3=0$ 的两根之积是______",
    answer="-3", analysis="韦达定理：$x_1x_2=\\frac{c}{a}=-3$。")

add(qtype="fill", diff=1, tags=["不等式"], body="不等式 $3x-6\\le0$ 的解集是______",
    answer="x≤2", analysis="$3x\\le6$，$x\\le2$。")

add(qtype="fill", diff=2, tags=["函数"], body="函数 $y=\\sqrt{x-1}$ 中自变量 $x$ 的取值范围是______",
    answer="x≥1", analysis="被开方数非负：$x-1\\ge0$，$x\\ge1$。")

# ================= 解答 4 题 =================
add(qtype="essay", diff=2, tags=["一元二次方程"], body="解方程：$x^2-6x+8=0$",
    answer="$x_1=2$，$x_2=4$",
    analysis="因式分解：$(x-2)(x-4)=0$，所以 $x_1=2$，$x_2=4$。")

add(qtype="essay", diff=3, tags=["分式方程"], body="解分式方程：$\\dfrac{2}{x+1}=\\dfrac{3}{x-1}$",
    answer="$x=-5$",
    analysis="两边同乘 $(x+1)(x-1)$：$2(x-1)=3(x+1)$，展开得 $2x-2=3x+3$，解得 $x=-5$。检验：当 $x=-5$ 时 $(x+1)(x-1)\\neq0$，所以 $x=-5$ 是原方程的解。")

add(qtype="essay", diff=3, tags=["二元一次方程组"], body="笼中共有鸡和兔 20 只，脚共 56 只，求鸡、兔各有多少只？",
    answer="鸡 12 只，兔 8 只",
    analysis="设鸡 $x$ 只，兔 $y$ 只，则 $\\begin{cases}x+y=20\\\\2x+4y=56\\end{cases}$。由 $x=20-y$ 代入得 $2(20-y)+4y=56$，解得 $y=8$，$x=12$。")

add(qtype="essay", diff=3, tags=["二次函数"], body="某物体运动的路程 $s$（米）与时间 $t$（秒）满足 $s=-t^2+4t$。求 $s$ 的最大值及此时 $t$ 的值。",
    answer="$t=2$ 秒时，$s$ 最大为 4 米",
    analysis="配方：$s=-(t^2-4t)=-(t-2)^2+4$。当 $t=2$ 时，$s$ 取最大值 4 米。")

# 执行
print(f"写入中（共 {len(Q)} 题）...")
for q in Q:
    r = post("/api/questions", q)
    print(f"  {r['code']}  [{q['qtype']:6s}] 难度{q['difficulty']}  {q['tags']}  {q['body'][:22]}…")
print(f"代数部分完成：{len(Q)} 题")
