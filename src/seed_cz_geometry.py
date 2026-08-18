# -*- coding: utf-8 -*-
"""初中数学题库生成：图形与几何 43 题（单选 26、多选 3、填空 8、解答 6）"""
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

# ================= 单选 26 题 =================
# ---- 线段公理 ----
add(diff=1, tags=["线段公理"], body="把弯曲的河道改直，可以缩短航程，这里依据的数学道理是（　）",
    options=["A. 两点确定一条直线", "B. 两点之间线段最短", "C. 垂线段最短", "D. 经过直线外一点有且只有一条直线与这条直线平行"], answer="B",
    analysis="两点之间，线段最短。把河道改直后，航程就是连接两点的线段，长度最短。")

# ---- 平行线性质 ----
add(diff=1, tags=["平行线性质"], body="如图，直线 $a\\parallel b$，直线 $c$ 与 $a$、$b$ 都相交，∠1 与 ∠2 是同位角，且 ∠1=55°，则 ∠2=（　）",
    options=["A. 35°", "B. 55°", "C. 125°", "D. 145°"], answer="B",
    analysis="两直线平行，同位角相等，故 ∠2=∠1=55°。")

# ---- 三角形内角和 ----
add(diff=1, tags=["三角形内角和"], body="在 $\\triangle ABC$ 中，∠A=50°，∠B=60°，则 ∠C=（　）",
    options=["A. 60°", "B. 70°", "C. 80°", "D. 90°"], answer="B",
    analysis="三角形内角和为 180°：∠C=180°-50°-60°=70°。")

# ---- 三角形三边关系 ----
add(diff=1, tags=["三角形三边关系"], body="下列长度的三条线段中，能组成三角形的是（　）",
    options=["A. 1，2，4", "B. 2，3，5", "C. 3，4，8", "D. 4，5，6"], answer="D",
    analysis="三角形任意两边之和大于第三边。A：1+2<4；B：2+3=5；C：3+4<8；D：4+5>6，故选 D。")

# ---- 勾股定理：求斜边 ----
add(diff=1, tags=["勾股定理"], body="在 Rt△ABC 中，∠C=90°，AC=6，BC=8，则 AB=（　）",
    options=["A. 9", "B. 10", "C. 12", "D. 14"], answer="B",
    analysis="由勾股定理：$AB=\\sqrt{AC^2+BC^2}=\\sqrt{6^2+8^2}=\\sqrt{100}=10$。")

# ---- 三角形中位线 ----
add(diff=1, tags=["三角形中位线"], body="在 $\\triangle ABC$ 中，D、E 分别是边 AB、AC 的中点，若 BC=10，则 DE=（　）",
    options=["A. 4", "B. 5", "C. 8", "D. 10"], answer="B",
    analysis="三角形的中位线平行于第三边且等于第三边的一半：$DE=\\frac{1}{2}BC=5$。")

# ---- 余角与补角 ----
add(diff=2, tags=["余角与补角"], body="已知一个角的余角是 35°，则这个角的补角是（　）",
    options=["A. 55°", "B. 125°", "C. 145°", "D. 155°"], answer="B",
    analysis="这个角为 90°-35°=55°，其补角为 180°-55°=125°。")

# ---- 平行线的判定 ----
add(diff=2, tags=["平行线的判定"], body="如图，直线 a、b 被直线 c 所截，∠1 与 ∠2 是同位角，且 ∠1=∠2，则下列结论正确的是（　）",
    options=["A. a∥b", "B. a⊥b", "C. a、b 相交", "D. 无法判断"], answer="A",
    analysis="同位角相等，两直线平行。由 ∠1=∠2（同位角相等）可得 a∥b。")

# ---- 等腰三角形与等边三角形 ----
add(diff=2, tags=["等腰三角形", "等边三角形"], body="等腰三角形的一个内角为 60°，则这个三角形是（　）",
    options=["A. 直角三角形", "B. 等边三角形", "C. 钝角三角形", "D. 无法确定"], answer="B",
    analysis="若 60° 是顶角，则两底角均为 (180°-60°)÷2=60°；若 60° 是底角，则顶角也为 60°。两种情况都是等边三角形，即有一个角是 60° 的等腰三角形是等边三角形。")

# ---- 多边形内角和与外角和 ----
add(diff=2, tags=["多边形内角和", "多边形外角和"], body="一个多边形的内角和等于它的外角和，则这个多边形是（　）",
    options=["A. 三角形", "B. 四边形", "C. 五边形", "D. 六边形"], answer="B",
    analysis="设边数为 n，则 $180°(n-2)=360°$，解得 n=4，是四边形。")

# ---- 平行四边形的性质 ----
add(diff=2, tags=["平行四边形性质"], body="▱ABCD 的周长为 24，且 AB:BC=1:2，则 AB=（　）",
    options=["A. 3", "B. 4", "C. 6", "D. 8"], answer="B",
    analysis="平行四边形的对边相等，周长 $2(AB+BC)=24$，得 AB+BC=12。又 AB:BC=1:2，故 $AB=12\\times\\frac{1}{3}=4$。")

# ---- 矩形 ----
add(diff=2, tags=["矩形"], body="下列性质中，矩形具有而平行四边形不一定具有的是（　）",
    options=["A. 对边相等", "B. 对角相等", "C. 对角线相等", "D. 对角线互相平分"], answer="C",
    analysis="平行四边形具有对边相等、对角相等、对角线互相平分；矩形的特殊性在于对角线相等（四个角都是直角）。")

# ---- 正方形 ----
add(diff=2, tags=["正方形"], body="若正方形的对角线长为 $2\\sqrt{2}$，则它的周长为（　）",
    options=["A. 4", "B. 8", "C. $4\\sqrt{2}$", "D. 16"], answer="B",
    analysis="设边长为 a，由勾股定理，对角线 $a\\sqrt{2}=2\\sqrt{2}$，得 a=2，周长 4a=8。")

# ---- 锐角三角函数：特殊角 ----
add(diff=2, tags=["锐角三角函数"], body="$\\sin30°+\\tan45°$ 的值为（　）",
    options=["A. $\\frac{3}{2}$", "B. $\\frac{1}{2}$", "C. 1", "D. 2"], answer="A",
    analysis="$\\sin30°=\\frac{1}{2}$，$\\tan45°=1$，故 $\\sin30°+\\tan45°=\\frac{3}{2}$。")

# ---- 轴对称与中心对称 ----
add(diff=2, tags=["轴对称", "中心对称"], body="下列图形中，既是轴对称图形又是中心对称图形的是（　）",
    options=["A. 等边三角形", "B. 平行四边形", "C. 圆", "D. 正五边形"], answer="C",
    analysis="等边三角形、正五边形只是轴对称图形；一般平行四边形只是中心对称图形；圆既是轴对称图形又是中心对称图形。")

# ---- 三角形外角 ----
add(diff=3, tags=["三角形外角"], body="如图，在 $\\triangle ABC$ 中，∠B=70°，∠ACD 是 $\\triangle ABC$ 的外角，且 ∠ACD=130°，则 ∠A=（　）",
    options=["A. 50°", "B. 60°", "C. 70°", "D. 110°"], answer="B",
    analysis="三角形的一个外角等于与它不相邻的两个内角之和：∠ACD=∠A+∠B，即 130°=∠A+70°，∠A=60°。")

# ---- 全等三角形的判定（含 SAS 辨析） ----
add(diff=3, tags=["全等三角形"], body="下列条件中，不能判定两个三角形全等的是（　）",
    options=["A. 三边分别相等", "B. 两边及其夹角分别相等", "C. 两角及其夹边分别相等", "D. 两边及其中一边的对角分别相等"], answer="D",
    analysis="SSS、SAS、ASA（以及 AAS、HL）都能判定三角形全等；两边及其中一边的对角分别相等（SSA）不能判定两个三角形全等，是常见的错误判定。")

# ---- 勾股定理逆定理 ----
add(diff=3, tags=["勾股定理逆定理"], body="下列各组数中，能作为直角三角形三边长的是（　）",
    options=["A. 2，3，4", "B. 4，5，6", "C. 6，8，10", "D. 7，8，9"], answer="C",
    analysis="由勾股定理逆定理：$6^2+8^2=36+64=100=10^2$，满足 $a^2+b^2=c^2$，故 6，8，10 能构成直角三角形。")

# ---- 平行四边形的判定 ----
add(diff=3, tags=["平行四边形的判定"], body="如图，在四边形 ABCD 中，AC 与 BD 相交于点 O。下列条件中，不能判定四边形 ABCD 是平行四边形的是（　）",
    options=["A. AB∥CD，AD∥BC", "B. AB=CD，AD=BC", "C. AB∥CD，AD=BC", "D. OA=OC，OB=OD"], answer="C",
    analysis="两组对边分别平行（A）、两组对边分别相等（B）、对角线互相平分（D）都能判定平行四边形；一组对边平行、另一组对边相等（C）不一定能判定，如等腰梯形满足该条件但不是平行四边形。")

# ---- 圆周角定理 ----
add(diff=3, tags=["圆周角定理", "圆"], body="如图，在 ⊙O 中，∠AOB=80°，点 C 在优弧 AB 上，则 ∠ACB=（　）",
    options=["A. 30°", "B. 40°", "C. 80°", "D. 160°"], answer="B",
    analysis="圆周角定理：圆周角的度数等于它所对弧上的圆心角度数的一半，∠ACB=$\\frac{1}{2}$∠AOB=40°。")

# ---- 直径所对的圆周角 ----
add(diff=3, tags=["圆周角定理", "圆"], body="如图，AB 是 ⊙O 的直径，点 C 在 ⊙O 上，∠ABC=35°，则 ∠A=（　）",
    options=["A. 35°", "B. 45°", "C. 55°", "D. 65°"], answer="C",
    analysis="AB 是直径，∠ACB 是直径所对的圆周角，故 ∠ACB=90°。由三角形内角和：∠A=180°-90°-35°=55°。")

# ---- 相似三角形的判定与面积比 ----
add(diff=3, tags=["相似三角形", "相似三角形面积比"], body="如图，在 $\\triangle ABC$ 中，D、E 分别在边 AB、AC 上，且 DE∥BC，AD:DB=1:2，则 $S_{\\triangle ADE}:S_{\\triangle ABC}$=（　）",
    options=["A. 1:2", "B. 1:3", "C. 1:4", "D. 1:9"], answer="D",
    analysis="DE∥BC，得 ∠ADE=∠ABC、∠AED=∠ACB，两角分别相等，$\\triangle ADE\\sim\\triangle ABC$。相似比 AD:AB=1:3，面积比等于相似比的平方，为 1:9。")

# ---- 菱形 ----
add(diff=4, tags=["菱形"], body="如图，在菱形 ABCD 中，AB=5，对角线 AC=6，则菱形 ABCD 的面积为（　）",
    options=["A. 24", "B. 30", "C. 40", "D. 48"], answer="A",
    analysis="菱形对角线互相垂直且平分：AO=$\\frac{1}{2}$AC=3。在 Rt△ABO 中，$BO=\\sqrt{AB^2-AO^2}=\\sqrt{25-9}=4$，故 BD=8。面积 $S=\\frac{1}{2}AC\\cdot BD=\\frac{1}{2}\\times6\\times8=24$。")

# ---- 垂径定理（分类讨论） ----
add(diff=4, tags=["垂径定理", "圆"], source="中考真题改编", body="⊙O 的半径为 5，弦 AB=8，弦 CD=6，且 AB∥CD，则 AB 与 CD 之间的距离为（　）",
    options=["A. 1", "B. 7", "C. 1 或 7", "D. 2 或 7"], answer="C",
    analysis="由垂径定理：圆心 O 到弦 AB 的距离 $d_1=\\sqrt{5^2-4^2}=3$，O 到弦 CD 的距离 $d_2=\\sqrt{5^2-3^2}=4$。两弦在圆心同侧时距离为 $4-3=1$；在圆心异侧时为 $4+3=7$，故选 C。")

# ---- 解直角三角形应用 ----
add(diff=4, tags=["解直角三角形"], source="中考真题改编", body="如图，在地面 A 处测得楼顶 C 的仰角为 30°，向楼的方向前进 100 米到达 B 处，再测得仰角为 60°，则楼高 CD 为（　）",
    options=["A. $50\\sqrt{3}$ 米", "B. $100\\sqrt{3}$ 米", "C. 50 米", "D. $\\frac{100\\sqrt{3}}{3}$ 米"], answer="A",
    analysis="设楼高 CD=h。在 Rt△ACD 中，$AD=\\frac{h}{\\tan30°}=h\\sqrt{3}$；在 Rt△BCD 中，$BD=\\frac{h}{\\tan60°}=\\frac{h\\sqrt{3}}{3}$。由 AD-BD=100，得 $h\\sqrt{3}-\\frac{h\\sqrt{3}}{3}=100$，解得 $h=50\\sqrt{3}$。")

# ---- 勾股定理：求直角边（分类讨论） ----
add(diff=5, tags=["勾股定理"], source="中考真题改编", body="在 $\\triangle ABC$ 中，AB=15，AC=13，BC 边上的高 AD=12，则 BC 的长为（　）",
    options=["A. 14", "B. 4", "C. 14 或 4", "D. 9"], answer="C",
    analysis="Rt△ABD 中，$BD=\\sqrt{15^2-12^2}=9$；Rt△ACD 中，$CD=\\sqrt{13^2-12^2}=5$。当高在三角形内部（锐角三角形）时，BC=BD+CD=14；当高在三角形外部（∠C 为钝角）时，BC=BD-CD=4。故 BC=14 或 4，选 C。")

# ================= 多选 3 题 =================
add(qtype="multi", diff=2, tags=["勾股定理", "勾股数"], body="下列各组数中，是勾股数的有（　）",
    options=["A. 3，4，5", "B. 5，12，13", "C. 6，7，8", "D. 8，15，17"], answer="ABD",
    analysis="$3^2+4^2=25=5^2$，$5^2+12^2=169=13^2$，$8^2+15^2=289=17^2$，均满足 $a^2+b^2=c^2$ 且为正整数，是勾股数；$6^2+7^2=85\\neq8^2=64$，不是勾股数。")

add(qtype="multi", diff=3, tags=["矩形", "菱形", "平行四边形"], body="下列说法中，正确的有（　）",
    options=["A. 矩形的对角线相等且互相平分", "B. 菱形的对角线相等", "C. 对角线互相垂直的平行四边形是菱形", "D. 对角线相等的平行四边形是矩形"], answer="ACD",
    analysis="矩形是特殊的平行四边形，对角线相等且互相平分，A 正确；菱形对角线互相垂直但不一定相等，B 错误；C、D 分别是菱形、矩形的判定定理，正确。")

add(qtype="multi", diff=3, tags=["圆", "垂径定理", "圆周角定理"], body="下列说法中，正确的有（　）",
    options=["A. 直径所对的圆周角是直角", "B. 平分弦的直径垂直于这条弦", "C. 垂直于弦的直径平分这条弦", "D. 在同圆中，相等的圆心角所对的弧相等"], answer="ACD",
    analysis="A 是圆周角定理的推论，正确；B 缺少条件“弦不是直径”（若弦是直径，平分它的直径不一定与它垂直），错误；C 是垂径定理，正确；D 是圆心角定理，正确。")

# ================= 填空 8 题 =================
add(qtype="fill", diff=2, tags=["角"], source="中考真题改编", body="3 点 30 分时，钟面上时针与分针所成的角的度数为______",
    answer="75", analysis="钟面每大格 30°。3 点 30 分时，分针指向 6，时针在 3 与 4 的正中间，夹角为 2.5 个大格：$2.5\\times30°=75°$。")

add(qtype="fill", diff=1, tags=["正多边形", "多边形内角和"], body="正六边形的每个内角为______度",
    answer="120", analysis="n 边形内角和为 $180°(n-2)$，正六边形每个内角为 $\\frac{180°\\times(6-2)}{6}=120°$。")

add(qtype="fill", diff=1, tags=["勾股定理", "矩形"], body="长方形 ABCD 中，AB=6，BC=8，则对角线 AC=______",
    answer="10", analysis="长方形四个角都是直角，由勾股定理：$AC=\\sqrt{AB^2+BC^2}=\\sqrt{36+64}=10$。")

add(qtype="fill", diff=2, tags=["弧长", "圆"], body="半径为 6 的圆中，圆心角为 60° 的扇形，其弧长为______",
    answer="2π", analysis="弧长公式 $l=\\frac{n\\pi r}{180}=\\frac{60\\times\\pi\\times6}{180}=2\\pi$。")

add(qtype="fill", diff=4, tags=["锐角三角函数"], body="已知 α 为锐角，$\\sin\\alpha=\\frac{3}{5}$，则 $\\tan\\alpha$=______",
    answer="3/4", analysis="由 $\\sin^2\\alpha+\\cos^2\\alpha=1$，得 $\\cos\\alpha=\\sqrt{1-(\\frac{3}{5})^2}=\\frac{4}{5}$（α 为锐角取正值），故 $\\tan\\alpha=\\frac{\\sin\\alpha}{\\cos\\alpha}=\\frac{3}{4}$。")

add(qtype="fill", diff=3, tags=["相似三角形面积比"], body="$\\triangle ABC\\sim\\triangle DEF$，相似比为 2:3。若 $\\triangle ABC$ 的面积为 8，则 $\\triangle DEF$ 的面积为______",
    answer="18", analysis="相似三角形面积比等于相似比的平方，为 $2^2:3^2=4:9$，故 $S_{\\triangle DEF}=8\\times\\frac{9}{4}=18$。")

add(qtype="fill", diff=3, tags=["垂径定理"], body="⊙O 的半径为 10，弦 AB=16，则圆心 O 到弦 AB 的距离为______",
    answer="6", analysis="作 OC⊥AB 于 C，由垂径定理得 $AC=\\frac{1}{2}AB=8$。在 Rt△OAC 中，$OC=\\sqrt{OA^2-AC^2}=\\sqrt{100-64}=6$。")

add(qtype="fill", diff=2, tags=["三角形内角和"], body="一个三角形三个内角的度数之比为 2:3:4，则其中最大的内角为______度",
    answer="80", analysis="三角形内角和为 180°，每份为 $\\frac{180°}{2+3+4}=20°$，最大的内角为 $20°\\times4=80°$。")

# ================= 解答 6 题 =================
add(qtype="essay", diff=3, tags=["相似三角形应用"], source="中考真题改编", body="小明身高 1.6 米，某一时刻在阳光下他的影长为 0.8 米，同一时刻测得学校旗杆的影长为 5 米。求旗杆的高度。",
    answer="旗杆高 10 米",
    analysis="同一时刻太阳光下，物高与影长成正比（物体与影子构成两个相似的直角三角形）。设旗杆高为 h 米，则 $\\frac{1.6}{0.8}=\\frac{h}{5}$，解得 h=10。答：旗杆高 10 米。")

add(qtype="essay", diff=3, tags=["全等三角形", "三角形全等的判定"], body="已知：如图，在 $\\triangle ABC$ 与 $\\triangle DCB$ 中，AB=DC，AC=DB。求证：∠A=∠D。",
    answer="证明见解析",
    analysis="在 $\\triangle ABC$ 和 $\\triangle DCB$ 中：AB=DC（已知），AC=DB（已知），BC=CB（公共边），所以 $\\triangle ABC\\cong\\triangle DCB$（SSS）。由全等三角形对应角相等，得 ∠A=∠D。")

add(qtype="essay", diff=4, tags=["平行四边形的判定", "平行四边形的性质"], body="如图，在 ▱ABCD 中，对角线 AC、BD 相交于点 O，点 E、F 分别在 OB、OD 上，且 BE=DF。求证：四边形 AECF 是平行四边形。",
    answer="证明见解析",
    analysis="因为四边形 ABCD 是平行四边形，所以 OA=OC，OB=OD（平行四边形对角线互相平分）。又 BE=DF，则 OE=OB-BE=OD-DF=OF。在四边形 AECF 中，对角线 AC、EF 互相平分（OA=OC，OE=OF），所以四边形 AECF 是平行四边形（对角线互相平分的四边形是平行四边形）。")

add(qtype="essay", diff=2, tags=["直线与圆的位置关系"], body="已知 ⊙O 的半径为 5，圆心 O 到直线 l 的距离为 d。当 d=3、d=5、d=7 时，分别判断直线 l 与 ⊙O 的位置关系，并说明理由。",
    answer="d=3 时相交；d=5 时相切；d=7 时相离",
    analysis="直线与圆的位置关系由圆心到直线的距离 d 与半径 r 的大小决定：d<r（3<5）时直线与圆相交，有两个公共点；d=r（5=5）时相切，有一个公共点；d>r（7>5）时相离，没有公共点。")

add(qtype="essay", diff=4, tags=["勾股定理应用"], source="中考真题改编", body="一根长为 10 米的竹竿斜靠在竖直的墙上，竹竿顶端距地面 8 米。若竹竿顶端沿墙下滑 2 米，则竹竿底端将向外滑动多少米？",
    answer="2 米",
    analysis="设墙脚为 O。下滑前，竹竿底端距墙 $OB=\\sqrt{10^2-8^2}=6$ 米；顶端下滑 2 米后距地面 6 米，此时底端距墙 $OB'=\\sqrt{10^2-6^2}=8$ 米。底端向外滑动 $8-6=2$ 米。答：竹竿底端向外滑动 2 米。")

add(qtype="essay", diff=5, tags=["多边形内角和"], body="一个多边形除了一个内角外，其余各内角之和为 2220°，求这个多边形的边数。",
    answer="15 边形",
    analysis="设多边形的边数为 n，除去的那个内角为 x（0°<x<180°），则 $180°(n-2)-x=2220°$，即 $180°(n-2)=2220°+x$。因为 $2220°<2220°+x<2400°$，其中 180° 的倍数只有 $2340°=180°\\times13$，故 n-2=13，n=15。此时 $x=2340°-2220°=120°$，符合 0°<x<180°。答：这个多边形是 15 边形。")

# 执行
print(f"写入中（共 {len(Q)} 题）...")
for q in Q:
    r = post("/api/questions", q)
    print(f"  {r['code']}  [{q['qtype']:6s}] 难度{q['difficulty']}  {q['tags']}  {q['body'][:22]}…")
print(f"图形与几何部分完成：{len(Q)} 题")
