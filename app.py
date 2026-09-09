import os
import sys
import json
import urllib.parse
import urllib.request
import requests
from flask import Flask, request, jsonify, Response, send_from_directory
from extract_instagram import extract_instagram_data

app = Flask(__name__, static_folder='dist')
PORT = int(os.environ.get('PORT', 10000))

# 1. API: Instagram Media Extraction
@app.route('/api/instagram', methods=['GET'])
def api_instagram():
    target_url = request.args.get('url', '').strip()
    if not target_url:
        return jsonify({'success': False, 'error': 'Missing url parameter'}), 400

    try:
        data = extract_instagram_data(target_url)
        if not data or not data.get('success'):
            return jsonify({'success': False, 'error': data.get('error', 'Failed to extract media')}), 400

        clean_shortcode = "".join(c for c in str(data.get('shortcode', 'media')) if c.isalnum() or c in '_-')

        proxied_video = None
        if data.get('videoUrl'):
            proxied_video = f"/api/stream?url={urllib.parse.quote(data['videoUrl'])}&filename=insta_{clean_shortcode}_1080p.mp4&inline=true"

        proxied_audio = None
        if data.get('audioUrl'):
            proxied_audio = f"/api/stream?url={urllib.parse.quote(data['audioUrl'])}&filename=insta_{clean_shortcode}_audio.mp3&inline=true"

        proxied_thumb = None
        if data.get('thumbnailUrl'):
            proxied_thumb = f"/api/stream?url={urllib.parse.quote(data['thumbnailUrl'])}&filename=insta_{clean_shortcode}_thumb.jpg&inline=true"

        proxied_images = []
        if data.get('images'):
            for idx, img in enumerate(data['images']):
                proxied_images.append(f"/api/stream?url={urllib.parse.quote(img)}&filename=insta_{clean_shortcode}_{idx+1}.jpg&inline=true")
        elif proxied_thumb:
            proxied_images = [proxied_thumb]

        payload = {
            'success': True,
            'data': {
                'id': data.get('id', f'insta_{clean_shortcode}'),
                'shortcode': clean_shortcode,
                'type': data.get('type', 'reel' if data.get('is_video') else 'photo'),
                'title': data.get('title', f"Post by {data.get('username', '@instagram_creator')}"),
                'username': data.get('username', '@instagram_creator'),
                'userAvatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                'likes': data.get('likes', 'Trending'),
                'comments': data.get('comments', 'Public'),
                'caption': data.get('caption', ''),
                'url': target_url,
                'videoUrl': proxied_video or data.get('videoUrl'),
                'thumbnailUrl': proxied_thumb or data.get('thumbnailUrl'),
                'images': proxied_images,
                'audioTitle': data.get('audioTitle', f"{data.get('username', '@instagram_creator')} • Original Audio (320kbps MP3)"),
                'audioUrl': proxied_audio or data.get('audioUrl'),
                'duration': data.get('duration', 'HD 1080p' if data.get('is_video') else 'HD Lossless')
            }
        }
        return jsonify(payload)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# 2. Proxy Streamer for Native File Downloads
@app.route('/api/stream', methods=['GET', 'HEAD'])
def api_stream():
    media_url = request.args.get('url')
    if not media_url:
        return "Missing url", 400

    filename = request.args.get('filename', 'instagram_media.mp4')
    is_inline = request.args.get('inline') == 'true'

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.instagram.com/'
        }
        resp = requests.get(media_url, headers=headers, stream=True, timeout=15)
        
        disposition = 'inline' if is_inline else 'attachment'
        resp_headers = {
            'Content-Type': resp.headers.get('Content-Type', 'application/octet-stream'),
            'Content-Disposition': f'{disposition}; filename="{filename}"',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length'
        }
        if 'Content-Length' in resp.headers:
            resp_headers['Content-Length'] = resp.headers['Content-Length']

        return Response(resp.iter_content(chunk_size=65536), headers=resp_headers, status=resp.status_code)
    except Exception as e:
        return str(e), 500


# 3. Serve Frontend Assets & SPA Routing
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    print(f"🚀 ReelsVault Python Server running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT)
