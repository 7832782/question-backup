# -*- coding: utf-8 -*-
"""批量渲染 2024 高考卷 PDF 为高清 PNG（question-import 技能：数学卷必须走视觉）"""
import fitz
import os

SRC = r"D:\desktop\题库系统\gaokaomath-main\普通高考\2024"
OUT = r"D:\desktop\题库系统\src\pdf_pages\2024"
os.makedirs(OUT, exist_ok=True)

files = [f for f in os.listdir(SRC) if f.endswith('.pdf')]
# 新高考1 已导入，跳过
files = [f for f in files if '新高考1' not in f]
print("待处理:", files)

for f in sorted(files):
    doc = fitz.open(os.path.join(SRC, f))
    tag = f.replace('.pdf', '').replace('(', '_').replace(')', '').replace(',', '').replace(' ', '')
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2))
        path = os.path.join(OUT, f"{tag}_p{i+1}.png")
        pix.save(path)
        print(f"{tag}_p{i+1}.png  {pix.width}x{pix.height}  {os.path.getsize(path)//1024}KB")
    doc.close()
print("完成")
