# -*- coding: utf-8 -*-
"""NBA Career Simulator - 一键启动游戏（内嵌控制台，无CMD窗口）"""
import threading
import webbrowser
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

# ── 配置 ──
PORT = 3000
HTML_FILE = "nba-career-simulator.html"
DIR = os.path.dirname(os.path.abspath(__file__))

# ── 切换工作目录 ──
os.chdir(DIR)

# ── HTTP 服务 ──
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # 自动补全 .html 后缀
        if self.path == "/nba-career-simulator":
            self.send_response(301)
            self.send_header("Location", f"/{HTML_FILE}")
            self.end_headers()
            return
        # 根路径重定向到游戏页面
        if self.path == "/":
            self.send_response(301)
            self.send_header("Location", f"/{HTML_FILE}")
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        try:
            msg = fmt % args
            if gui and gui.alive:
                gui.root.after(0, lambda m=msg: gui.log(m))
        except Exception:
            pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


# ── GUI（tkinter 内嵌控制台） ──
class App:
    def __init__(self):
        import tkinter as tk
        self.alive = False
        self.root = tk.Tk()
        self.root.title("NBA Career Simulator")
        self.root.geometry("560x360")
        self.root.resizable(True, True)
        self.root.configure(bg="#0a0e1a")

        # 标题
        tk.Label(
            self.root, text="NBA Career Simulator",
            font=("Segoe UI", 16, "bold"), fg="#f8c14d", bg="#0a0e1a"
        ).pack(pady=(12, 4))

        tk.Label(
            self.root, text=f"http://localhost:{PORT}/{HTML_FILE}",
            font=("Consolas", 10), fg="#53d8ff", bg="#0a0e1a", cursor="hand2"
        ).pack(pady=(0, 8))

        # 控制台输出
        frame = tk.Frame(self.root, bg="#0a0e1a")
        frame.pack(fill="both", expand=True, padx=12, pady=(0, 8))

        self.text = tk.Text(
            frame, bg="#0d1117", fg="#c9d1d9", font=("Consolas", 10),
            wrap="word", state="disabled", relief="flat", bd=0,
            insertbackground="#c9d1d9", selectbackground="#264f78"
        )
        sb = tk.Scrollbar(frame, command=self.text.yview)
        self.text.configure(yscrollcommand=sb.set)
        sb.pack(side="right", fill="y")
        self.text.pack(fill="both", expand=True)

        # 底部按钮
        btn_frame = tk.Frame(self.root, bg="#0a0e1a")
        btn_frame.pack(fill="x", padx=12, pady=(0, 10))

        tk.Button(
            btn_frame, text="打开浏览器", font=("Segoe UI", 10, "bold"),
            bg="#2d66ff", fg="white", activebackground="#1a4fd1",
            relief="flat", padx=16, pady=4,
            command=self.open_browser
        ).pack(side="left")

        tk.Button(
            btn_frame, text="退出", font=("Segoe UI", 10, "bold"),
            bg="#6e7681", fg="white", activebackground="#484f58",
            relief="flat", padx=16, pady=4,
            command=self.quit
        ).pack(side="right")

        self.root.protocol("WM_DELETE_WINDOW", self.quit)

        # HTTP服务器放后台线程
        self.server = HTTPServer(("127.0.0.1", PORT), Handler)
        self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()

        self.alive = True

    def log(self, msg):
        self.text.configure(state="normal")
        self.text.insert("end", msg + "\n")
        self.text.see("end")
        self.text.configure(state="disabled")

    def open_browser(self):
        webbrowser.open(f"http://localhost:{PORT}/{HTML_FILE}")

    def quit(self):
        if not self.alive:
            return
        self.alive = False
        try:
            self.server.shutdown()
        except Exception:
            pass
        self.root.quit()  # 使用 quit() 而不是 destroy()，避免卡死
        self.root.destroy()


gui = None

if __name__ == "__main__":
    gui = App()
    gui.log(f"工作目录: {DIR}")
    gui.log(f"服务启动于 http://localhost:{PORT}")
    gui.log(f"游戏页面: http://localhost:{PORT}/{HTML_FILE}")
    gui.log("等待连接...\n")
    # 延迟打开浏览器
    gui.root.after(800, gui.open_browser)
    gui.root.mainloop()
