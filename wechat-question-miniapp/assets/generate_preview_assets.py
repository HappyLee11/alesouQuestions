from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

ROOT = Path('/home/zjlzj/.openclaw/workspace/wechat-question-miniapp/assets')

W, H = 1600, 960
BG = '#EEF4FF'
PRIMARY = '#2563EB'
PRIMARY_DARK = '#1D4ED8'
TEXT = '#0F172A'
SUBTLE = '#64748B'
CARD = '#FFFFFF'
LINE = '#D9E6FF'
SOFT = '#F8FBFF'
GREEN = '#10B981'
ORANGE = '#F59E0B'
RED = '#EF4444'

font_candidates = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]


def get_font(size, bold=False):
    candidates = []
    if bold:
        candidates.extend([
            '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
            '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        ])
    candidates.extend(font_candidates)
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except Exception:
                continue
    return ImageFont.load_default()

FONT_20 = get_font(20)
FONT_22 = get_font(22)
FONT_24 = get_font(24)
FONT_26B = get_font(26, bold=True)
FONT_28B = get_font(28, bold=True)
FONT_30B = get_font(30, bold=True)
FONT_36B = get_font(36, bold=True)
FONT_44B = get_font(44, bold=True)


def rr(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadow(base, box, radius=28, alpha=35, blur=24, offset=(0, 12)):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    dx, dy = offset
    d.rounded_rectangle((x0 + dx, y0 + dy, x1 + dx, y1 + dy), radius=radius, fill=(37, 99, 235, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def draw_phone(base, box, screen='home'):
    x0, y0, x1, y1 = box
    shadow(base, box, radius=34, alpha=42, blur=26, offset=(0, 20))
    d = ImageDraw.Draw(base)
    rr(d, box, 36, '#0B1220')
    inner = (x0 + 14, y0 + 14, x1 - 14, y1 - 14)
    rr(d, inner, 28, '#F5F9FF')
    notch = ((x0 + x1) // 2 - 80, y0 + 18, (x0 + x1) // 2 + 80, y0 + 34)
    rr(d, notch, 8, '#0B1220')
    sx0, sy0, sx1, sy1 = inner

    for i in range(90):
        mix = i / 89
        color = (
            int(37 * (1 - mix) + 96 * mix),
            int(99 * (1 - mix) + 165 * mix),
            int(235 * (1 - mix) + 250 * mix),
            255,
        )
        d.rectangle((sx0, sy0 + 24 + i, sx1, sy0 + 25 + i), fill=color)

    d.text((sx0 + 24, sy0 + 38), '阿乐搜题', font=FONT_28B, fill='white')
    d.text((sx0 + 24, sy0 + 78), '题目、答案、解析，一搜就有', font=FONT_20, fill='#DCEBFF')

    rr(d, (sx0 + 20, sy0 + 126, sx1 - 20, sy0 + 174), 24, 'white')
    placeholder = '搜索题目 / 知识点 / 关键词'
    if screen == 'search':
        placeholder = '闭包'
    d.text((sx0 + 40, sy0 + 140), placeholder, font=FONT_20, fill=SUBTLE)
    rr(d, (sx1 - 122, sy0 + 134, sx1 - 28, sy0 + 166), 16, '#E8F0FF')
    d.text((sx1 - 95, sy0 + 141), '搜索', font=FONT_20, fill=PRIMARY_DARK)

    body_top = sy0 + 198
    if screen == 'home':
        d.text((sx0 + 24, body_top), '热门搜索', font=FONT_24, fill=TEXT)
        tags = ['高数极限', '英语阅读', '数据结构', '计算机网络']
        tx = sx0 + 24
        ty = body_top + 42
        for idx, tag in enumerate(tags):
            tw = 34 + len(tag) * 20
            rr(d, (tx, ty, tx + tw, ty + 38), 19, '#EAF2FF')
            d.text((tx + 18, ty + 9), tag, font=FONT_20, fill=PRIMARY_DARK)
            tx += tw + 14
            if idx == 1:
                tx = sx0 + 24
                ty += 52

        d.text((sx0 + 24, body_top + 146), '最近搜索', font=FONT_24, fill=TEXT)
        items = [
            ('线性回归的损失函数是什么', '昨天 21:18'),
            ('牛顿第二定律公式', '昨天 20:47'),
            ('古诗词默写 高频', '昨天 18:06'),
        ]
        iy = body_top + 190
        for title, meta in items:
            rr(d, (sx0 + 20, iy, sx1 - 20, iy + 70), 20, CARD, outline=LINE, width=2)
            d.text((sx0 + 38, iy + 14), title, font=FONT_20, fill=TEXT)
            d.text((sx0 + 38, iy + 40), meta, font=FONT_20, fill=SUBTLE)
            iy += 84

        d.text((sx0 + 24, iy + 12), '按学科找题', font=FONT_24, fill=TEXT)
        tags2 = [('数学', '#EEF4FF'), ('英语', '#EEF4FF'), ('物理', '#EEF4FF'), ('化学', '#EEF4FF')]
        tx = sx0 + 24
        ty = iy + 52
        for tag, color in tags2:
            rr(d, (tx, ty, tx + 92, ty + 38), 19, color)
            d.text((tx + 24, ty + 9), tag, font=FONT_20, fill=PRIMARY_DARK)
            tx += 108
    else:
        filters = [('全部', '#DBEAFE', PRIMARY_DARK), ('前端', '#EEF4FF', PRIMARY_DARK), ('中等', '#F3F4F6', '#475569'), ('单选', '#F3F4F6', '#475569')]
        tx = sx0 + 24
        for label, fill, fg in filters:
            tw = 42 + len(label) * 18
            rr(d, (tx, body_top, tx + tw, body_top + 36), 18, fill)
            d.text((tx + 18, body_top + 8), label, font=FONT_20, fill=fg)
            tx += tw + 12
        d.text((sx0 + 24, body_top + 58), '共 12 条结果', font=FONT_20, fill=SUBTLE)

        cards = [
            ('JavaScript 闭包是什么？', '内部函数可以访问外部函数作用域中的变量。', ('前端', '中等')),
            ('事件循环中宏任务和微任务的执行顺序', '每轮宏任务结束后，会先清空微任务队列。', ('前端', '进阶')),
            ('什么情况下会发生变量提升', '声明会提升，赋值不会提前生效。', ('前端', '基础')),
        ]
        iy = body_top + 96
        for title, desc, chips in cards:
            rr(d, (sx0 + 20, iy, sx1 - 20, iy + 118), 24, CARD, outline=LINE, width=2)
            d.text((sx0 + 38, iy + 18), title, font=FONT_22, fill=TEXT)
            d.text((sx0 + 38, iy + 52), desc, font=FONT_20, fill=SUBTLE)
            cx = sx0 + 38
            cy = iy + 82
            for label in chips:
                tw = 36 + len(label) * 16
                rr(d, (cx, cy, cx + tw, cy + 28), 14, '#EEF4FF')
                d.text((cx + 14, cy + 5), label, font=FONT_20, fill=PRIMARY_DARK)
                cx += tw + 10
            rr(d, (sx1 - 122, iy + 78, sx1 - 38, iy + 106), 14, '#F8FAFC')
            d.text((sx1 - 98, iy + 83), '查看', font=FONT_20, fill='#475569')
            iy += 134


def build_png():
    img = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.ellipse((-120, -140, 380, 340), fill='#DCEBFF')
    d.ellipse((1180, -80, 1660, 340), fill='#D9F1FF')
    d.ellipse((1040, 620, 1640, 1120), fill='#E0EAFF')

    rr(d, (90, 84, 258, 130), 23, '#FFFFFF', outline=LINE, width=2)
    d.text((118, 114), '阿乐搜题', font=FONT_24, fill=TEXT, anchor='mm')

    bullets = [('真题检索', GREEN), ('热门搜索', ORANGE), ('答案解析', PRIMARY), ('筛选结果', RED)]
    bx = 92
    by = 164
    for label, color in bullets:
        rr(d, (bx, by, bx + 134, by + 40), 20, '#FFFFFF', outline=LINE, width=2)
        d.ellipse((bx + 16, by + 12, bx + 32, by + 28), fill=color)
        d.text((bx + 42, by + 9), label, font=FONT_20, fill=TEXT)
        bx += 150

    home_box = (640, 86, 1000, 860)
    search_box = (1060, 126, 1420, 900)
    draw_phone(img, home_box, 'home')
    draw_phone(img, search_box, 'search')

    rr(d, (120, 288, 520, 676), 34, '#FFFFFF', outline=LINE, width=2)
    rr(d, (152, 332, 488, 388), 28, '#F8FBFF')
    d.text((320, 360), '搜索题目 / 知识点 / 关键词', font=FONT_22, fill=SUBTLE, anchor='mm')
    tags = ['高数极限', '英语阅读', '数据结构']
    tx = 152
    for tag in tags:
        tw = 34 + len(tag) * 20
        rr(d, (tx, 424, tx + tw, 462), 19, '#EAF2FF')
        d.text((tx + 18, 433), tag, font=FONT_20, fill=PRIMARY_DARK)
        tx += tw + 14
    cards = [
        '线性回归的损失函数是什么',
        'JavaScript 闭包是什么？',
        'Redis 为什么适合做缓存？',
    ]
    cy = 496
    for item in cards:
        rr(d, (152, cy, 488, cy + 62), 20, '#FFFFFF', outline=LINE, width=2)
        d.text((176, cy + 18), item, font=FONT_20, fill=TEXT)
        d.text((176, cy + 40), '答案摘要 · 解析 · 查看详情', font=FONT_20, fill=SUBTLE)
        cy += 76

    img.save(ROOT / 'hero-overview.png')


def build_home_svg():
    svg = '''<svg width="1200" height="760" viewBox="0 0 1200 760" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="760" rx="32" fill="#EEF4FF"/>
  <circle cx="154" cy="122" r="118" fill="#DCEBFF"/>
  <circle cx="1088" cy="124" r="132" fill="#D9F1FF"/>
  <rect x="80" y="82" width="164" height="46" rx="23" fill="#FFFFFF" stroke="#D9E6FF" stroke-width="2"/>
  <text x="162" y="112" fill="#0F172A" font-size="24" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700" text-anchor="middle">阿乐搜题</text>
  <rect x="80" y="156" width="134" height="40" rx="20" fill="#FFFFFF" stroke="#D9E6FF"/>
  <circle cx="102" cy="176" r="8" fill="#10B981"/>
  <text x="120" y="182" fill="#0F172A" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">真题检索</text>
  <rect x="230" y="156" width="134" height="40" rx="20" fill="#FFFFFF" stroke="#D9E6FF"/>
  <circle cx="252" cy="176" r="8" fill="#F59E0B"/>
  <text x="270" y="182" fill="#0F172A" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">热门搜索</text>
  <rect x="380" y="156" width="134" height="40" rx="20" fill="#FFFFFF" stroke="#D9E6FF"/>
  <circle cx="402" cy="176" r="8" fill="#2563EB"/>
  <text x="420" y="182" fill="#0F172A" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">答案解析</text>

  <g>
    <rect x="642" y="92" width="212" height="510" rx="34" fill="#0B1220"/>
    <rect x="656" y="106" width="184" height="482" rx="28" fill="#F5F9FF"/>
    <rect x="728" y="112" width="40" height="8" rx="4" fill="#0B1220"/>
    <rect x="656" y="130" width="184" height="92" fill="url(#homeTop)"/>
    <text x="678" y="166" fill="white" font-size="20" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">阿乐搜题</text>
    <text x="678" y="194" fill="#DCEBFF" font-size="12" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">题目、答案、解析，一搜就有</text>
    <rect x="670" y="236" width="156" height="34" rx="17" fill="white"/>
    <text x="686" y="258" fill="#64748B" font-size="12" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">搜索题目 / 知识点</text>
    <text x="678" y="304" fill="#0F172A" font-size="14" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">热门搜索</text>
    <rect x="670" y="318" width="68" height="26" rx="13" fill="#EAF2FF"/>
    <text x="686" y="336" fill="#1D4ED8" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">高数极限</text>
    <rect x="744" y="318" width="68" height="26" rx="13" fill="#EAF2FF"/>
    <text x="760" y="336" fill="#1D4ED8" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">英语阅读</text>
    <rect x="670" y="364" width="156" height="54" rx="16" fill="#FFFFFF" stroke="#D9E6FF"/>
    <text x="682" y="386" fill="#0F172A" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">线性回归的损失函数是什么</text>
    <text x="682" y="406" fill="#64748B" font-size="10" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">昨天 21:18</text>
    <rect x="670" y="426" width="156" height="54" rx="16" fill="#FFFFFF" stroke="#D9E6FF"/>
    <text x="682" y="448" fill="#0F172A" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">牛顿第二定律公式</text>
    <text x="682" y="468" fill="#64748B" font-size="10" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">昨天 20:47</text>
    <text x="678" y="520" fill="#0F172A" font-size="14" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">按学科找题</text>
    <rect x="670" y="534" width="44" height="24" rx="12" fill="#EEF4FF"/>
    <text x="684" y="550" fill="#1D4ED8" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">数学</text>
    <rect x="720" y="534" width="44" height="24" rx="12" fill="#EEF4FF"/>
    <text x="734" y="550" fill="#1D4ED8" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">英语</text>
    <rect x="770" y="534" width="44" height="24" rx="12" fill="#EEF4FF"/>
    <text x="784" y="550" fill="#1D4ED8" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">物理</text>
  </g>

  <g>
    <rect x="898" y="132" width="212" height="510" rx="34" fill="#0B1220"/>
    <rect x="912" y="146" width="184" height="482" rx="28" fill="#F5F9FF"/>
    <rect x="984" y="152" width="40" height="8" rx="4" fill="#0B1220"/>
    <rect x="912" y="170" width="184" height="92" fill="url(#searchTop)"/>
    <text x="934" y="206" fill="white" font-size="20" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">阿乐搜题</text>
    <text x="934" y="234" fill="#DCEBFF" font-size="12" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">题目、答案、解析，一搜就有</text>
    <rect x="926" y="276" width="156" height="34" rx="17" fill="white"/>
    <text x="942" y="298" fill="#64748B" font-size="12" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">闭包</text>
    <rect x="926" y="328" width="46" height="24" rx="12" fill="#DBEAFE"/>
    <text x="940" y="344" fill="#1D4ED8" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">全部</text>
    <rect x="978" y="328" width="46" height="24" rx="12" fill="#EEF4FF"/>
    <text x="992" y="344" fill="#1D4ED8" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">前端</text>
    <rect x="1030" y="328" width="46" height="24" rx="12" fill="#F3F4F6"/>
    <text x="1044" y="344" fill="#475569" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">中等</text>
    <rect x="926" y="370" width="156" height="86" rx="18" fill="#FFFFFF" stroke="#D9E6FF"/>
    <text x="938" y="396" fill="#0F172A" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">JavaScript 闭包是什么？</text>
    <text x="938" y="416" fill="#64748B" font-size="10" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">内部函数可以访问外部函数作用域中的变量。</text>
    <rect x="938" y="430" width="40" height="20" rx="10" fill="#EEF4FF"/>
    <text x="948" y="444" fill="#1D4ED8" font-size="10" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">前端</text>
    <rect x="984" y="430" width="40" height="20" rx="10" fill="#EEF4FF"/>
    <text x="994" y="444" fill="#1D4ED8" font-size="10" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">中等</text>
    <rect x="926" y="466" width="156" height="86" rx="18" fill="#FFFFFF" stroke="#D9E6FF"/>
    <text x="938" y="492" fill="#0F172A" font-size="11" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">事件循环中宏任务和微任务的执行顺序</text>
    <text x="938" y="512" fill="#64748B" font-size="10" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">每轮宏任务结束后，会先清空微任务队列。</text>
  </g>

  <defs>
    <linearGradient id="homeTop" x1="656" y1="130" x2="840" y2="222" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563EB"/>
      <stop offset="1" stop-color="#60A5FA"/>
    </linearGradient>
    <linearGradient id="searchTop" x1="912" y1="170" x2="1096" y2="262" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1D4ED8"/>
      <stop offset="1" stop-color="#60A5FA"/>
    </linearGradient>
  </defs>
</svg>
'''
    (ROOT / 'hero-overview.svg').write_text(svg, encoding='utf-8')


def build_search_svg():
    svg = '''<svg width="1200" height="760" viewBox="0 0 1200 760" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="760" rx="32" fill="#F5F9FF"/>
  <circle cx="136" cy="116" r="110" fill="#E0EAFF"/>
  <circle cx="1066" cy="126" r="124" fill="#D9F1FF"/>
  <rect x="86" y="88" width="164" height="46" rx="23" fill="#FFFFFF" stroke="#D9E6FF" stroke-width="2"/>
  <text x="168" y="118" fill="#0F172A" font-size="24" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700" text-anchor="middle">阿乐搜题</text>
  <rect x="86" y="164" width="134" height="40" rx="20" fill="#FFFFFF" stroke="#D9E6FF"/>
  <circle cx="108" cy="184" r="8" fill="#2563EB"/>
  <text x="126" y="190" fill="#0F172A" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">答案解析</text>
  <rect x="236" y="164" width="134" height="40" rx="20" fill="#FFFFFF" stroke="#D9E6FF"/>
  <circle cx="258" cy="184" r="8" fill="#10B981"/>
  <text x="276" y="190" fill="#0F172A" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">题目筛选</text>
  <rect x="386" y="164" width="134" height="40" rx="20" fill="#FFFFFF" stroke="#D9E6FF"/>
  <circle cx="408" cy="184" r="8" fill="#F59E0B"/>
  <text x="426" y="190" fill="#0F172A" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">继续查看</text>

  <g>
    <rect x="248" y="112" width="350" height="560" rx="36" fill="#0B1220"/>
    <rect x="262" y="126" width="322" height="532" rx="30" fill="#F5F9FF"/>
    <rect x="385" y="132" width="76" height="8" rx="4" fill="#0B1220"/>
    <rect x="262" y="150" width="322" height="98" fill="url(#top1)"/>
    <text x="294" y="190" fill="white" font-size="28" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">阿乐搜题</text>
    <text x="294" y="224" fill="#DCEBFF" font-size="16" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">题目、答案、解析，一搜就有</text>
    <rect x="284" y="266" width="278" height="42" rx="21" fill="white"/>
    <text x="306" y="293" fill="#64748B" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">闭包</text>
    <rect x="284" y="328" width="56" height="28" rx="14" fill="#DBEAFE"/>
    <text x="302" y="347" fill="#1D4ED8" font-size="13" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">全部</text>
    <rect x="348" y="328" width="56" height="28" rx="14" fill="#EEF4FF"/>
    <text x="366" y="347" fill="#1D4ED8" font-size="13" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">前端</text>
    <rect x="412" y="328" width="56" height="28" rx="14" fill="#F3F4F6"/>
    <text x="430" y="347" fill="#475569" font-size="13" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">中等</text>
    <rect x="476" y="328" width="56" height="28" rx="14" fill="#F3F4F6"/>
    <text x="494" y="347" fill="#475569" font-size="13" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">单选</text>
    <text x="284" y="392" fill="#64748B" font-size="16" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">共 12 条结果</text>
    <rect x="284" y="412" width="278" height="106" rx="20" fill="#FFFFFF" stroke="#D9E6FF"/>
    <text x="302" y="444" fill="#0F172A" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">JavaScript 闭包是什么？</text>
    <text x="302" y="472" fill="#64748B" font-size="14" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">内部函数可以访问外部函数作用域中的变量。</text>
    <rect x="302" y="486" width="52" height="24" rx="12" fill="#EEF4FF"/>
    <text x="320" y="502" fill="#1D4ED8" font-size="12" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">前端</text>
    <rect x="360" y="486" width="52" height="24" rx="12" fill="#EEF4FF"/>
    <text x="378" y="502" fill="#1D4ED8" font-size="12" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">中等</text>
    <rect x="284" y="532" width="278" height="106" rx="20" fill="#FFFFFF" stroke="#D9E6FF"/>
    <text x="302" y="564" fill="#0F172A" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">事件循环中宏任务和微任务的执行顺序</text>
    <text x="302" y="592" fill="#64748B" font-size="14" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">每轮宏任务结束后，会先清空微任务队列。</text>
  </g>

  <g>
    <rect x="676" y="190" width="378" height="96" rx="28" fill="#FFFFFF" stroke="#D9E6FF"/>
    <text x="708" y="228" fill="#64748B" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">推荐搜索</text>
    <rect x="708" y="242" width="96" height="32" rx="16" fill="#EAF2FF"/>
    <text x="732" y="263" fill="#1D4ED8" font-size="14" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">作用域</text>
    <rect x="816" y="242" width="96" height="32" rx="16" fill="#EAF2FF"/>
    <text x="840" y="263" fill="#1D4ED8" font-size="14" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">原型链</text>
    <rect x="924" y="242" width="98" height="32" rx="16" fill="#EAF2FF"/>
    <text x="948" y="263" fill="#1D4ED8" font-size="14" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">事件循环</text>
  </g>

  <g>
    <rect x="676" y="316" width="378" height="214" rx="28" fill="#FFFFFF" stroke="#D9E6FF"/>
    <text x="708" y="360" fill="#0F172A" font-size="24" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-weight="700">Redis 为什么适合做缓存？</text>
    <text x="708" y="400" fill="#64748B" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">因为它基于内存、读写快，并提供过期与淘汰策略。</text>
    <rect x="708" y="426" width="72" height="28" rx="14" fill="#EEF4FF"/>
    <text x="730" y="445" fill="#1D4ED8" font-size="13" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">后端</text>
    <rect x="788" y="426" width="72" height="28" rx="14" fill="#EEF4FF"/>
    <text x="810" y="445" fill="#1D4ED8" font-size="13" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">简单</text>
    <text x="708" y="492" fill="#64748B" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">HTTP 状态码 404 表示什么？</text>
    <text x="708" y="524" fill="#64748B" font-size="18" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">服务器未找到请求的资源，常见于地址错误或资源已删除。</text>
  </g>

  <defs>
    <linearGradient id="top1" x1="262" y1="150" x2="584" y2="248" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563EB"/>
      <stop offset="1" stop-color="#60A5FA"/>
    </linearGradient>
  </defs>
</svg>
'''
    (ROOT / 'search-page-preview.svg').write_text(svg, encoding='utf-8')


if __name__ == '__main__':
    build_png()
    build_home_svg()
    build_search_svg()
