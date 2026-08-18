# -*- coding: utf-8 -*-
"""高中摸底测试卷：高一升高二（必修一+必修二内容，低难度）
单选 8 + 多选 2 + 填空 3 + 解答 2 = 15 题，满分 75（全 5 分，仿初中摸底小测）
"""
import json
import urllib.request

BASE = "http://127.0.0.1:8787"

def api(method, path, data=None):
    body = json.dumps(data, ensure_ascii=False).encode() if data is not None else None
    req = urllib.request.Request(BASE + path, data=body,
                                 headers={"Content-Type": "application/json"}, method=method)
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

# 选题（按卷内顺序）：
# 单选：集合交集、充要条件、复数、复数模、向量、偶函数、指对大小、三角函数
# 多选：三角性质、函数奇偶单调
# 填空：复数运算、概率、圆柱体积
# 解答：解三角形、投篮概率
ids = [252, 253, 232, 212, 214, 255, 256, 258, 220, 44, 261, 264, 244, 226, 229]

qs = {}
for i in ids:
    q = api("GET", "/api/questions/%d" % i)
    qs[i] = q
    print(q["code"], q["qtype"], q["difficulty"], "星 |", q["body"][:26])

items = [{"questionId": i, "score": 5, "position": pos} for pos, i in enumerate(ids)]
p = api("POST", "/api/papers", {"name": "高中摸底测试", "subject": "数学", "items": items})
print("\n卷子已创建:", p["name"], "|", len(items), "题 | 满分", sum(it["score"] for it in items))
