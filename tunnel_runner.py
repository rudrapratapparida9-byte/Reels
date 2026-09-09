import subprocess
import time
import re
import os
import sys

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root_dir)

    print("========================================================")
    print("   ReelsVault 24/7 Server Launcher")
    print("========================================================")

    # 1. Kill old processes
    try:
        subprocess.run(['taskkill', '/F', '/IM', 'cloudflared.exe'], capture_output=True)
    except Exception:
        pass

    # 2. Start node server
    print("[1/2] Starting backend node server on port 5000...")
    subprocess.Popen(['node', 'server.js'], cwd=root_dir)
    time.sleep(2)

    # 3. Start Cloudflare Tunnel
    print("[2/2] Connecting to public live network...")
    while True:
        try:
            tunnel_proc = subprocess.Popen(
                [os.path.join(root_dir, 'cloudflared.exe'), 'tunnel', '--url', 'http://127.0.0.1:5000'],
                cwd=root_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            for line in tunnel_proc.stdout:
                match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
                if match:
                    url = match.group(0)
                    print("\n" + "="*60)
                    print("  YOUR LIVE WEBSITE IS ONLINE AT:")
                    print(f"  {url}")
                    print("="*60 + "\n")
                    print("  (Keep this window open or minimized to keep site online)")
                    print("  (Close this window when you want to stop the website)\n")
                    with open(os.path.join(root_dir, 'LIVE_URL.txt'), 'w', encoding='utf-8') as f:
                        f.write(url)
                    break

            tunnel_proc.wait()
        except Exception as e:
            print("Tunnel error:", e)
        
        print("Reconnecting tunnel in 3 seconds...")
        time.sleep(3)

if __name__ == '__main__':
    main()
