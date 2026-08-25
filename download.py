import urllib.request
import urllib.parse
import re

query = "امیر تتلو آهنگ شاد دانلود mp3"
url = 'https://html.duckduckgo.com/html/?q=' + urllib.parse.quote(query)
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')
    links = re.findall(r'href=\"(https?://[^\"]+)\"', html)
    for l in links:
        if 'uddg=' in l:
            actual = urllib.parse.unquote(l.split('uddg=')[1].split('&')[0])
            print(actual)
except Exception as e:
    print('Error:', e)
