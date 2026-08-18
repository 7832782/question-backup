# -*- coding: utf-8 -*-
"""PDF 渲染为高清 PNG（视觉识别用）"""
import fitz, os

pdf = r"C:\Users\Snow_233\.hanako\session-files\6e7835e59e63642e0c72e307\2024新高考1(山东,广东,湖南,湖北,河北,江苏,福建,浙江,河南,江西,安徽)_msdgv1la_5c8441f2.pdf"
out = r"D:\desktop\题库系统\src\pdf_pages"
os.makedirs(out, exist_ok=True)

doc = fitz.open(pdf)
print("页数:", len(doc))
for i, page in enumerate(doc):
    mat = fitz.Matrix(2.2, 2.2)  # 2.2x 缩放，约 160 DPI
    pix = page.get_pixmap(matrix=mat)
    path = os.path.join(out, f"page_{i+1}.png")
    pix.save(path)
    print(f"page_{i+1}.png  {pix.width}x{pix.height}  {os.path.getsize(path)//1024}KB")
