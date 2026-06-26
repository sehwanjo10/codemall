import urllib.request
import re
import ssl

try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    html = urllib.request.urlopen('https://www.youtube.com/@et_dad', context=ctx).read().decode('utf-8')
    with open('yt.html', 'w', encoding='utf-8') as f:
        f.write(html)
    m = re.search(r'\"browseId\":\"(UC[a-zA-Z0-9_-]{22})\"', html)
    print(m.group(1) if m else 'Not Found')
except Exception as e:
    print('Error:', e)
