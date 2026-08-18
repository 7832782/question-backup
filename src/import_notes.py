# -*- coding: utf-8 -*-
"""把上课笔记里的练习题导入题库：
初中 0803（7 题）+ 高中 0731（5 题），标签用规范后的大知识点
"""
import json, urllib.request

BASE = "http://127.0.0.1:8787"

def post(path, data):
    req = urllib.request.Request(BASE + path, data=json.dumps(data, ensure_ascii=False).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=15).read())

QUESTIONS = [
    # ================= 初中 0803 =================
    dict(subject="数学", grade="初中", qtype="解答", difficulty=2, tags=["数与式"],
         source="初中上课0803",
         body="说出下面每个单项式的系数和次数：$3x^2y$，$-7a$，$x^3$，$\\dfrac{1}{2}mn^2$，$8$。",
         answer=("| 单项式 | 系数 | 次数 |\n|---|---|---|\n"
                 "| $3x^2y$ | $3$ | $2+1=3$ |\n"
                 "| $-7a$ | $-7$ | $1$ |\n"
                 "| $x^3$ | $1$（没写的系数） | $3$ |\n"
                 "| $\\dfrac{1}{2}mn^2$ | $\\dfrac{1}{2}$ | $1+2=3$ |\n"
                 "| $8$ | $8$ | $0$（没有字母，次数是 $0$） |"),
         analysis="系数看前面（连同符号），次数看字母上面的指数相加；没写的系数是 $1$，没写的指数也是 $1$，常数次数是 $0$。"),
    dict(subject="数学", grade="初中", qtype="填空", difficulty=2, tags=["数与式"],
         source="初中上课0803",
         body="直接写出结果：$(-1)^5$，$(-1)^{100}$，$(-2)^3$，$(-3)^2$，$-3^2$。",
         answer="$(-1)^5=-1$；$(-1)^{100}=1$；$(-2)^3=-8$；$(-3)^2=9$；$-3^2=-9$",
         analysis="负号个数：奇数个得负、偶数个得正。$(-3)^2$ 括号在，负号跟着乘，结果 $9$；$-3^2$ 括号不在，负号站外面看，结果是 $-9$。"),
    dict(subject="数学", grade="初中", qtype="解答", difficulty=2, tags=["方程与不等式"],
         source="初中上课0803",
         body="书店里一本故事书比一本练习本贵 8 元，两本书一共 20 元。设练习本 $x$ 元，列出方程。",
         answer="$x+(x+8)=20$，解得 $x=6$（练习本 6 元，故事书 14 元，$6+14=20$ ✓）",
         analysis="四步法：①圈关键词（一共、贵 8 元）；②问什么设什么，设练习本 $x$ 元，故事书 $x+8$ 元；③找等量「一共 20 元 = 练习本 + 故事书」；④列方程 $x+(x+8)=20$。"),
    dict(subject="数学", grade="初中", qtype="解答", difficulty=1, tags=["随机事件的概率"],
         source="初中上课0803",
         body="掷一枚骰子，求掷出的点数大于 4 的概率。",
         answer="$\\dfrac{2}{6}=\\dfrac{1}{3}$",
         analysis="列举所有情况：点数 $1\\sim6$ 共 6 种，大于 4 的有 5、6 共 2 种，概率 $=\\dfrac{想要的结果数}{所有可能的结果数}=\\dfrac{2}{6}=\\dfrac{1}{3}$。"),
    dict(subject="数学", grade="初中", qtype="解答", difficulty=2, tags=["随机事件的概率"],
         source="初中上课0803",
         body="袋子里有红、白、蓝 3 个颜色不同的球。先摸一个，不放回去，再摸一个，用（第一次,第二次）的方式列出所有情况，并求“摸到一个红球”的概率。",
         answer="所有情况：$(红,白)$、$(红,蓝)$、$(白,红)$、$(白,蓝)$、$(蓝,红)$、$(蓝,白)$ 共 $3\\times2=6$ 种；摸到一个红球有 4 种，概率 $=\\dfrac{4}{6}=\\dfrac{2}{3}$",
         analysis="不放回：第一次 3 种，第二次只剩 2 种，共 $3\\times2=6$ 种（而不是 $3\\times3=9$）。摸到一个红球：$(红,白)$、$(红,蓝)$、$(白,红)$、$(蓝,红)$ 共 4 种。"),
    dict(subject="数学", grade="初中", qtype="填空", difficulty=1, tags=["数与式"],
         source="初中上课0803",
         body="$-7$ 的相反数是______，绝对值是______，倒数是______；$0$ 有倒数吗？",
         answer="$7$；$7$；$-\\dfrac{1}{7}$；没有",
         analysis="相反数相加得零；绝对值看它到零的距离；倒数相乘得一（符号不变）。$0$ 没有倒数，因为 $0$ 乘任何数都得 $0$，凑不出 $1$。"),
    dict(subject="数学", grade="初中", qtype="填空", difficulty=1, tags=["数与式"],
         source="初中上课0803",
         body="直接写出结果：$|5|$，$|-5|$，$|0|$，$\\left|-\\dfrac{1}{2}\\right|$。",
         answer="$|5|=5$；$|-5|=5$；$|0|=0$；$\\left|-\\dfrac{1}{2}\\right|=\\dfrac{1}{2}$",
         analysis="正数照搬，负数变号，零还是零；绝对值结果永远 $\\ge 0$。"),

    # ================= 高中 0731 =================
    dict(subject="数学", grade="高中", qtype="解答", difficulty=3, tags=["数列"],
         source="高中上课0731",
         body="已知数列 $\\{a_n\\}$ 满足 $a_1 = 2$，且 $a_{n+1} - a_n = 2n + 1$（$n \\in \\mathbb{N}^*$），求数列 $\\{a_n\\}$ 的通项公式。",
         answer="$$a_n = a_1 + \\sum_{k=1}^{n-1}(2k+1) = 2 + 2\\cdot\\frac{(n-1)n}{2} + (n-1) = n^2 + 1$$",
         analysis="差式 $a_{n+1}-a_n=f(n)$ 用累加法：$a_n=a_1+\\sum_{k=1}^{n-1}f(k)$。验证：$a_1=1+1=2$ ✓；$a_2=5$，而 $2+(2\\times1+1)=5$ ✓。"),
    dict(subject="数学", grade="高中", qtype="解答", difficulty=3, tags=["数列"],
         source="高中上课0731",
         body="已知数列 $\\{b_n\\}$ 满足 $b_1 = 3$，且 $\\dfrac{b_{n+1}}{b_n} = \\dfrac{n+1}{n}$（$n \\in \\mathbb{N}^*$），求数列 $\\{b_n\\}$ 的通项公式。",
         answer="$$b_n = 3 \\times \\frac{2}{1} \\times \\frac{3}{2} \\times \\cdots \\times \\frac{n}{n-1} = 3n$$",
         analysis="比式 $\\dfrac{a_{n+1}}{a_n}=f(n)$ 用累乘法：连乘展开后相邻项约分。验证：$b_2=6$，而 $b_1\\times\\dfrac{2}{1}=6$ ✓。"),
    dict(subject="数学", grade="高中", qtype="解答", difficulty=4, tags=["数列"],
         source="高中上课0731",
         body="求数列 $c_n = (2n-1) \\cdot 2^n$ 的前 $n$ 项和 $T_n$。",
         answer="$$T_n = 6 + (2n-3)\\cdot2^{n+1}$$",
         analysis="$c_n=(pn+q)r^n$ 型用错位相减：乘公比 $2$ 后错位对齐再相减。验证：$T_1=2$ ✓（$6+(-1)\\times4=2$）；$T_2=14$ ✓；$T_3=54$ ✓。"),
    dict(subject="数学", grade="高中", qtype="解答", difficulty=3, tags=["数列"],
         source="高中上课0731",
         body="求数列 $d_n = 3n + 2^n$ 的前 $n$ 项和 $U_n$。",
         answer="$$U_n = 3\\sum_{k=1}^{n}k + \\sum_{k=1}^{n}2^k = \\frac{3n(n+1)}{2} + 2^{n+1} - 2$$",
         analysis="$d_n=b_n+c_n$ 型用分组求和：等差 $3n$ 与等比 $2^n$ 分别求和再合并。验证：$U_1=5$ ✓；$U_2=15$ ✓。"),
    dict(subject="数学", grade="高中", qtype="解答", difficulty=4, tags=["数列"],
         source="高中上课0731",
         body="已知数列 $\\{a_n\\}$ 满足 $a_1 = 2$，且 $a_{n+1} - a_n = 2^n$（$n \\in \\mathbb{N}^*$）。\n\n"
              "（1）求数列 $\\{a_n\\}$ 的通项公式；\n"
              "（2）求数列 $\\{a_n\\}$ 的前 $n$ 项和 $S_n$；\n"
              "（3）求 $a_1 + a_3 + a_5 + \\cdots + a_{2n-1}$ 的值；\n"
              "（4）设 $b_n = \\begin{cases} 2n-1, & n \\text{为奇数} \\\\ a_n, & n \\text{为偶数} \\end{cases}$，求数列 $\\{b_n\\}$ 的前 $2n$ 项和 $W_{2n}$。",
         answer="（1）$a_n = 2^n$；（2）$S_n = 2^{n+1} - 2$；（3）$\\dfrac{2(4^n-1)}{3}$；（4）$W_{2n} = n^2 + \\dfrac{4(4^n-1)}{3}$",
         analysis="（1）累加法：$a_n = 2 + \\sum_{k=1}^{n-1}2^k = 2^n$。（2）等比数列求和。（3）隔项取仍为等比，公比变 $q^2=4$。（4）分段数列：奇数项是等差 $1,3,\\dots,2n-1$，偶数项是等比 $4,16,\\dots,4^n$，分别求和再合并。"),
]

added, skipped = 0, 0
for q in QUESTIONS:
    r = post("/api/questions", q)
    if r.get("duplicate"):
        skipped += 1
        print("跳过(重复):", q["body"][:30])
    else:
        added += 1
        print("已导入:", r["code"], "——", q["body"][:24])
print(f"\n完成：新增 {added} 题，跳过重复 {skipped} 题")
