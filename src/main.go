package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

//go:embed web
var webFS embed.FS

func main() {
	noBrowser := flag.Bool("no-browser", false, "不自动打开浏览器")
	dbFlag := flag.String("db", "", "数据库路径（默认：exe 同目录 data.db）")
	flag.Parse()
	log.SetPrefix("[题库系统] ")

	// 数据文件：默认在 exe 同目录，可用 -db 指定（测试隔离用）
	dbPath := *dbFlag
	if dbPath == "" {
		exePath, err := os.Executable()
		if err != nil {
			log.Fatal("无法定位可执行文件: ", err)
		}
		dataDir := filepath.Dir(exePath)
		dbPath = filepath.Join(dataDir, "data.db")
	}

	if err := initDB(dbPath); err != nil {
		log.Fatal("数据库初始化失败: ", err)
	}
	log.Println("数据文件:", dbPath)

	// 静态资源（前端）
	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.Handle("/api/", apiHandler())
	mux.Handle("/", http.FileServer(http.FS(sub)))

	// 找一个可用端口
	port := findPort(8787)
	addr := fmt.Sprintf("127.0.0.1:%d", port)
	url := "http://" + addr

	// 稍后自动打开浏览器
	if !*noBrowser {
		go func() {
			time.Sleep(300 * time.Millisecond)
			openBrowser(url)
		}()
	}

	log.Println("服务已启动:", url)
	log.Println("按 Ctrl+C 退出")
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

// findPort 从 base 开始找空闲端口
func findPort(base int) int {
	for p := base; p < base+50; p++ {
		ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", p))
		if err == nil {
			ln.Close()
			return p
		}
	}
	return 0
}

// openBrowser 调用系统默认浏览器打开网址
func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}
