#!/usr/bin/env python3
"""index.html + style.css + app.js  ->  artmarket-standalone.html (한 파일)
   실행:  python3 build-single.py
   폰에 파일 하나만 넣고 싶을 때 이 결과물을 쓰면 됩니다."""
import io, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
read = lambda n: io.open(os.path.join(HERE, n), encoding='utf-8').read()

html = read('index.html')
css  = read('style.css')
js   = read('app.js')

html = html.replace('<link rel="stylesheet" href="style.css">',
                    '<style>\n' + css + '\n</style>')
html = html.replace('<script src="app.js"></script>',
                    '<script>\n' + js + '\n</script>')
assert '<style>' in html and 'href="style.css"' not in html, 'CSS inline failed'
assert 'src="app.js"' not in html, 'JS inline failed'

out = os.path.join(HERE, 'artmarket-standalone.html')
io.open(out, 'w', encoding='utf-8').write(html)
print('built:', out, '(%.0f KB)' % (len(html.encode('utf-8')) / 1024))
