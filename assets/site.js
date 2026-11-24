/* The River Golf Club, concept redesign. Plain script, no build step. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('motion-ok');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four'];
  var fmt = function (n) { return n.toLocaleString('en-US'); };

  /* ---------- Nav ---------- */
  var nav = $('[data-nav]');
  var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menuBtn = $('[data-menu-btn]'), menu = $('[data-menu]');
  var setMenu = function (open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    $('#main').inert = open; $('.foot').inert = open;
    if (open) { var first = $('a', menu); if (first) first.focus(); }
  };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  $$('.menu__links > *', menu).forEach(function (a, k) { a.style.setProperty('--i', k); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 1240 && !menu.hidden) setMenu(false); });

  /* ---------- First screen: the panorama, framed on the clubhouse ---------- */
  var hero = $('.hero'), pano = $('[data-pano]'), inner = $('[data-pano-inner]'), panoImg = $('.pano__img');
  var RATIO = 2560 / 860, FX = 0.56, FY = 0.5;
  var sizePano = function () {
    var w = pano.clientWidth, h = pano.clientHeight;
    if (!w || !h) return;
    var iw, ih;
    if (w / h > RATIO) { iw = w; ih = w / RATIO; } else { ih = h; iw = h * RATIO; }
    var A = 0.33, B = 0.965, left;
    if (w / iw >= B - A) left = w / 2 - ((A + B) / 2) * iw; else left = w - B * iw;
    left = Math.min(0, Math.max(w - iw, left));
    var top = Math.min(0, Math.max(h - ih, h / 2 - FY * ih));
    inner.style.cssText = 'width:' + iw + 'px;height:' + ih + 'px;left:' + left + 'px;top:' + top + 'px;transform:none';
    inner.setAttribute('data-sized', '');
    $$('[data-pin]', inner).forEach(function (pin) {
      pin.classList.remove('is-off');
      var r = pin.getBoundingClientRect(), pr = pano.getBoundingClientRect();
      var off = r.left < pr.left + 12 || r.right > pr.right - 12 || r.top < pr.top + 8 || r.bottom > pr.bottom - 8;
      pin.classList.toggle('is-off', off);
    });
  };
  sizePano();
  window.addEventListener('resize', sizePano);
  if ('ResizeObserver' in window) new ResizeObserver(sizePano).observe(pano);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizePano);
  var enter = function () { requestAnimationFrame(function () { hero.classList.add('is-in'); }); };
  // One control pauses every loop on the page (the drift, the river, the slow photo settle, the live dots)
  var calm = $('[data-calm]');
  if (calm && !reduce) {
    calm.hidden = false;
    var setCalm = function (on) {
      document.documentElement.classList.toggle('motion-paused', on);
      calm.setAttribute('aria-pressed', String(on));
      try { localStorage.setItem('river-calm', on ? '1' : '0'); } catch (e) {}
    };
    var saved = null; try { saved = localStorage.getItem('river-calm'); } catch (e) {}
    setCalm(saved === '1');
    calm.addEventListener('click', function () { setCalm(calm.getAttribute('aria-pressed') !== 'true'); });
  }
  // Loops rest while their section is off screen
  if ('IntersectionObserver' in window) {
    var idle = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-idle', !e.isIntersecting); }); });
    [hero, $('#course')].forEach(function (s) { if (s) idle.observe(s); });
  }
  if (reduce) hero.classList.add('is-in');
  else if (panoImg.complete) enter();
  else { panoImg.addEventListener('load', enter, { once: true }); setTimeout(enter, 1200); }

  /* ---------- Live hours (the club keeps Eastern time) ---------- */
  var HOURS = {
    club: { wk: [450, 1080], we: [420, 1080] },   // Mon-Thu 7:30-6:00, Fri-Sun 7:00-6:00
    grill: { wk: [480, 1020], we: [420, 1050] }   // Mon-Thu 8:00-5:00, Fri-Sun 7:00-5:30
  };
  var nowET = function () {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[o.weekday], min: (+o.hour % 24) * 60 + (+o.minute), y: +o.year, m: +o.month, d: +o.day };
  };
  var span = function (place, day) { return HOURS[place][(day >= 1 && day <= 4) ? 'wk' : 'we']; };
  var clock = function (m) {
    var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  };
  var status = function (place) {
    var t = nowET(), s = span(place, t.day);
    if (t.min >= s[0] && t.min < s[1]) return { open: true, short: (place === 'grill' ? 'serving until ' : 'open until ') + clock(s[1]), long: 'Open now, serving until ' + clock(s[1]) };
    if (t.min < s[0]) return { open: false, short: 'opens at ' + clock(s[0]), long: 'Closed now, opens today at ' + clock(s[0]) };
    var n = span(place, (t.day + 1) % 7);
    return { open: false, short: 'opens at ' + clock(n[0]) + ' tomorrow', long: 'Closed now, opens tomorrow at ' + clock(n[0]) };
  };
  var paintHours = function () {
    ['club', 'grill'].forEach(function (place) {
      var st = status(place);
      $$('[data-status="' + place + '"]').forEach(function (el) { el.textContent = st.short; });
      if (place === 'grill') $$('[data-status="grill-long"]').forEach(function (el) { el.textContent = st.long; });
      $$('[data-status-dot="' + place + '"]').forEach(function (el) { el.classList.toggle('is-open', st.open); });
    });
    var today = nowET().day;
    $$('[data-hours] tr').forEach(function (tr) {
      tr.classList.toggle('is-today', tr.getAttribute('data-days').split(',').indexOf(String(today)) > -1);
    });
  };
  paintHours();
  setInterval(paintHours, 60000);

  /* ---------- The yardage book ---------- */
  // From the club's scorecard: yards to the center of the green from Black, Blue, White, Gold, Green.
  var TEES = ['black', 'blue', 'white', 'gold', 'green'];
  var TEE_COLOR = { black: '#16171a', blue: '#2a63b4', white: '#f7f6f2', gold: '#c9a043', green: '#3f8a58' };
  var RATING = {
    black: 'Rating 73.1, slope 137', blue: 'Rating 71.2, slope 134', white: 'Rating 69.4, slope 129',
    gold: 'Rating 68.0, slope 124 (ladies 73.2, 137)', green: 'Rating 64.4, slope 118 (ladies 69.3, 122)'
  };
  var HOLES = [
    { par: 4, hcp: 14, y: [394, 380, 358, 340, 320] },
    { par: 5, hcp: 2, y: [563, 536, 503, 465, 435], note: 'Out of bounds: the fence along the left.' },
    { par: 4, hcp: 6, y: [406, 381, 369, 305, 285], note: 'A drop area is in play on this hole.' },
    { par: 3, hcp: 18, y: [159, 142, 115, 105, 96] },
    { par: 4, hcp: 10, y: [388, 373, 351, 333, 325] },
    { par: 4, hcp: 4, y: [418, 357, 342, 325, 234], note: 'A drop area is in play; the fence behind the green is out of bounds.' },
    { par: 3, hcp: 12, y: [200, 185, 169, 153, 140] },
    { par: 4, hcp: 8, y: [427, 387, 372, 346, 300] },
    { par: 5, hcp: 16, y: [487, 464, 450, 425, 345] },
    { par: 4, hcp: 5, y: [444, 391, 372, 362, 343] },
    { par: 4, hcp: 11, y: [391, 375, 353, 320, 269] },
    { par: 4, hcp: 9, y: [406, 385, 370, 350, 303] },
    { par: 3, hcp: 13, y: [206, 186, 165, 140, 107] },
    { par: 4, hcp: 7, y: [408, 390, 375, 360, 316] },
    { par: 4, hcp: 1, y: [461, 431, 403, 392, 380], note: 'The hardest hole on the card, and a drop area is in play.' },
    { par: 4, hcp: 17, y: [334, 324, 315, 305, 295] },
    { par: 3, hcp: 15, y: [154, 142, 128, 122, 110], note: 'A drop area is in play on this hole.' },
    { par: 5, hcp: 3, y: [601, 551, 530, 499, 478], note: 'The longest hole, home along the lake to the clubhouse.' }
  ];
  // Routing traced from the club's own course map (2000 x 972 frame).
  var ROUTE = [
    [[1060, 288], [1318, 274]], [[1430, 142], [1772, 128]], [[1628, 246], [1428, 228]], [[1440, 318], [1342, 322]],
    [[1336, 374], [1600, 370]], [[1716, 440], [1700, 668]], [[1636, 690], [1420, 680]], [[1232, 602], [1636, 592]],
    [[1548, 452], [1150, 506]], [[988, 468], [646, 428]], [[612, 512], [940, 552]], [[958, 640], [612, 668]],
    [[488, 682], [246, 656]], [[196, 600], [588, 586]], [[540, 528], [150, 472]], [[176, 412], [222, 210]],
    [[268, 186], [432, 318]], [[470, 218], [852, 262]]
  ];
  var LAKES = [
    'M292 202 C340 192 392 196 414 214 C424 238 430 258 462 266 C540 282 640 276 760 272 C812 274 836 292 880 300 C960 312 1080 316 1180 304 C1240 300 1288 308 1318 330 C1340 362 1336 420 1316 452 C1290 478 1230 488 1150 486 C1080 482 1030 458 998 424 C972 396 940 382 880 376 C800 372 700 372 640 376 C600 382 584 404 574 436 C566 470 548 500 522 500 C496 500 476 476 446 452 C422 432 410 404 392 404 C368 408 344 446 306 444 C286 440 282 406 284 370 C286 320 284 250 292 202 Z',
    'M1786 100 C1800 150 1806 200 1838 262 C1860 330 1846 410 1806 480 C1786 520 1772 556 1756 560 C1740 540 1742 470 1740 430 C1734 404 1712 392 1680 394 C1640 398 1622 392 1620 382 C1626 368 1660 362 1700 360 C1724 330 1740 290 1762 250 C1774 200 1774 150 1786 100 Z',
    'M1362 532 C1400 520 1450 516 1500 494 C1540 476 1580 466 1604 474 C1618 492 1600 520 1562 540 C1520 558 1460 564 1406 560 C1376 556 1356 546 1362 532 Z',
    'M1666 676 C1680 664 1704 666 1712 680 C1714 696 1696 704 1678 700 C1664 696 1660 686 1666 676 Z'
  ];
  var ISLAND = 'M412 286 C426 270 452 274 462 292 C470 314 466 342 446 352 C426 358 410 340 408 318 C406 304 406 294 412 286 Z';
  var RIVER = 'M110 796 C300 774 520 768 800 788 C1000 800 1180 792 1400 772 C1600 756 1760 760 1872 800 L1862 858 C1740 818 1580 816 1400 826 C1180 842 980 842 800 836 C560 820 330 818 130 852 Z';
  var RANGE = 'M1040 176 C1100 160 1250 158 1316 176 C1336 200 1330 236 1304 248 C1230 260 1110 262 1050 248 C1026 230 1024 196 1040 176 Z';

  var book = $('[data-book]');
  if (book) {
    var maps = $$('[data-map]', book);
    var state = { hole: 0, tee: 'black' };
    var mk = function (tag, attrs, parent) {
      var el = document.createElementNS(SVGNS, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(el);
      return el;
    };
    // Each map draws the course traced from the club's own map: the full routing on wide screens,
    // and on phones the front nine and the back nine as two pages, so all eighteen stay readable
    var buildMap = function (map) {
      var mode = map.getAttribute('data-map');
      mk('path', { d: RIVER, class: 'river' }, map);
      mk('path', { d: 'M120 822 C300 800 520 794 800 812 C1000 822 1180 818 1400 800 C1600 786 1760 790 1866 828', class: 'current' }, map);
      mk('path', { d: 'M150 838 C320 816 540 810 800 828 C1000 836 1180 832 1400 816 C1600 802 1750 804 1850 842', class: 'current' }, map);
      LAKES.forEach(function (d) { mk('path', { d: d, class: 'lake' }, map); });
      mk('path', { d: ISLAND, class: 'island' }, map);
      if (mode !== 'back') mk('path', { d: RANGE, class: 'range' }, map);
      var lbl = function (x, y, text, cls, anchor) { var t = mk('text', { x: x, y: y, class: 'lbl ' + (cls || ''), 'text-anchor': anchor || 'middle' }, map); t.textContent = text; return t; };
      lbl(mode === 'front' ? 1450 : mode === 'back' ? 548 : 980, 828, 'SAVANNAH RIVER', 'lbl--river');
      if (mode === 'back') { lbl(112, 762, 'SOUTH CAROLINA', 'lbl--state', 'start'); lbl(124, 886, 'GEORGIA', 'lbl--state', 'start'); }
      else { lbl(1870, 762, 'SOUTH CAROLINA', 'lbl--state', 'end'); lbl(1858, 886, 'GEORGIA', 'lbl--state', 'end'); }
      if (mode !== 'back') lbl(1178, 222, 'Range');
      if (mode !== 'front') {
        mk('rect', { x: 936, y: 248, width: 26, height: 22, class: 'house' }, map);
        mk('path', { d: 'M932 250 L949 236 L966 250 Z', class: 'house' }, map);
        lbl(918, 318, 'Clubhouse');
      }
      var gs = ROUTE.map(function (r, i) {
        if ((mode === 'front' && i > 8) || (mode === 'back' && i < 9)) return null;
        var t = r[0], g = r[1], par3 = HOLES[i].par === 3;
        var w = par3 ? 24 : 34;
        var G = mk('g', { class: 'h', style: '--i:' + i }, map);
        mk('line', { x1: t[0], y1: t[1], x2: g[0], y2: g[1], 'stroke-width': w + 5, class: 'h__edge', pathLength: 1 }, G);
        mk('line', { x1: t[0], y1: t[1], x2: g[0], y2: g[1], 'stroke-width': w, class: 'h__fill', pathLength: 1 }, G);
        mk('line', { x1: t[0], y1: t[1], x2: g[0], y2: g[1], 'stroke-width': w, class: 'h__draw', pathLength: 1 }, G);
        mk('circle', { cx: g[0], cy: g[1], r: par3 ? 17 : 20, class: 'h__green' }, G);
        var flag = mk('g', { class: 'h__flag' }, G);
        mk('line', { x1: g[0], y1: g[1], x2: g[0], y2: g[1] - 52 }, flag);
        mk('path', { d: 'M' + g[0] + ' ' + (g[1] - 52) + ' l26 9 l-26 9 Z' }, flag);
        mk('circle', { cx: t[0], cy: t[1], r: 29, class: 'h__tag' }, G);
        var num = mk('text', { x: t[0], y: t[1] + 1, class: 'h__num' }, G);
        num.textContent = i + 1;
        G.addEventListener('click', function () { go(i, true, 'map'); });
        return G;
      });
      // The fairways trace in playing order the first time this map comes into view
      if (!reduce && 'IntersectionObserver' in window) {
        map.classList.add('pre');
        var tio = new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting) return;
          tio.disconnect();
          map.classList.remove('pre'); map.classList.add('tracing');
          setTimeout(function () { map.classList.remove('tracing'); }, 18 * 70 + 760);
        }, { threshold: 0.35 });
        tio.observe(map);
      }
      return gs;
    };
    var groupSets = maps.map(buildMap);

    // Scorecard: the hole numbers become buttons
    var holeBtns = [], cols = [];
    $$('.card', book).forEach(function (table, ti) {
      var heads = $$('thead td', table);
      heads.forEach(function (td, ci) {
        var i = ti * 9 + ci;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'card__hole'; b.textContent = td.textContent;
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', 'Hole ' + (i + 1));
        b.addEventListener('click', function () { go(i, true); });
        var sp = document.createElement('span'); sp.className = 'card__n'; sp.textContent = td.textContent; sp.setAttribute('aria-hidden', 'true');
        td.textContent = ''; td.appendChild(b); td.appendChild(sp);
        holeBtns[i] = b;
        cols[i] = $$('tr', table).map(function (tr) { return tr.children[ci + 1]; });
      });
    });
    var ydsRows = $$('.card__yds', book);
    // Phone picker: nineteen 44px buttons
    var pick = $('[data-holepick]', book), pickBtns = [];
    for (var k = 0; k < 19; k++) (function (i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'hp'; b.textContent = i + 1;
      b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', i === 18 ? 'Hole 19, the extra hole' : 'Hole ' + (i + 1));
      b.addEventListener('click', function () { go(i, true, 'pick'); });
      pick.appendChild(b); pickBtns.push(b);
    })(k);

    var imgA = $('[data-hole-img="a"]', book), imgB = $('[data-hole-img="b"]', book), front = imgA;
    var el = {
      num: $('[data-hole-num]', book), par: $('[data-hole-par]', book), yds: $('[data-hole-yds]', book),
      from: $('[data-hole-from]', book), tees: $('[data-hole-tees]', book), note: $('[data-hole-note]', book),
      count: $('[data-hole-count]', book), prev: $('[data-hole-prev]', book), next: $('[data-hole-next]', book),
      h19: $('[data-hole-19]', book), total: $('[data-total-yds]', book), rating: $('[data-rating]', book),
      facts: $('.hole__facts', book), live: $('[data-hole-live]', book)
    };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    imgA.classList.add('kb');
    var showPhoto = function (src, srcset, alt) {
      var back = front === imgA ? imgB : imgA;
      var swap = function () {
        back.classList.add('is-on'); front.classList.remove('is-on');
        back.classList.remove('kb'); void back.offsetWidth; back.classList.add('kb');
        back.removeAttribute('aria-hidden'); front.setAttribute('aria-hidden', 'true'); front = back;
      };
      back.alt = alt;
      if (back.getAttribute('src') === src) { swap(); return; }
      back.classList.remove('is-on');
      back.onload = null;
      back.srcset = srcset; back.src = src;
      if (back.decode) back.decode().then(swap, swap); else back.onload = swap;
    };
    var tween = function (node, to) {
      var from = parseInt(node.textContent.replace(/,/g, ''), 10);
      if (reduce || isNaN(from) || from === to) { node.textContent = fmt(to); return; }
      var t0 = performance.now(), dur = 380;
      var step = function (t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        node.textContent = fmt(Math.round(from + (to - from) * e));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    var teeIndex = function () { return TEES.indexOf(state.tee); };

    var paintTee = function () {
      var ti = teeIndex();
      var front9 = 0, back9 = 0;
      HOLES.forEach(function (h, i) { if (i < 9) front9 += h.y[ti]; else back9 += h.y[ti]; });
      ydsRows.forEach(function (row, r) {
        var cells = $$('td', row);
        cells.forEach(function (td, c) {
          if (c < 9) td.textContent = HOLES[r * 9 + c].y[ti];
          else td.textContent = r === 0 ? front9 : back9;
        });
      });
      tween(el.total, front9 + back9);
      el.rating.textContent = RATING[state.tee];
    };

    var go = function (i, user, from) {
      state.hole = i;
      var is19 = i === 18;
      groupSets.forEach(function (gs) { gs.forEach(function (g, gi) { if (g) g.classList.toggle('is-on', gi === i); }); });
      // On a phone the card sits below the maps: bring it into view when a hole is chosen up there
      if (from && window.innerWidth < 700) {
        var card = $('.hole__photo', book), cr = card.getBoundingClientRect();
        if (cr.top < 72 || cr.bottom > window.innerHeight) card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
      holeBtns.forEach(function (b, bi) { b.setAttribute('aria-pressed', String(bi === i)); });
      pickBtns.forEach(function (b, bi) { b.setAttribute('aria-pressed', String(bi === i)); });
      cols.forEach(function (cells, ci) { cells.forEach(function (c) { if (c) c.classList.toggle('is-col', ci === i); }); });
      el.h19.setAttribute('aria-pressed', String(is19));
      var n = i + 1;
      if (is19) {
        showPhoto('assets/img/holes/hole-19-night-760.webp', 'assets/img/holes/hole-19-night-760.webp 760w, assets/img/holes/hole-19-night.webp 1280w', 'Hole 19 at night: the green on the lake, lit, with lights along its boardwalk');
        el.num.textContent = '19';
        el.par.textContent = 'The extra hole';
        el.yds.parentNode.hidden = true;
        el.from.textContent = 'On the lake, lit after dark';
        el.tees.hidden = true;
        el.note.textContent = '';
        el.count.textContent = 'The 19th';
        if (user) el.live.textContent = 'Hole 19, the extra hole, on the lake.';
        el.prev.disabled = false; el.next.disabled = true;
        return;
      }
      el.yds.parentNode.hidden = false;
      el.tees.hidden = false;
      var h = HOLES[i], ti = teeIndex();
      showPhoto('assets/img/holes/hole-' + pad(n) + '-760.webp', 'assets/img/holes/hole-' + pad(n) + '-760.webp 760w, assets/img/holes/hole-' + pad(n) + '.webp 1400w', 'Hole ' + n + ' at The River');
      el.num.textContent = n;
      el.par.innerHTML = 'Par ' + h.par + ' <span class="sep">·</span> Handicap ' + h.hcp;
      if (user) tween(el.yds, h.y[ti]); else el.yds.textContent = h.y[ti];
      el.from.textContent = 'from the ' + state.tee + ' tees';
      el.tees.innerHTML = TEES.map(function (t, k) {
        return '<li' + (k === ti ? ' class="is-on"' : '') + '><span class="tee__dot" style="--tee:' + TEE_COLOR[t] + '"></span>' + h.y[k] + '<span class="sr"> yards from the ' + t + ' tees</span></li>';
      }).join('');
      el.note.textContent = h.note || '';
      el.count.textContent = 'Hole ' + n + ' of 18';
      if (user) el.live.textContent = 'Hole ' + n + '. Par ' + h.par + ', handicap ' + h.hcp + '. ' + h.y[ti] + ' yards from the ' + state.tee + ' tees.';
      el.prev.disabled = i === 0; el.next.disabled = false;
      // Warm the next photograph so it is decoded before the visitor asks for it
      if (n < 18) { var pre = new Image(); pre.src = 'assets/img/holes/hole-' + pad(n + 1) + '-760.webp'; }
    };

    var readTee = function () {
      var c = $('input[name="tee"]:checked', book);
      state.tee = c ? c.value : 'black';
      paintTee();
      go(state.hole, true);
    };
    $$('input[name="tee"]', book).forEach(function (r) { r.addEventListener('change', readTee); });
    el.prev.addEventListener('click', function () { if (state.hole > 0) go(state.hole - 1, true); });
    el.next.addEventListener('click', function () { if (state.hole < 18) go(state.hole + 1, true); });
    el.h19.addEventListener('click', function () { go(18, true); });
    book.addEventListener('keydown', function (e) {
      if (e.target.matches('input')) return;
      if (e.key === 'ArrowRight' && state.hole < 18) { go(state.hole + 1, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft' && state.hole > 0) { go(state.hole - 1, true); e.preventDefault(); }
    });
    readTee();
    window.addEventListener('pageshow', readTee);
  }

  /* ---------- Membership form: writes the email, the visitor sends it ---------- */
  $$('[data-form]').forEach(function (form) {
    var done = $('[data-form-done]', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      [['name', 'm-name'], ['email', 'm-email']].forEach(function (f) {
        var input = form.elements[f[0]], err = $('#' + f[1] + '-err');
        var bad = !input.value.trim() || (f[0] === 'email' && !/^\S+@\S+\.\S+$/.test(input.value.trim()));
        input.setAttribute('aria-invalid', String(bad));
        if (bad) input.setAttribute('aria-describedby', f[1] + '-err'); else input.removeAttribute('aria-describedby');
        err.hidden = !bad;
        if (bad && ok) { input.focus(); ok = false; }
      });
      if (!ok) return;
      var cat = (form.elements.category && form.elements.category.value) || 'Individual';
      var body = 'Name: ' + form.elements.name.value.trim() + '\nEmail: ' + form.elements.email.value.trim() + '\nPhone: ' + (form.elements.phone.value.trim() || '-') + '\nMembership: ' + cat + '\n\nI would like to hear about membership at The River.';
      window.location.href = 'mailto:cverdery@rivergolfclub.com?subject=' + encodeURIComponent('Membership inquiry: ' + cat) + '&body=' + encodeURIComponent(body);
      done.hidden = false;
    });
  });

  /* ---------- Masters Week countdown ---------- */
  var count = $('[data-count]');
  if (count) {
    var t = nowET();
    var today = Date.UTC(t.y, t.m - 1, t.d), first = Date.UTC(2027, 3, 8), last = Date.UTC(2027, 3, 11), weekStart = Date.UTC(2027, 3, 5);
    var days = Math.round((first - today) / 864e5);
    var num = $('[data-count-num]', count), words = $('[data-count-words]', count);
    if (today > last) { count.hidden = true; }
    else if (today >= weekStart && today <= last) { num.textContent = 'Now'; words.textContent = 'Masters Week 2027 is here. The first round is Thursday, April 8.'; }
    else {
      num.textContent = days; words.innerHTML = (days === 1 ? 'day' : 'days') + ' until the first round at Augusta National, Thursday, April&nbsp;8, 2027';
      // Counts up the first time it comes into view (only when it starts below the fold)
      if (!reduce && 'IntersectionObserver' in window && num.getBoundingClientRect().top > window.innerHeight) {
        num.style.minWidth = Math.ceil(num.getBoundingClientRect().width) + 'px';
        num.setAttribute('aria-hidden', 'true');
        words.insertAdjacentHTML('afterbegin', '<span class="sr">' + days + ' </span>');
        num.textContent = '0';
        var cio = new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting) return;
          cio.disconnect();
          var t0 = performance.now(), dur = 1700;
          var step = function (tt) { var k = Math.min(1, (tt - t0) / dur), e = 1 - Math.pow(1 - k, 3); num.textContent = Math.round(days * e); if (k < 1) requestAnimationFrame(step); };
          requestAnimationFrame(step);
        }, { rootMargin: '0px 0px -15% 0px' });
        cio.observe(num);
      }
    }
  }

  /* ---------- Cottages: how many are coming ---------- */
  var stay = $('[data-stay]');
  if (stay) {
    var n = 8, out = $('[data-group-num]', stay), ans = $('[data-group-answer]', stay), mail = $('[data-group-mail]', stay);
    var rows = {}; $$('[data-cottage]', stay).forEach(function (li) { rows[li.getAttribute('data-cottage')] = li; });
    var minus = $('[data-group-minus]', stay), plus = $('[data-group-plus]', stay);
    var paintGroup = function () {
      var w = WORDS[n], on;
      if (n <= 4) { on = ['cypress', 'palmetto']; ans.textContent = 'Cypress or Palmetto gives all ' + w + ' a bedroom of their own.'; }
      else if (n <= 8) { on = ['sweetbay']; ans.textContent = 'Sweetbay gives all ' + w + ' a bedroom of their own, each with a king bed.'; }
      else if (n <= 12) { on = ['sweetbay', 'cypress', 'palmetto']; ans.textContent = 'Sweetbay with Cypress or Palmetto gives all ' + w + ' a bedroom of their own.'; }
      else if (n <= 16) { on = ['sweetbay', 'cypress', 'palmetto']; ans.textContent = 'All three cottages give all ' + w + ' a bedroom of their own.'; }
      else { on = ['sweetbay', 'cypress', 'palmetto']; ans.textContent = 'All three cottages sleep ' + w + ', two to a room in Cypress and Palmetto.'; }
      out.textContent = n;
      Object.keys(rows).forEach(function (k) { rows[k].classList.toggle('is-in', on.indexOf(k) > -1); });
      minus.disabled = n <= 2; plus.disabled = n >= 24;
      mail.href = 'mailto:cverdery@rivergolfclub.com?subject=' + encodeURIComponent('Cottage request for a group of ' + n);
    };
    var roll = function (dir) { if (reduce) return; out.classList.remove('up', 'down'); void out.offsetWidth; out.classList.add(dir); };
    minus.addEventListener('click', function () { if (n > 2) { n--; paintGroup(); roll('down'); } });
    plus.addEventListener('click', function () { if (n < 24) { n++; paintGroup(); roll('up'); } });
    paintGroup();
  }

  /* ---------- Pavilion: set the room ---------- */
  var roomsWrap = $('[data-rooms]');
  if (roomsWrap) {
    var paintRoom = function () {
      var c = $('input[name="room"]:checked', roomsWrap), v = c ? c.value : 'outside';
      $$('[data-room]', roomsWrap).forEach(function (img) {
        var on = img.getAttribute('data-room') === v;
        if (on && img.getAttribute('data-src')) {
          img.srcset = img.getAttribute('data-srcset'); img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src'); img.removeAttribute('data-srcset');
          var show = function () { img.classList.add('is-on'); };
          if (img.decode) img.decode().then(show, show); else img.onload = show;
          return;
        }
        img.classList.toggle('is-on', on);
      });
      $$('[data-room]', roomsWrap).forEach(function (img) { img.setAttribute('aria-hidden', String(img.getAttribute('data-room') !== v)); });
    };
    $$('input[name="room"]', roomsWrap).forEach(function (r) { r.addEventListener('change', paintRoom); });
    window.addEventListener('pageshow', paintRoom);
    // Fetch the other rooms once the section is near, so a tap shows them at once
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) {
          $$('[data-room][data-src]', roomsWrap).forEach(function (img) { var p = new Image(); p.srcset = img.getAttribute('data-srcset'); p.sizes = img.sizes; p.src = img.getAttribute('data-src'); });
          io.disconnect();
        }
      }, { rootMargin: '400px' });
      io.observe(roomsWrap);
    }
  }

  /* ---------- Range, shop, gym panels ---------- */
  var panels = $$('[data-panels] .panel');
  var openPanel = function (p) {
    panels.forEach(function (q) {
      var on = q === p;
      q.classList.toggle('is-open', on);
      $('.panel__btn', q).setAttribute('aria-expanded', String(on));
    });
  };
  panels.forEach(function (p) {
    var b = $('.panel__btn', p);
    b.addEventListener('click', function () { openPanel(p); });
    b.addEventListener('focus', function () { openPanel(p); });
    if (canHover) p.addEventListener('mouseenter', function () { openPanel(p); });
  });

  /* ---------- Photographs arrive once ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var frames = $$('.member__photo, .masters__photo, .stay__photo, .events__show .room, .grill__photo, .grill__bar, .reviews__photo');
    frames.forEach(function (f) { f.classList.add('rv'); });
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        rio.unobserve(e.target);
        var f = e.target, img = $('img', f), done = false;
        var show = function () { if (!done) { done = true; f.classList.add('in'); } };
        if (img && img.decode) img.decode().then(show, show); else show();
        setTimeout(show, 1400);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    frames.forEach(function (f) { rio.observe(f); });
  }

  /* ---------- Who to ask ---------- */
  var ASK = {
    chris: ['chris-verdery', 'Chris Verdery', 'Director of Golf, PGA Professional', 'cverdery@rivergolfclub.com', '+18032020110', '(803) 202-0110'],
    shop: ['wayne-ackerson paul-walton garrett-neal', 'The golf shop', 'Wayne Ackerson, Paul Walton and Garrett Neal, our golf professionals', 'golfshop@rivergolfclub.com', '+18032020110', '(803) 202-0110'],
    bella: ['bella-ryan', 'Bella Ryan', 'Event Coordinator', 'bella@rivergolfclub.com', '+17066918985', '(706) 691-8985'],
    wayne: ['wayne-ackerson', 'Wayne Ackerson', 'Head Golf Professional', 'wayne@rivergolfclub.com', '+18032020110', '(803) 202-0110'],
    josh: ['josh-keaton', 'Josh Keaton', 'Food and Beverage Director', 'josh@rivergolfclub.com', '+18032020110', '(803) 202-0110']
  };
  var ask = $('[data-ask]');
  if (ask) {
    var aBtn = $('[data-ask-btn]', ask), aName = $('[data-ask-name]', ask), aRole = $('[data-ask-role]', ask), aMail = $('[data-ask-mail]', ask), aTel = $('[data-ask-tel]', ask);
    var paintAsk = function () {
      var c = $('input[name="ask"]:checked', ask), d = ASK[c ? c.value : 'chris'];
      var who = d[0].split(' ');
      $$('.staff [data-person]', ask).forEach(function (li) { li.classList.toggle('is-asked', who.indexOf(li.getAttribute('data-person')) > -1); });
      aName.textContent = d[1]; aRole.textContent = d[2];
      aMail.href = 'mailto:' + d[3]; aMail.textContent = d[3];
      aTel.href = 'tel:' + d[4]; aTel.textContent = d[5];
      aBtn.href = 'mailto:' + d[3];
      aBtn.textContent = d[1] === 'The golf shop' ? 'Email the golf shop' : 'Email ' + d[1].split(' ')[0];
    };
    $$('input[name="ask"]', ask).forEach(function (r) { r.addEventListener('change', paintAsk); });
    window.addEventListener('pageshow', paintAsk);
    paintAsk();
  }
})();
