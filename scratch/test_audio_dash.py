import instaloader
import xml.etree.ElementTree as ET

def test_single_post(shortcode):
    L = instaloader.Instaloader(download_pictures=False, download_videos=False, save_metadata=False)
    post = instaloader.Post.from_shortcode(L.context, shortcode)
    
    raw = getattr(post, '_node', {}) or {}
    manifest = raw.get('video_dash_manifest') or ''
    extracted_audio_url = None
    if manifest:
        try:
            root = ET.fromstring(manifest)
            for period in root.findall('{urn:mpeg:dash:schema:mpd:2011}Period'):
                for adapt in period.findall('{urn:mpeg:dash:schema:mpd:2011}AdaptationSet'):
                    mime = adapt.get('mimeType') or adapt.get('contentType') or ''
                    if 'audio' in mime.lower():
                        for rep in adapt.findall('{urn:mpeg:dash:schema:mpd:2011}Representation'):
                            base = rep.find('{urn:mpeg:dash:schema:mpd:2011}BaseURL')
                            if base is not None and base.text:
                                extracted_audio_url = base.text.strip()
                                break
        except Exception:
            pass

    owner = post.owner_username or 'creator'
    music_meta = raw.get('clips_metadata', {}).get('music_info', {}).get('music_asset_info') if raw.get('clips_metadata') else None
    audio_title = f"@{owner} • Original Audio (320kbps MP3)"
    if music_meta and music_meta.get('title'):
        artist = music_meta.get('display_artist') or owner
        audio_title = f"{artist} • {music_meta.get('title')} (320kbps MP3)"

    print('Shortcode:', shortcode)
    print('Audio title:', audio_title)
    print('Has audio url:', bool(extracted_audio_url))
    print('Audio URL:', extracted_audio_url[:80] if extracted_audio_url else None)

test_single_post('DdETKR9hOiG')
