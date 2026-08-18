import sqlite3
import json
from datetime import datetime

# 导出数据库为JSON
conn = sqlite3.connect('data.db')
c = conn.cursor()

# 获取所有题目
c.execute('''
    SELECT id, code, subject, qtype, grade, difficulty, tags, source, 
           body, options, answer, analysis, use_count, created_at, updated_at
    FROM questions ORDER BY id
''')

questions = []
for row in c.fetchall():
    q = {
        'id': row[0],
        'code': row[1],
        'subject': row[2],
        'qtype': row[3],
        'grade': row[4],
        'difficulty': row[5],
        'tags': json.loads(row[6]) if row[6] else [],
        'source': row[7],
        'body': row[8],
        'options': json.loads(row[9]) if row[9] else [],
        'answer': row[10],
        'analysis': row[11],
        'useCount': row[12],
        'createdAt': row[13],
        'updatedAt': row[14],
    }
    questions.append(q)

# 创建备份对象
backup = {
    'version': 1,
    'exportedAt': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'questionCount': len(questions),
    'questions': questions
}

# 保存为JSON
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(backup, f, ensure_ascii=False, indent=2)

print(f'导出完成: {len(questions)} 题')
print(f'保存到: data.json')

conn.close()
