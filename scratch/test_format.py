import yt_dlp

ydl = yt_dlp.YoutubeDL({'quiet': True})
info = ydl.extract_info('https://www.instagram.com/reel/DdETKR9hOiG/', download=False)
formats = info.get('formats', [])
audio_url = None
video_url = None

for f in formats:
    fid = str(f.get('format_id', ''))
    vcodec = str(f.get('vcodec', ''))
    acodec = str(f.get('acodec', ''))
    print(f"fid: {fid}, vcodec: {vcodec}, acodec: {acodec}, url: {f.get('url')[:50]}")
    if fid.endswith('a') or '_audio' in fid.lower() or (acodec != 'none' and (vcodec == 'none' or not vcodec)):
        if not audio_url:
            audio_url = f.get('url')

for f in reversed(formats):
    fid = str(f.get('format_id', ''))
    vcodec = str(f.get('vcodec', ''))
    if vcodec != 'none' and not fid.endswith('a'):
        if not video_url:
            video_url = f.get('url')

print('--> SELECTED AUDIO URL:', audio_url[:70] if audio_url else None)
print('--> SELECTED VIDEO URL:', video_url[:70] if video_url else None)
