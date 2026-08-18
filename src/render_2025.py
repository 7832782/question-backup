# -*- coding: utf-8 -*-
"""渲染 2025 高考卷 PDF 为 PNG + 提取文本层"""
import fitz
import os

BASE = r"D:\desktop\题库系统\gaokaomath-main\普通高考\2025"
OUT = r"D:\desktop\题库系统\src\pdf_pages\2025"
os.makedirs(OUT, exist_ok=True)

PDFS = [
    "2025上海.pdf",
    "2025全国1(山东,广东,湖南,湖北,河北,江苏,福建,浙江,河南,江西,安徽).pdf",
    "2025全国2(辽宁,重庆,海南,吉林,黑龙江,山西,云南,广西,甘肃,贵州,新疆,四川,内蒙古,陕西,青海,宁夏,西藏).pdf",
    "2025北京.pdf",
    "2025天津.pdf",
]

for pdf_name in PDFS:
    pdf_path = os.path.join(BASE, pdf_name)
    short = pdf_name.split("(")[0].replace("2025", "").strip()  # 上海, 全国1, 全国2, 北京, 天津
    doc = fitz.open(pdf_path)
    print(f"\n=== {short} === ({len(doc)} 页)")
    
    # 提取全部文本
    all_text = ""
    for i, page in enumerate(doc):
        txt = page.get_text().strip()
        all_text += f"\n--- PAGE {i+1} ---\n{txt}"
    
    # 保存文本
    txt_path = os.path.join(OUT, f"2025{short}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(all_text)
    print(f"文本: {txt_path} ({len(all_text)} 字)")
    
    # 渲染每页为 PNG（1.1x 缩放节省空间）
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(1.1, 1.1))
        out_path = os.path.join(OUT, f"2025{short}_p{i+1}.png")
        pix.save(out_path)
    
    doc.close()
    print(f"渲染完成")
