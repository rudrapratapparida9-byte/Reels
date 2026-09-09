import subprocess
import time
import re
import os
import sys

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root_dir)

    # 1. Kill any existing node server / cloudflared
    try:
        subprocess.run(['taskkill', '/F', '/IM', 'cloudflared.exe'], capture_output=True)
    except Exception:
        pass

    # 2. Start node server detached
    node_proc = subprocess.Popen(
        ['node', 'server.js'],
        cwd=root_dir,
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(2)

    # 3. Start cloudflared detached
    log_file = open(os.path.join(root_dir, 'tunnel.log'), 'w', encoding='utf-8')
    tunnel_proc = subprocess.Popen(
        [os.path.join(root_dir, 'cloudflared.exe'), 'tunnel', '--protocol', 'http2', '--url', 'http://localhost:5000'],
        cwd=root_dir,
        stdout=log_file,
        stderr=subprocess.STDOUT
    )

    # 4. Wait for URL to appear in tunnel.log
    url = None
    for _ in range(30):
        time.sleep(1)
        if os.path.exists('tunnel.log'):
            with open('tunnel.log', 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                matches = re.findall(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', content)
                if matches:
                    url = matches[0]
                    break

    if url:
        with open('LIVE_URL.txt', 'w', encoding='utf-8') as f:
            f.write(url)
        print(f"SUCCESS:{url}")
    else:
        print("ERROR:Could not find URL within 30s")

if __name__ == '__main__':
    main()
