#!/usr/bin/env python3
"""
题库备份到GitHub的脚本
每次导入操作完成后调用此脚本
"""
import subprocess
import os
from datetime import datetime

# 配置
REPO_DIR = r"D:\desktop\题库系统"


def _load_token():
    """优先取环境变量 GITHUB_TOKEN，其次读 .backup_config"""
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        return tok.strip()
    cfg = os.path.join(REPO_DIR, ".backup_config")
    if os.path.exists(cfg):
        with open(cfg, encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GITHUB_TOKEN="):
                    return line.split("=", 1)[1].strip()
    return None


GITHUB_TOKEN = _load_token()
if not GITHUB_TOKEN:
    raise SystemExit("未找到 GITHUB_TOKEN（请设置环境变量或 .backup_config）")
REMOTE_URL = f"https://{GITHUB_TOKEN}@github.com/7832782/question-backup.git"

def run_command(cmd, cwd=None):
    """执行命令并返回输出"""
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr

def backup_to_github(message=None):
    """备份到GitHub"""
    print("=" * 50)
    print("开始备份到GitHub")
    print("=" * 50)
    
    # 1. 导出数据库
    print("\n1. 导出数据库...")
    os.chdir(REPO_DIR)
    returncode, stdout, stderr = run_command("python src/export_db.py")
    if returncode != 0:
        print(f"   导出失败: {stderr}")
        return False
    print(f"   {stdout.strip()}")
    
    # 2. 添加到git
    print("\n2. 添加到git...")
    returncode, stdout, stderr = run_command("git add data.json")
    if returncode != 0:
        print(f"   添加失败: {stderr}")
        return False
    
    # 3. 检查是否有更改
    returncode, stdout, stderr = run_command("git status --porcelain")
    if not stdout.strip():
        print("   没有更改需要提交")
        print("\n备份完成（无更改）")
        return True
    
    # 4. 提交
    print("\n3. 提交...")
    if not message:
        message = f"自动备份: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    returncode, stdout, stderr = run_command(f'git commit -m "{message}"')
    if returncode != 0:
        print(f"   提交失败: {stderr}")
        return False
    print(f"   {stdout.strip()}")
    
    # 5. 推送
    print("\n4. 推送到GitHub...")
    returncode, stdout, stderr = run_command("git push origin main")
    if returncode != 0:
        print(f"   推送失败: {stderr}")
        return False
    print("   推送成功!")
    
    print("\n" + "=" * 50)
    print("备份完成!")
    print("=" * 50)
    return True

if __name__ == "__main__":
    import sys
    message = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else None
    success = backup_to_github(message)
    sys.exit(0 if success else 1)
