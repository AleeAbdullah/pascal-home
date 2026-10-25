#!/usr/bin/env python3
"""Pure-stdlib PDF vector/text extractor for architectural drawings.

Usage (run with isolated mode so nothing local shadows the stdlib):

  python3 -I scripts/pdf-vectors.py extract <pdf> <out.json> [--page N]   (N is 1-based, default 1)
  python3 -I scripts/pdf-vectors.py query <out.json> x0 y0 x1 y1 [--texts] [--min-len N] [--touch] [--hv] [--limit N]
  python3 -I scripts/pdf-vectors.py texts <out.json> [regex] [-i] [--near x0 y0 x1 y1]
  python3 -I scripts/pdf-vectors.py frames <out.json> [--min-len N] [--top N] [--tol T]

Coordinates are DISPLAY coordinates: the page as a viewer shows it (/Rotate applied),
x to the right, y DOWN from the top-left corner, in PDF points.

extract JSON:
  {"page": {"width", "height", "rotate", "mediabox"},
   "colors": ["000000", ...],
   "segments": [[x0, y0, x1, y1, width, "s"|"f", colorIndex], ...],
   "texts": [{"s", "x", "y", "size", "font", "r", "w", ["u": 1 if possibly undecoded]}, ...],
   "stats": {...}}
Segment kind "s" = stroked (also used for B/b operators, which stroke and fill),
"f" = edge of a filled path.  "colorIndex" indexes "colors" (stroke colour for "s",
fill colour for "f").  Text "r" = baseline angle in degrees in display space (0 = reads
left-to-right, -90 = reads bottom-to-top, 90 = top-to-bottom), "w" = advance width of the string in display
points, "x","y" = baseline start of the string.
"""
import base64
import json
import math
import re
import sys
import time
import zlib

# --------------------------------------------------------------------------- lexer

WS = b"\x00\t\n\x0c\r "
_DELIM = rb"\x00\t\n\x0c\r ()<>\[\]{}/%"
TOKEN_RE = re.compile(
    rb"[\x00\t\n\x0c\r ]*(?:"
    rb"(%[^\r\n]*)"  # 1 comment
    rb"|([+-]?(?:\d+\.?\d*|\.\d+))(?=[" + _DELIM + rb"]|$)"  # 2 number
    rb"|(/[^" + _DELIM + rb"]*)"  # 3 name
    rb"|(<<|>>|\[|\]|\{|\})"  # 4 structure
    rb"|<([0-9A-Fa-f\x00\t\n\x0c\r ]*)>"  # 5 hex string
    rb"|(\()"  # 6 literal string start
    rb"|([^" + _DELIM + rb"]+)"  # 7 operator/keyword
    rb"|([)>])"  # 8 stray closer
    rb")"
)
STR_SPECIAL = re.compile(rb"[()\\]")
NAME_ESC = re.compile(rb"#([0-9A-Fa-f]{2})")
_ESC = {ord("n"): b"\n", ord("r"): b"\r", ord("t"): b"\t", ord("b"): b"\b", ord("f"): b"\f"}

NUM, NAME, STR, OP, STRUCT = 0, 1, 2, 3, 4


class Name(str):
    pass


class Ref:
    __slots__ = ("num", "gen")

    def __init__(self, num, gen):
        self.num = num
        self.gen = gen

    def __repr__(self):
        return "Ref(%d,%d)" % (self.num, self.gen)


class Lexer:
    __slots__ = ("data", "pos", "end")

    def __init__(self, data, pos=0):
        self.data = data
        self.pos = pos
        self.end = len(data)

    def scan(self):
        """Return (kind, value) or None at end of data."""
        data = self.data
        while True:
            m = TOKEN_RE.match(data, self.pos)
            if m is None:
                # only trailing whitespace (or garbage byte) remains
                rest = data[self.pos:self.pos + 64]
                if not rest.strip(WS):
                    self.pos = self.end
                    return None
                self.pos += 1  # skip an unlexable byte
                continue
            self.pos = m.end()
            g = m.lastindex
            if g is None:  # only whitespace matched
                if self.pos >= self.end:
                    return None
                self.pos += 1
                continue
            if g == 1:
                continue
            if g == 2:
                t = m.group(2)
                try:
                    return NUM, (float(t) if b"." in t else int(t))
                except ValueError:
                    return NUM, 0
            if g == 7:
                return OP, m.group(7).decode("latin-1")
            if g == 3:
                n = m.group(3)[1:]
                if b"#" in n:
                    n = NAME_ESC.sub(lambda mm: bytes([int(mm.group(1), 16)]), n)
                return NAME, Name(n.decode("latin-1"))
            if g == 4:
                return STRUCT, m.group(4).decode("latin-1")
            if g == 5:
                h = bytes(c for c in m.group(5) if c not in WS)
                if len(h) % 2:
                    h += b"0"
                return STR, bytes.fromhex(h.decode("ascii"))
            if g == 6:
                return STR, self._literal()
            if g == 8:
                continue  # stray closer, ignore

    def _literal(self):
        data = self.data
        pos = self.pos
        depth = 1
        out = []
        start = pos
        while True:
            m = STR_SPECIAL.search(data, pos)
            if m is None:  # unterminated
                out.append(data[start:])
                self.pos = self.end
                break
            i = m.start()
            c = data[i]
            if c == 0x28:  # (
                depth += 1
                pos = i + 1
            elif c == 0x29:  # )
                depth -= 1
                if depth == 0:
                    out.append(data[start:i])
                    self.pos = i + 1
                    break
                pos = i + 1
            else:  # backslash
                out.append(data[start:i])
                j = i + 1
                if j >= self.end:
                    self.pos = self.end
                    break
                e = data[j]
                if e in _ESC:
                    out.append(_ESC[e])
                    j += 1
                elif 0x30 <= e <= 0x37:
                    k = j
                    v = 0
                    while k < j + 3 and k < self.end and 0x30 <= data[k] <= 0x37:
                        v = v * 8 + data[k] - 0x30
                        k += 1
                    out.append(bytes([v & 0xFF]))
                    j = k
                elif e == 0x0D:
                    j += 1
                    if j < self.end and data[j] == 0x0A:
                        j += 1
                elif e == 0x0A:
                    j += 1
                else:
                    out.append(bytes([e]))
                    j += 1
                pos = j
                start = j
        return b"".join(out)


# --------------------------------------------------------------------------- PDF objects

OBJ_RE = re.compile(rb"(?<![0-9])(\d+)\s+(\d+)\s+obj\b")
ENDSTREAM_RE = re.compile(rb"\r?\n?endstream")


class Stream:
    def __init__(self, d, raw):
        self.d = d
        self.raw = raw


def parse_value(lx, depth=0):
    """Parse one PDF object value from the lexer (handles refs, arrays, dicts)."""
    t = lx.scan()
    if t is None:
        return None
    k, v = t
    if k == NUM:
        if isinstance(v, int) and v >= 0:
            save = lx.pos
            t2 = lx.scan()
            if t2 is not None and t2[0] == NUM and isinstance(t2[1], int):
                t3 = lx.scan()
                if t3 is not None and t3[0] == OP and t3[1] == "R":
                    return Ref(v, t2[1])
            lx.pos = save
        return v
    if k in (NAME, STR):
        return v
    if k == OP:
        if v == "true":
            return True
        if v == "false":
            return False
        if v == "null":
            return None
        return None
    if k == STRUCT:
        if depth > 40:
            return None
        if v == "[":
            arr = []
            while True:
                save = lx.pos
                t = lx.scan()
                if t is None or (t[0] == STRUCT and t[1] == "]"):
                    break
                lx.pos = save
                arr.append(parse_value(lx, depth + 1))
            return arr
        if v == "<<":
            d = {}
            while True:
                t = lx.scan()
                if t is None or (t[0] == STRUCT and t[1] == ">>"):
                    break
                if t[0] != NAME:
                    continue
                key = str(t[1])
                save = lx.pos
                t2 = lx.scan()
                if t2 is not None and t2[0] == STRUCT and t2[1] == ">>":
                    d[key] = None
                    break
                lx.pos = save
                d[key] = parse_value(lx, depth + 1)
            return d
    return None


class Pdf:
    def __init__(self, data):
        self.data = data
        self.offsets = {}
        for m in OBJ_RE.finditer(data):
            self.offsets[int(m.group(1))] = m.end()
        self.cache = {}
        self.objstm_loaded = False
        self.trailer = self._find_trailer()

    def _find_trailer(self):
        d = self.data
        tr = {}
        for m in re.finditer(rb"trailer", d):
            try:
                v = parse_value(Lexer(d, m.end()))
                if isinstance(v, dict):
                    tr.update({k: x for k, x in v.items() if k not in tr or k == "Root"})
            except Exception:
                pass
        return tr

    def get(self, num, _stack=()):
        if num in self.cache:
            return self.cache[num]
        off = self.offsets.get(num)
        if off is None:
            return None
        lx = Lexer(self.data, off)
        val = parse_value(lx)
        save = lx.pos
        t = lx.scan()
        if isinstance(val, dict) and t is not None and t[0] == OP and t[1] == "stream":
            pos = lx.pos
            data = self.data
            if data[pos:pos + 2] == b"\r\n":
                pos += 2
            elif data[pos:pos + 1] in (b"\n", b"\r"):
                pos += 1
            length = val.get("Length")
            if isinstance(length, Ref):
                if num in _stack:
                    length = None
                else:
                    length = self.get(length.num, _stack + (num,))
            raw = None
            if isinstance(length, int) and length >= 0 and pos + length <= len(data):
                tail = data[pos + length:pos + length + 20]
                if tail.lstrip(WS).startswith(b"endstream"):
                    raw = data[pos:pos + length]
            if raw is None:
                m = ENDSTREAM_RE.search(data, pos)
                raw = data[pos:m.start() if m else len(data)]
            val = Stream(val, raw)
        else:
            lx.pos = save
        self.cache[num] = val
        return val

    def res(self, x, depth=0):
        while isinstance(x, Ref) and depth < 20:
            x = self.get(x.num)
            depth += 1
        return x

    def decode(self, st):
        """Decode a Stream through its filters (Flate, ASCIIHex, ASCII85, LZW unsupported)."""
        d = st.d
        flt = self.res(d.get("Filter"))
        parms = self.res(d.get("DecodeParms"))
        if flt is None:
            return st.raw
        flts = flt if isinstance(flt, list) else [flt]
        parm_list = parms if isinstance(parms, list) else [parms] * len(flts)
        data = st.raw
        for i, f in enumerate(flts):
            f = str(self.res(f))
            p = self.res(parm_list[i]) if i < len(parm_list) else None
            if f in ("FlateDecode", "Fl"):
                try:
                    data = zlib.decompress(data)
                except zlib.error:
                    do = zlib.decompressobj()
                    try:
                        data = do.decompress(data)
                    except zlib.error:
                        data = b""
                data = _predictor(data, p)
            elif f in ("ASCIIHexDecode", "AHx"):
                h = re.sub(rb"[^0-9A-Fa-f]", b"", data.split(b">")[0])
                if len(h) % 2:
                    h += b"0"
                data = bytes.fromhex(h.decode())
            elif f in ("ASCII85Decode", "A85"):
                s = data.strip()
                if s.startswith(b"<~"):
                    s = s[2:]
                if s.endswith(b"~>"):
                    s = s[:-2]
                data = base64.a85decode(s, adobe=False, ignorechars=WS)
            else:
                raise ValueError("unsupported filter " + f)
        return data

    # page tree ----------------------------------------------------------
    def pages(self):
        """All leaf pages in document order, with inheritable attributes merged in."""
        root = self.res(self.trailer.get("Root"))
        pages = self.res(root.get("Pages")) if isinstance(root, dict) else None
        found = []
        seen = set()

        def walk(node, inherited, depth=0):
            node = self.res(node)
            if not isinstance(node, dict) or depth > 30 or id(node) in seen:
                return
            seen.add(id(node))
            inh = dict(inherited)
            for k in ("Resources", "MediaBox", "CropBox", "Rotate"):
                if k in node:
                    inh[k] = node[k]
            kids = self.res(node.get("Kids"))
            if node.get("Type") == "Pages" or isinstance(kids, list):
                for kid in kids or []:
                    walk(kid, inh, depth + 1)
            else:
                page = dict(inh)
                page.update(node)
                found.append(page)

        if pages is not None:
            walk(pages, {})
        if not found:  # fall back: any object that looks like a page
            for num in sorted(self.offsets):
                o = self.get(num)
                if isinstance(o, dict) and o.get("Type") == "Page":
                    found.append(o)
        return found

    def get_page(self, n=1):
        pg = self.pages()
        return pg[n - 1] if 1 <= n <= len(pg) else None

    def first_page(self):
        return self.get_page(1)


def _predictor(data, parms):
    if not isinstance(parms, dict):
        return data
    pred = parms.get("Predictor", 1)
    if not isinstance(pred, int) or pred < 10:
        return data
    cols = parms.get("Columns", 1)
    colors = parms.get("Colors", 1)
    bpc = parms.get("BitsPerComponent", 8)
    bpp = max(1, colors * bpc // 8)
    rowlen = (cols * colors * bpc + 7) // 8
    out = bytearray()
    prev = bytearray(rowlen)
    i = 0
    while i + rowlen + 1 <= len(data):
        ft = data[i]
        row = bytearray(data[i + 1:i + 1 + rowlen])
        i += rowlen + 1
        if ft == 1:
            for j in range(bpp, rowlen):
                row[j] = (row[j] + row[j - bpp]) & 255
        elif ft == 2:
            for j in range(rowlen):
                row[j] = (row[j] + prev[j]) & 255
        elif ft == 3:
            for j in range(rowlen):
                left = row[j - bpp] if j >= bpp else 0
                row[j] = (row[j] + (left + prev[j]) // 2) & 255
        elif ft == 4:
            for j in range(rowlen):
                a = row[j - bpp] if j >= bpp else 0
                b = prev[j]
                c = prev[j - bpp] if j >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                row[j] = (row[j] + pr) & 255
        out += row
        prev = row
    return bytes(out)


# --------------------------------------------------------------------------- fonts

_GLYPH = {
    "space": " ", "exclam": "!", "quotedbl": '"', "numbersign": "#", "dollar": "$",
    "percent": "%", "ampersand": "&", "quotesingle": "'", "parenleft": "(",
    "parenright": ")", "asterisk": "*", "plus": "+", "comma": ",", "hyphen": "-",
    "minus": "-", "period": ".", "slash": "/", "zero": "0", "one": "1", "two": "2",
    "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8",
    "nine": "9", "colon": ":", "semicolon": ";", "less": "<", "equal": "=",
    "greater": ">", "question": "?", "at": "@", "bracketleft": "[",
    "backslash": "\\", "bracketright": "]", "asciicircum": "^", "underscore": "_",
    "grave": "`", "braceleft": "{", "bar": "|", "braceright": "}", "asciitilde": "~",
    "degree": "°", "plusminus": "±", "multiply": "×", "bullet": "•",
    "quoteright": "’", "quoteleft": "‘", "quotedblleft": "“",
    "quotedblright": "”", "endash": "–", "emdash": "—",
    "fraction": "/", "nbspace": " ", "periodcentered": "·",
}


def glyph_to_char(name):
    if name in _GLYPH:
        return _GLYPH[name]
    if len(name) == 1:
        return name
    m = re.fullmatch(r"uni([0-9A-Fa-f]{4})", name)
    if m:
        return chr(int(m.group(1), 16))
    m = re.fullmatch(r"u([0-9A-Fa-f]{4,6})", name)
    if m:
        return chr(int(m.group(1), 16))
    return None


def parse_cmap(data):
    """Parse a ToUnicode CMap. Returns (map code->str, codespace byte length or None)."""
    lx = Lexer(data)
    cmap = {}
    nbytes = None
    stack = []
    mode = None
    while True:
        t = lx.scan()
        if t is None:
            break
        k, v = t
        if k == OP:
            if v == "beginbfchar":
                mode = "c"
                stack = []
            elif v == "beginbfrange":
                mode = "r"
                stack = []
            elif v == "begincodespacerange":
                mode = "s"
                stack = []
            elif v.startswith("end"):
                mode = None
                stack = []
            continue
        if mode is None:
            continue
        if k == STRUCT and v == "[":
            arr = []
            while True:
                t2 = lx.scan()
                if t2 is None or (t2[0] == STRUCT and t2[1] == "]"):
                    break
                if t2[0] == STR:
                    arr.append(t2[1])
            stack.append(arr)
        elif k == STR:
            stack.append(v)
        else:
            continue
        if mode == "c" and len(stack) == 2:
            src, dst = stack
            cmap[int.from_bytes(src, "big")] = _u16(dst)
            stack = []
        elif mode == "s" and len(stack) == 2:
            if nbytes is None:
                nbytes = len(stack[0])
            stack = []
        elif mode == "r" and len(stack) == 3:
            lo, hi, dst = stack
            a = int.from_bytes(lo, "big")
            b = int.from_bytes(hi, "big")
            if b - a > 70000:
                b = a + 70000
            if isinstance(dst, list):
                for i, d in enumerate(dst):
                    cmap[a + i] = _u16(d)
            elif dst:
                base = dst[:-1]
                last = dst[-1]
                for i in range(b - a + 1):
                    cmap[a + i] = _u16(base + bytes([(last + i) & 255]))
            stack = []
    return cmap, nbytes


def _u16(b):
    try:
        return b.decode("utf-16-be")
    except UnicodeDecodeError:
        return b.decode("latin-1")


class Font:
    def __init__(self, pdf, fd):
        self.name = ""
        self.type0 = False
        self.tounicode = None
        self.nbytes = 1
        self.widths = {}
        self.default_width = 0.0
        self.diff = {}
        self.codec = "latin-1"
        self.firstchar = 0
        self.has_enc_info = False
        self.subtype = ""
        try:
            self._load(pdf, fd)
        except Exception:
            pass

    def _load(self, pdf, fd):
        R = pdf.res
        fd = R(fd) or {}
        self.subtype = str(R(fd.get("Subtype")) or "")
        self.name = str(R(fd.get("BaseFont")) or "")
        tu = R(fd.get("ToUnicode"))
        if isinstance(tu, Stream):
            try:
                self.tounicode, nb = parse_cmap(pdf.decode(tu))
                if nb:
                    self.nbytes = nb
            except Exception:
                self.tounicode = None
        enc = R(fd.get("Encoding"))
        if self.subtype == "Type0":
            self.type0 = True
            if not (isinstance(tu, Stream) and self.tounicode is not None):
                self.nbytes = 2
            elif self.nbytes == 1:
                self.nbytes = 2 if str(enc).startswith("Identity") else 1
            desc = R(fd.get("DescendantFonts"))
            df = R(desc[0]) if isinstance(desc, list) and desc else {}
            dw = R(df.get("DW"))
            self.default_width = float(dw) if isinstance(dw, (int, float)) else 1000.0
            w = R(df.get("W"))
            if isinstance(w, list):
                self._parse_w(pdf, w)
        else:
            fc = R(fd.get("FirstChar"))
            ws = R(fd.get("Widths"))
            self.firstchar = fc if isinstance(fc, int) else 0
            if isinstance(ws, list):
                for i, x in enumerate(ws):
                    x = R(x)
                    if isinstance(x, (int, float)):
                        self.widths[self.firstchar + i] = float(x)
            mw = R((R(fd.get("FontDescriptor")) or {}).get("MissingWidth")) if isinstance(R(fd.get("FontDescriptor")), dict) else None
            self.default_width = float(mw) if isinstance(mw, (int, float)) else 0.0
            if isinstance(enc, Name) or isinstance(enc, str):
                if enc == "WinAnsiEncoding":
                    self.codec = "cp1252"
                elif enc == "MacRomanEncoding":
                    self.codec = "mac_roman"
                self.has_enc_info = True
            elif isinstance(enc, dict):
                be = R(enc.get("BaseEncoding"))
                if be == "WinAnsiEncoding":
                    self.codec = "cp1252"
                elif be == "MacRomanEncoding":
                    self.codec = "mac_roman"
                diffs = R(enc.get("Differences"))
                if isinstance(diffs, list):
                    code = 0
                    for x in diffs:
                        x = R(x)
                        if isinstance(x, int):
                            code = x
                        elif isinstance(x, str):
                            self.diff[code] = x
                            code += 1
                self.has_enc_info = True

    def _parse_w(self, pdf, w):
        i = 0
        w = [pdf.res(x) for x in w]
        while i < len(w):
            c = w[i]
            if i + 1 < len(w) and isinstance(w[i + 1], list):
                for j, x in enumerate(w[i + 1]):
                    x = pdf.res(x)
                    if isinstance(x, (int, float)):
                        self.widths[c + j] = float(x)
                i += 2
            elif i + 2 < len(w) and isinstance(c, int):
                c2, x = w[i + 1], w[i + 2]
                if isinstance(c2, int) and isinstance(x, (int, float)) and c2 - c < 70000:
                    for cc in range(c, c2 + 1):
                        self.widths[cc] = float(x)
                i += 3
            else:
                i += 1

    def decode(self, s):
        """Return (text, advances (1000-unit widths, per code), codes_len, undecoded?)."""
        nb = self.nbytes
        if nb > 1 and len(s) % nb:
            s = s + bytes(nb - len(s) % nb)
        codes = [int.from_bytes(s[i:i + nb], "big") for i in range(0, len(s), nb)]
        out = []
        adv = []
        bad = False
        tu = self.tounicode
        wd = self.widths
        dw = self.default_width
        for c in codes:
            adv.append((wd.get(c, dw), c == 32 and nb == 1))
            if tu is not None and c in tu:
                out.append(tu[c])
                continue
            if tu is not None:
                bad = True
            if self.type0:
                if tu is None:
                    bad = True
                out.append(chr(c) if 32 <= c < 0x110000 and c not in (0xFFFF,) else "?")
                continue
            g = self.diff.get(c)
            if g is not None:
                ch = glyph_to_char(g)
                if ch is None:
                    bad = True
                    ch = bytes([c & 255]).decode("latin-1")
                out.append(ch)
            else:
                try:
                    out.append(bytes([c & 255]).decode(self.codec))
                except UnicodeDecodeError:
                    out.append(bytes([c & 255]).decode("latin-1"))
        text = "".join(out)
        if tu is not None and any(0xF020 <= ord(ch) <= 0xF0FF for ch in text):
            # symbol-style TrueType subsets map ASCII to the private-use block U+F0xx
            text = "".join(chr(ord(ch) - 0xF000) if 0xF020 <= ord(ch) <= 0xF0FF else ch for ch in text)
        if tu is None and not self.type0 and not self.has_enc_info:
            # plain simple font without any encoding information: Latin-1 is a guess
            pass
        return text, adv, bad


# --------------------------------------------------------------------------- geometry

IDENT = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def mmul(m, n):
    """Row-vector convention (PDF): result = m x n (apply m first, then n)."""
    return (
        m[0] * n[0] + m[1] * n[2],
        m[0] * n[1] + m[1] * n[3],
        m[2] * n[0] + m[3] * n[2],
        m[2] * n[1] + m[3] * n[3],
        m[4] * n[0] + m[5] * n[2] + n[4],
        m[4] * n[1] + m[5] * n[3] + n[5],
    )


def display_matrix(box, rotate):
    """Affine matrix from PDF user space to display space (y down, rotation applied)."""
    x0, y0, x1, y1 = box
    W = x1 - x0
    H = y1 - y0
    r = rotate % 360
    if r == 0:
        return (1, 0, 0, -1, -x0, y1), W, H
    if r == 90:  # X = y - y0 ; Y = x - x0
        return (0, 1, 1, 0, -y0, -x0), H, W
    if r == 180:  # X = x1 - x ; Y = y - y0
        return (-1, 0, 0, 1, x1, -y0), W, H
    # 270: X = y1 - y ; Y = x1 - x
    return (0, -1, -1, 0, y1, x1), H, W


def cmyk_hex(c, m, y, k):
    r = (1 - min(1, c + k))
    g = (1 - min(1, m + k))
    b = (1 - min(1, y + k))
    return "%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def clamp255(v):
    return max(0, min(255, round(v * 255)))


class GState:
    __slots__ = ("ctm", "lw", "fill", "stroke", "font", "fname", "fsize", "tc", "tw", "th", "tl", "trise")

    def __init__(self):
        self.ctm = IDENT
        self.lw = 1.0
        self.fill = "000000"
        self.stroke = "000000"
        self.font = None
        self.fname = ""
        self.fsize = 0.0
        self.tc = 0.0
        self.tw = 0.0
        self.th = 1.0
        self.tl = 0.0
        self.trise = 0.0

    def copy(self):
        g = GState.__new__(GState)
        for s in GState.__slots__:
            setattr(g, s, getattr(self, s))
        return g


# --------------------------------------------------------------------------- interpreter

BEZ_STEPS = 4
NUMS = (int, float)


class Extractor:
    def __init__(self, pdf, disp, resources):
        self.pdf = pdf
        self.D = disp
        self.segments = []
        self.texts = []
        self.colors = []
        self.color_idx = {}
        self.stats = {"ops": {}, "errors": 0, "unknown_ops": {}, "zero_len_skipped": 0,
                      "clip_paths": 0, "forms": 0, "inline_images": 0,
                      "text_undecoded": 0, "error_samples": []}
        self.font_cache = {}
        self.gs = GState()
        self.gstack = []
        self.M = mmul(IDENT, disp)
        self.path = []  # list of [points, closed]
        self.cur = None
        self.sub = None
        # text object
        self.tm = IDENT
        self.tlm = IDENT
        self.res_stack = [resources]
        self.depth = 0

    # -- helpers
    def cidx(self, hexcol):
        i = self.color_idx.get(hexcol)
        if i is None:
            i = len(self.colors)
            self.colors.append(hexcol)
            self.color_idx[hexcol] = i
        return i

    def set_ctm(self, m):
        self.gs.ctm = m
        self.M = mmul(m, self.D)

    def get_font(self, name):
        key = (id(self.res_stack[-1]), name)
        f = self.font_cache.get(key)
        if f is not None:
            return f
        pdf = self.pdf
        res = pdf.res(self.res_stack[-1]) or {}
        fonts = pdf.res(res.get("Font")) or {}
        fd = fonts.get(name) if isinstance(fonts, dict) else None
        f = Font(pdf, fd) if fd is not None else Font(pdf, {})
        self.font_cache[key] = f
        return f

    # -- main loop
    def run(self, data):
        lx = Lexer(data)
        stack = []
        cur = stack
        cstack = []
        ops = self.stats["ops"]
        table = self.table()
        scan = lx.scan
        while True:
            try:
                t = scan()
            except Exception:
                self.stats["errors"] += 1
                lx.pos += 1
                continue
            if t is None:
                break
            k, v = t
            if k == OP:
                if cstack:  # operator inside an unterminated array/dict: recover
                    cstack.clear()
                    cur = stack
                    del stack[:]
                if v == "BI":
                    self.stats["inline_images"] += 1
                    self._skip_inline(lx)
                    del stack[:]
                    continue
                ops[v] = ops.get(v, 0) + 1
                fn = table.get(v)
                if fn is None:
                    un = self.stats["unknown_ops"]
                    un[v] = un.get(v, 0) + 1
                else:
                    try:
                        fn(stack)
                    except Exception as e:
                        self.stats["errors"] += 1
                        if len(self.stats["error_samples"]) < 10:
                            self.stats["error_samples"].append("%s: %r" % (v, e))
                del stack[:]
            elif k == STRUCT:
                if v == "[" or v == "<<":
                    new = []
                    cstack.append(cur)
                    cur = new
                elif v == "]" or v == ">>":
                    if cstack:
                        done = cur
                        cur = cstack.pop()
                        cur.append(done)
                # braces ignored
            else:
                cur.append(v)
        # flush any leftover state is not needed

    def _skip_inline(self, lx):
        # skip dictionary tokens until ID, then binary data until EI
        while True:
            t = lx.scan()
            if t is None:
                return
            if t[0] == OP and t[1] == "ID":
                break
        m = re.compile(rb"[\x00\t\n\x0c\r ]EI(?=[\x00\t\n\x0c\r ]|$)").search(lx.data, lx.pos)
        lx.pos = m.end() if m else lx.end

    def table(self):
        return {
            "m": self.op_m, "l": self.op_l, "c": self.op_c, "v": self.op_v, "y": self.op_y,
            "h": self.op_h, "re": self.op_re,
            "S": lambda a: self.paint(stroke=True), "s": lambda a: self.paint(stroke=True, close=True),
            "f": lambda a: self.paint(fill=True), "F": lambda a: self.paint(fill=True),
            "f*": lambda a: self.paint(fill=True),
            "B": lambda a: self.paint(stroke=True, fill=True),
            "B*": lambda a: self.paint(stroke=True, fill=True),
            "b": lambda a: self.paint(stroke=True, fill=True, close=True),
            "b*": lambda a: self.paint(stroke=True, fill=True, close=True),
            "n": self.op_n, "W": self.op_W, "W*": self.op_W,
            "q": self.op_q, "Q": self.op_Q, "cm": self.op_cm, "w": self.op_w,
            "g": self.op_g, "G": self.op_G, "rg": self.op_rg, "RG": self.op_RG,
            "k": self.op_k, "K": self.op_K,
            "sc": self.op_sc, "scn": self.op_sc, "SC": self.op_SC, "SCN": self.op_SC,
            "BT": self.op_BT, "ET": lambda a: None,
            "Tf": self.op_Tf, "Td": self.op_Td, "TD": self.op_TD, "TL": self.op_TL,
            "T*": self.op_Tstar, "Tm": self.op_Tm, "Tc": self.op_Tc, "Tw": self.op_Tw,
            "Tz": self.op_Tz, "Ts": self.op_Ts,
            "Tj": self.op_Tj, "TJ": self.op_TJ, "'": self.op_quote, '"': self.op_dquote,
            "Do": self.op_Do,
        }

    # -- path construction
    def tp(self, x, y):
        M = self.M
        return (M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5])

    def op_m(self, a):
        p = self.tp(a[0], a[1])
        self.sub = [[p], False]
        self.path.append(self.sub)
        self.cur = p
        self.start = p

    def _ensure_sub(self):
        if self.sub is None or self.sub[1]:
            # start a new subpath at the current point (after h, or no m)
            c = self.cur if self.cur is not None else (0.0, 0.0)
            self.sub = [[c], False]
            self.path.append(self.sub)
            if self.cur is None:
                self.start = c
            self.cur = c

    def op_l(self, a):
        self._ensure_sub()
        p = self.tp(a[0], a[1])
        self.sub[0].append(p)
        self.cur = p

    def _bez(self, p0, p1, p2, p3):
        pts = self.sub[0]
        for i in range(1, BEZ_STEPS + 1):
            t = i / BEZ_STEPS
            u = 1 - t
            b0, b1, b2, b3 = u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t
            pts.append((b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
                        b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1]))
        self.cur = p3

    def op_c(self, a):
        self._ensure_sub()
        self._bez(self.cur, self.tp(a[0], a[1]), self.tp(a[2], a[3]), self.tp(a[4], a[5]))

    def op_v(self, a):
        self._ensure_sub()
        self._bez(self.cur, self.cur, self.tp(a[0], a[1]), self.tp(a[2], a[3]))

    def op_y(self, a):
        self._ensure_sub()
        e = self.tp(a[2], a[3])
        self._bez(self.cur, self.tp(a[0], a[1]), e, e)

    def op_h(self, a):
        if self.sub is not None and not self.sub[1]:
            self.sub[1] = True
            self.cur = self.sub[0][0]

    def op_re(self, a):
        x, y, w, h = a[0], a[1], a[2], a[3]
        pts = [self.tp(x, y), self.tp(x + w, y), self.tp(x + w, y + h), self.tp(x, y + h)]
        self.sub = [pts, True]
        self.path.append(self.sub)
        self.cur = pts[0]

    def op_n(self, a):
        self.path = []
        self.sub = None
        self.cur = None

    def op_W(self, a):
        self.stats["clip_paths"] += 1

    def paint(self, stroke=False, fill=False, close=False):
        gs = self.gs
        if stroke:
            kind, col = "s", self.cidx(gs.stroke)
            M = self.M
            width = round(abs(gs.lw) * math.sqrt(abs(M[0] * M[3] - M[1] * M[2])), 3)
        else:
            kind, col = "f", self.cidx(gs.fill)
            width = 0
        segs = self.segments
        zl = 0
        for pts, closed in self.path:
            n = len(pts)
            if n < 2:
                continue
            closing = closed or close or not stroke  # fills implicitly close
            for i in range(n - 1):
                x0, y0 = pts[i]
                x1, y1 = pts[i + 1]
                if x0 == x1 and y0 == y1:
                    zl += 1
                    continue
                segs.append((round(x0, 3), round(y0, 3), round(x1, 3), round(y1, 3), width, kind, col))
            if closing and n > 2:
                x0, y0 = pts[-1]
                x1, y1 = pts[0]
                if not (x0 == x1 and y0 == y1):
                    segs.append((round(x0, 3), round(y0, 3), round(x1, 3), round(y1, 3), width, kind, col))
        self.stats["zero_len_skipped"] += zl
        self.path = []
        self.sub = None
        self.cur = None

    # -- graphics state
    def op_q(self, a):
        if len(self.gstack) < 256:
            self.gstack.append(self.gs.copy())

    def op_Q(self, a):
        if self.gstack:
            self.gs = self.gstack.pop()
            self.M = mmul(self.gs.ctm, self.D)

    def op_cm(self, a):
        m = tuple(float(x) for x in a[:6])
        if len(m) == 6:
            self.set_ctm(mmul(m, self.gs.ctm))

    def op_w(self, a):
        self.gs.lw = float(a[0])

    def op_g(self, a):
        v = clamp255(a[0])
        self.gs.fill = "%02x%02x%02x" % (v, v, v)

    def op_G(self, a):
        v = clamp255(a[0])
        self.gs.stroke = "%02x%02x%02x" % (v, v, v)

    def op_rg(self, a):
        self.gs.fill = "%02x%02x%02x" % (clamp255(a[0]), clamp255(a[1]), clamp255(a[2]))

    def op_RG(self, a):
        self.gs.stroke = "%02x%02x%02x" % (clamp255(a[0]), clamp255(a[1]), clamp255(a[2]))

    def op_k(self, a):
        self.gs.fill = cmyk_hex(*[float(x) for x in a[:4]])

    def op_K(self, a):
        self.gs.stroke = cmyk_hex(*[float(x) for x in a[:4]])

    @staticmethod
    def _comp(a):
        nums = [x for x in a if isinstance(x, NUMS)]
        if len(nums) == 1:
            v = clamp255(nums[0])
            return "%02x%02x%02x" % (v, v, v)
        if len(nums) == 3:
            return "%02x%02x%02x" % tuple(clamp255(x) for x in nums)
        if len(nums) == 4:
            return cmyk_hex(*[float(x) for x in nums])
        return None

    def op_sc(self, a):
        c = self._comp(a)
        if c:
            self.gs.fill = c

    def op_SC(self, a):
        c = self._comp(a)
        if c:
            self.gs.stroke = c

    # -- text
    def op_BT(self, a):
        self.tm = IDENT
        self.tlm = IDENT

    def op_Tf(self, a):
        self.gs.font = self.get_font(str(a[0]))
        self.gs.fname = str(a[0])
        self.gs.fsize = float(a[1])

    def op_Td(self, a):
        self.tlm = mmul((1, 0, 0, 1, float(a[0]), float(a[1])), self.tlm)
        self.tm = self.tlm

    def op_TD(self, a):
        self.gs.tl = -float(a[1])
        self.op_Td(a)

    def op_TL(self, a):
        self.gs.tl = float(a[0])

    def op_Tstar(self, a):
        self.op_Td((0, -self.gs.tl))

    def op_Tm(self, a):
        self.tm = tuple(float(x) for x in a[:6])
        self.tlm = self.tm

    def op_Tc(self, a):
        self.gs.tc = float(a[0])

    def op_Tw(self, a):
        self.gs.tw = float(a[0])

    def op_Tz(self, a):
        self.gs.th = float(a[0]) / 100.0

    def op_Ts(self, a):
        self.gs.trise = float(a[0])

    def op_quote(self, a):
        self.op_Tstar(None)
        self.show([a[0]])

    def op_dquote(self, a):
        self.gs.tw = float(a[0])
        self.gs.tc = float(a[1])
        self.op_Tstar(None)
        self.show([a[2]])

    def op_Tj(self, a):
        self.show([a[0]])

    def op_TJ(self, a):
        self.show(a[0])

    def show(self, items):
        gs = self.gs
        font = gs.font or Font(self.pdf, {})
        fs = gs.fsize
        th = gs.th
        # anchor and scale: text space -> display space
        T = mmul(self.tm, self.M)
        ax = T[4] + T[2] * gs.trise
        ay = T[5] + T[3] * gs.trise
        size = abs(fs) * math.sqrt(abs(T[0] * T[3] - T[1] * T[2]))
        # baseline direction in display space (x axis of text space)
        ang = math.degrees(math.atan2(T[1], T[0])) if (T[0] or T[1]) else 0.0
        out = []
        total = 0.0  # advance in text-space units (before Tm)
        bad = False
        for it in items:
            if isinstance(it, (bytes, bytearray)):
                text, adv, b = font.decode(bytes(it))
                bad = bad or b
                out.append(text)
                for w, is_space in adv:
                    tx = (w / 1000.0 * fs + gs.tc + (gs.tw if is_space else 0.0)) * th
                    total += tx
            elif isinstance(it, NUMS):
                tx = -it / 1000.0 * fs * th
                total += tx
                if it <= -250 and out and not out[-1].endswith(" "):
                    out.append(" ")
        s = "".join(out)
        # advance the text matrix
        self.tm = (self.tm[0], self.tm[1], self.tm[2], self.tm[3],
                   self.tm[4] + total * self.tm[0], self.tm[5] + total * self.tm[1])
        if not s.strip():
            return
        scale_x = math.hypot(T[0], T[1])
        item = {"s": s, "x": round(ax, 3), "y": round(ay, 3), "size": round(size, 3),
                "font": gs.fname, "r": round(ang, 2) + 0.0,
                "w": round(abs(total) * scale_x, 3)}
        if bad or (font.tounicode is None and (font.type0 or not font.has_enc_info)):
            # no ToUnicode and no usable encoding info: the Latin-1 reading is a guess
            if bad or font.type0:
                item["u"] = 1
                self.stats["text_undecoded"] += 1
        self.texts.append(item)

    # -- XObjects
    def op_Do(self, a):
        if self.depth >= 6:
            return
        pdf = self.pdf
        res = pdf.res(self.res_stack[-1]) or {}
        xo = pdf.res(res.get("XObject")) or {}
        obj = pdf.res(xo.get(str(a[0]))) if isinstance(xo, dict) else None
        if not isinstance(obj, Stream) or obj.d.get("Subtype") != "Form":
            return
        self.stats["forms"] += 1
        data = pdf.decode(obj)
        mat = pdf.res(obj.d.get("Matrix"))
        saved = (self.gs, self.gstack, self.M, self.tm, self.tlm, self.path, self.sub, self.cur)
        self.gs = self.gs.copy()
        self.gstack = []
        if isinstance(mat, list) and len(mat) == 6:
            self.set_ctm(mmul(tuple(float(pdf.res(x)) for x in mat), self.gs.ctm))
        self.res_stack.append(obj.d.get("Resources") or self.res_stack[-1])
        self.depth += 1
        try:
            self.run(data)
        finally:
            self.depth -= 1
            self.res_stack.pop()
            (self.gs, self.gstack, self.M, self.tm, self.tlm, self.path, self.sub, self.cur) = saved


# --------------------------------------------------------------------------- extract

def num_list(pdf, v, n):
    v = pdf.res(v)
    if isinstance(v, list) and len(v) >= n:
        out = [pdf.res(x) for x in v[:n]]
        if all(isinstance(x, NUMS) for x in out):
            return [float(x) for x in out]
    return None


def page_contents(pdf, page):
    c = pdf.res(page.get("Contents"))
    parts = []
    items = c if isinstance(c, list) else [c]
    for it in items:
        st = pdf.res(it)
        if isinstance(st, Stream):
            try:
                parts.append(pdf.decode(st))
            except Exception as e:
                sys.stderr.write("warning: could not decode a content stream: %r\n" % (e,))
    return b"\n".join(parts)


def cmd_extract(pdf_path, out_path, page_no=1):
    t0 = time.time()
    with open(pdf_path, "rb") as fh:
        data = fh.read()
    pdf = Pdf(data)
    pages = pdf.pages()
    if not pages:
        sys.exit("error: no page found")
    if not 1 <= page_no <= len(pages):
        sys.exit("error: --page %d out of range (document has %d page(s))" % (page_no, len(pages)))
    page = pages[page_no - 1]
    box = num_list(pdf, page.get("MediaBox"), 4) or [0, 0, 612, 792]
    box = [min(box[0], box[2]), min(box[1], box[3]), max(box[0], box[2]), max(box[1], box[3])]
    rot = pdf.res(page.get("Rotate"))
    rot = int(rot) if isinstance(rot, NUMS) else 0
    D, W, H = display_matrix(box, rot)
    content = page_contents(pdf, page)
    ex = Extractor(pdf, D, page.get("Resources"))
    try:
        ex.run(content)
    except Exception as e:  # never lose what we already have
        ex.stats["errors"] += 1
        ex.stats["error_samples"].append("fatal: %r" % (e,))
    st = ex.stats
    stats = {
        "content_bytes": len(content),
        "segments": len(ex.segments),
        "segments_stroked": sum(1 for s in ex.segments if s[5] == "s"),
        "segments_filled": sum(1 for s in ex.segments if s[5] == "f"),
        "texts": len(ex.texts),
        "texts_possibly_undecoded": st["text_undecoded"],
        "operator_counts": dict(sorted(st["ops"].items(), key=lambda kv: -kv[1])),
        "unknown_operators": st["unknown_ops"],
        "errors": st["errors"],
        "error_samples": st["error_samples"],
        "zero_length_skipped": st["zero_len_skipped"],
        "clip_paths": st["clip_paths"],
        "forms_expanded": st["forms"],
        "inline_images_skipped": st["inline_images"],
        "bezier_chord_steps": BEZ_STEPS,
        "extract_seconds": round(time.time() - t0, 2),
    }
    out = {
        "page": {"width": round(W, 3), "height": round(H, 3), "rotate": rot, "mediabox": box},
        "colors": ex.colors,
        "segments": [list(s) for s in ex.segments],
        "texts": ex.texts,
        "stats": stats,
    }
    with open(out_path, "w") as fh:
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False)
    print("page (display): %.1f x %.1f pt  (MediaBox %s, Rotate %d)" % (W, H, box, rot))
    print("segments: %d (stroked %d, filled %d)   texts: %d (possibly undecoded %d)   errors: %d"
          % (stats["segments"], stats["segments_stroked"], stats["segments_filled"],
             stats["texts"], stats["texts_possibly_undecoded"], stats["errors"]))
    print("elapsed: %.2fs   wrote %s" % (stats["extract_seconds"], out_path))


# --------------------------------------------------------------------------- query / texts / frames

def load(path):
    with open(path) as fh:
        return json.load(fh)


def cmd_query(argv):
    pos = []
    opts = {"texts": False, "min_len": 0.0, "touch": False, "hv": False, "limit": 0}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--texts":
            opts["texts"] = True
        elif a == "--touch":
            opts["touch"] = True
        elif a == "--hv":
            opts["hv"] = True
        elif a == "--min-len":
            i += 1
            opts["min_len"] = float(argv[i])
        elif a == "--limit":
            i += 1
            opts["limit"] = int(argv[i])
        else:
            pos.append(a)
        i += 1
    if len(pos) != 5:
        sys.exit("usage: query <out.json> x0 y0 x1 y1 [--texts] [--min-len N] [--touch] [--hv] [--limit N]")
    doc = load(pos[0])
    rx0, ry0, rx1, ry1 = [float(v) for v in pos[1:]]
    if rx0 > rx1:
        rx0, rx1 = rx1, rx0
    if ry0 > ry1:
        ry0, ry1 = ry1, ry0
    colors = doc.get("colors", [])
    sel = []
    for s in doc["segments"]:
        x0, y0, x1, y1 = s[0], s[1], s[2], s[3]
        L = math.hypot(x1 - x0, y1 - y0)
        if L < opts["min_len"]:
            continue
        if opts["hv"] and abs(x1 - x0) > 0.01 and abs(y1 - y0) > 0.01:
            continue
        if opts["touch"]:
            if max(x0, x1) < rx0 or min(x0, x1) > rx1 or max(y0, y1) < ry0 or min(y0, y1) > ry1:
                continue
        else:
            if not (rx0 <= x0 <= rx1 and rx0 <= x1 <= rx1 and ry0 <= y0 <= ry1 and ry0 <= y1 <= ry1):
                continue
        sel.append((min(y0, y1), min(x0, x1), s, L))
    sel.sort(key=lambda t: (round(t[0], 2), round(t[1], 2)))
    print("# region x %.1f..%.1f  y %.1f..%.1f  (display pts, y down)  segments: %d%s"
          % (rx0, rx1, ry0, ry1, len(sel), " (touching)" if opts["touch"] else " (fully inside)"))
    print("# x0 y0 x1 y1 len width kind color  [H/V/D]")
    shown = sel if not opts["limit"] else sel[:opts["limit"]]
    for _, _, s, L in shown:
        dx, dy = abs(s[2] - s[0]), abs(s[3] - s[1])
        o = "H" if dy <= 0.01 else ("V" if dx <= 0.01 else "D")
        col = colors[s[6]] if len(s) > 6 and s[6] < len(colors) else "-"
        print("%9.2f %9.2f %9.2f %9.2f %9.2f %6.3f %s %s %s" % (s[0], s[1], s[2], s[3], L, s[4], s[5], col, o))
    if opts["limit"] and len(sel) > opts["limit"]:
        print("# ... %d more (raise --limit)" % (len(sel) - opts["limit"]))
    if opts["texts"]:
        ts = [t for t in doc["texts"] if rx0 <= t["x"] <= rx1 and ry0 <= t["y"] <= ry1]
        ts.sort(key=lambda t: (round(t["y"], 1), t["x"]))
        print("# texts: %d" % len(ts))
        for t in ts:
            print_text(t)


def print_text(t):
    print("%9.2f %9.2f  size %-6.2f r %-6.1f %-5s %s%s" % (
        t["x"], t["y"], t["size"], t.get("r", 0), t.get("font", ""), repr(t["s"]),
        "  [undecoded?]" if t.get("u") else ""))


def cmd_texts(argv):
    pat = None
    flags = 0
    near = None
    pos = []
    i = 0
    while i < len(argv):
        if argv[i] == "-i":
            flags |= re.I
        elif argv[i] == "--near":
            near = [float(v) for v in argv[i + 1:i + 5]]
            i += 4
        else:
            pos.append(argv[i])
        i += 1
    if not pos:
        sys.exit("usage: texts <out.json> [regex] [-i] [--near x0 y0 x1 y1]")
    doc = load(pos[0])
    if len(pos) > 1:
        pat = re.compile(pos[1], flags)
    n = 0
    for t in sorted(doc["texts"], key=lambda t: (round(t["y"], 1), t["x"])):
        if pat and not pat.search(t["s"]):
            continue
        if near and not (near[0] <= t["x"] <= near[2] and near[1] <= t["y"] <= near[3]):
            continue
        print_text(t)
        n += 1
    print("# %d texts" % n)


def merge_lines(items, tol):
    """items: (key, a, b) with a<=b; merge collinear overlapping/abutting ranges."""
    items.sort()
    out = []
    for k, a, b in items:
        if out and abs(out[-1][0] - k) <= tol and a <= out[-1][2] + tol:
            if b > out[-1][2]:
                out[-1][2] = b
        else:
            out.append([k, a, b])
    return out


def cmd_frames(argv):
    min_len, top, tol = 300.0, 10, 2.0
    pos = []
    i = 0
    while i < len(argv):
        if argv[i] == "--min-len":
            i += 1
            min_len = float(argv[i])
        elif argv[i] == "--top":
            i += 1
            top = int(argv[i])
        elif argv[i] == "--tol":
            i += 1
            tol = float(argv[i])
        else:
            pos.append(argv[i])
        i += 1
    doc = load(pos[0])
    hs, vs = [], []
    for s in doc["segments"]:
        x0, y0, x1, y1 = s[:4]
        if abs(y1 - y0) <= 0.05 and abs(x1 - x0) >= min_len:
            hs.append((round(y0, 1), min(x0, x1), max(x0, x1)))
        elif abs(x1 - x0) <= 0.05 and abs(y1 - y0) >= min_len:
            vs.append((round(x0, 1), min(y0, y1), max(y0, y1)))
    H = merge_lines(hs, tol)
    V = merge_lines(vs, tol)
    print("# long horizontals: %d, long verticals: %d (merged, min-len %.0f)" % (len(H), len(V), min_len))
    rects = []
    for i, (y1, ha, hb) in enumerate(H):
        for (y2, ca, cb) in H[i + 1:]:
            if y2 - y1 < min_len:
                continue
            lo, hi = max(ha, ca), min(hb, cb)
            if hi - lo < min_len:
                continue
            cand = sorted(x for (x, va, vb) in V
                          if va <= y1 + tol and vb >= y2 - tol and lo - tol <= x <= hi + tol)
            if len(cand) >= 2 and cand[-1] - cand[0] >= min_len:
                rects.append(((cand[-1] - cand[0]) * (y2 - y1), cand[0], y1, cand[-1], y2))
    rects.sort(reverse=True)
    kept = []
    for r in rects:
        if any(abs(r[1] - k[1]) < 5 and abs(r[2] - k[2]) < 5 and abs(r[3] - k[3]) < 5 and abs(r[4] - k[4]) < 5
               for k in kept):
            continue
        kept.append(r)
        if len(kept) >= top:
            break
    print("# largest rectangles from long H/V segments: x0 y0 x1 y1  (w x h, area)")
    for a, x0, y0, x1, y1 in kept:
        print("%9.1f %9.1f %9.1f %9.1f   %8.1f x %-8.1f area %.0f" % (x0, y0, x1, y1, x1 - x0, y1 - y0, a))
    if not kept:
        print("# none")


def main(argv):
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0
    cmd = argv[1]
    try:
        if cmd == "extract":
            args = argv[2:]
            page_no = 1
            if "--page" in args:
                i = args.index("--page")
                try:
                    page_no = int(args[i + 1])
                except (IndexError, ValueError):
                    sys.exit("usage: extract <pdf> <out.json> [--page N]")
                del args[i:i + 2]
            if len(args) != 2:
                sys.exit("usage: extract <pdf> <out.json> [--page N]")
            cmd_extract(args[0], args[1], page_no)
        elif cmd == "query":
            cmd_query(argv[2:])
        elif cmd == "texts":
            cmd_texts(argv[2:])
        elif cmd == "frames":
            cmd_frames(argv[2:])
        else:
            sys.exit("unknown command %r (extract|query|texts|frames)" % cmd)
    except BrokenPipeError:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
