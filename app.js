/* Walks — interactive map, profile and archive. Reads window.WALKS_DATA. Mounts into #walks-app. */
(function () {
  var D = window.WALKS_DATA;
  var root = document.getElementById('walks-app');
  if (!D || !root || root.dataset.ready) return;
  root.dataset.ready = '1';

  /* ---------- walk catalogue (mirrors the "Walks — data" sheet) ---------- */
  var ROUTES = [
    { id: 'portugues', name: 'Camino Portugués' },
    { id: 'frances', name: 'Camino Francés' },
    { id: 'norte', name: 'Camino del Norte' },
    { id: 'fisterra', name: 'Fisterra & Muxía' }
  ];
  var WALKS = [
    { id: '2026-portugues', route: 'portugues', year: 2026, from: 'Lisbon', to: 'O Milladoiro', dates: '21 Aug – 19 Sep 2026', tracked: true },
    { id: '2025-frances', route: 'frances', year: 2025, from: 'Saint-Jean-Pied-de-Port', to: 'León', dates: 'From 24 Sep 2025', tracked: false, osm: 'frances', clipX: 364 },
    { id: '2023-norte', route: 'norte', year: 2023, from: 'Hendaye', to: 'Santiago', dates: '13 Apr – 25 May 2023', tracked: true, live: 'CDN¹' },
    { id: '2023-fisterra', route: 'fisterra', year: 2023, from: 'Muxía', to: 'Fisterra', dates: '29 May – 1 Jun 2023', tracked: true },
    { id: '2017-frances', route: 'frances', year: 2017, from: '', to: 'Santiago', dates: '2017', tracked: false, osm: 'frances' },
    { id: '2017-fisterra', route: 'fisterra', year: 2017, from: 'Santiago', to: 'Fisterra', dates: '2017', tracked: false, osm: 'fisterra' }
  ];
  WALKS.forEach(function (w) {
    var d = D.days[w.id] || [];
    w.days = d;
    w.km = d.reduce(function (s, x) { return s + x.km; }, 0);
    w.climb = d.reduce(function (s, x) { return s + x.climb; }, 0);
    w.insitu = D.insitu.filter(function (p) { return p.walk === w.id; });
    w.dispatches = w.id === '2023-norte' ? D.cdn : [];
  });
  function routeName(id) { return ROUTES.filter(function (r) { return r.id === id; })[0].name; }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  /* ---------- state ---------- */
  var state = { walk: null, day: null };

  /* ---------- totals ---------- */
  var tracked = WALKS.filter(function (w) { return w.tracked; });
  var totKm = tracked.reduce(function (s, w) { return s + w.km; }, 0);
  var totDays = tracked.reduce(function (s, w) { return s + w.days.length; }, 0);
  var totals = el('div', 'wk-totals');
  totals.innerHTML =
    '<span><b>' + ROUTES.length + '</b> routes</span>' +
    '<span><b>' + WALKS.length + '</b> walks</span>' +
    '<span><b>' + fmt(totKm) + '</b> km tracked</span>' +
    '<span><b>' + totDays + '</b> days tracked</span>' +
    '<span><b>' + D.insitu.length + '</b> recordings</span>' +
    '<span><b>' + D.cdn.length + '</b> dispatches</span>' +
    '<span><b>' + (D.photos || []).length + '</b> photos</span>';
  root.appendChild(totals);

  /* ---------- walk index (chips) ---------- */
  var index = el('div', 'wk-index');
  var allBtn = el('button', 'wk-chip is-on', 'All walks');
  allBtn.addEventListener('click', function () { select(null); });
  index.appendChild(allBtn);
  WALKS.forEach(function (w) {
    var b = el('button', 'wk-chip' + (w.tracked ? '' : ' is-untracked'), '<span class="wk-chip-y">' + w.year + '</span> ' + routeName(w.route).replace('Camino ', ''));
    b.dataset.walk = w.id;
    b.addEventListener('click', function () { select(w.id); });
    index.appendChild(b);
  });
  root.appendChild(index);

  /* ---------- map ---------- */
  var mapWrap = el('div', 'wk-map');
  var vb = D.vb;
  var svg = sv('svg', { viewBox: vb.join(' '), preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Map of the walks' });
  svg.appendChild(sv('path', { d: D.land, class: 'wk-land' }));
  svg.appendChild(sv('path', { d: D.border, class: 'wk-border' }));
  var gCities = sv('g', { class: 'wk-cities' });
  D.cities.forEach(function (c) {
    gCities.appendChild(sv('circle', { cx: c.x, cy: c.y, r: 2.2 }));
    var t = sv('text', { x: c.x + 5, y: c.y + 3 }); t.textContent = c.n; gCities.appendChild(t);
  });
  svg.appendChild(gCities);
  var defs = sv('defs', {});
  var clip = sv('clipPath', { id: 'wk-clip-leon' }); clip.appendChild(sv('rect', { x: 364, y: 0, width: 1000, height: 1000 })); defs.appendChild(clip); svg.appendChild(defs);
  var gOsm = sv('g', { class: 'wk-osm' }), osmPaths = [];
  WALKS.forEach(function (w) {
    if (!w.osm || !D.osm) return;
    var p = sv('path', { d: D.osm[w.osm], class: 'wk-route-line', 'data-walk': w.id });
    if (w.clipX) p.setAttribute('clip-path', 'url(#wk-clip-leon)');
    p.addEventListener('mouseenter', function () { var b = p.getBBox(); tip('<b>' + w.year + ' ' + routeName(w.route).replace('Camino ', '') + '</b>The route (not a GPS track)', b.x + b.width / 2, b.y); });
    p.addEventListener('mouseleave', function () { tip(null); });
    p.addEventListener('click', function (e) { e.stopPropagation(); select(w.id); });
    gOsm.appendChild(p); osmPaths.push(p);
  });
  svg.appendChild(gOsm);
  var gRoutes = sv('g', { class: 'wk-routes' });
  var dayPaths = [];
  WALKS.forEach(function (w) {
    w.days.forEach(function (d, i) {
      var p = sv('path', { d: d.path, class: 'wk-day', 'data-walk': w.id, 'data-i': i });
      p.addEventListener('mouseenter', function () { hoverDay(w, i); });
      p.addEventListener('mouseleave', function () { hoverDay(null); });
      p.addEventListener('click', function (e) { e.stopPropagation(); if (state.walk !== w.id) select(w.id); focusDay(i); });
      gRoutes.appendChild(p);
      dayPaths.push(p);
    });
  });
  svg.appendChild(gRoutes);
  var gPins = sv('g', { class: 'wk-pins' });
  D.insitu.forEach(function (p) {
    var c = sv('circle', { cx: p.x, cy: p.y, r: 4.5, class: 'wk-pin', 'data-walk': p.walk });
    c.addEventListener('mouseenter', function () { tip('<b>In Situ ' + p.ep + '</b>' + p.t, p.x, p.y); });
    c.addEventListener('mouseleave', function () { tip(null); });
    c.addEventListener('click', function (e) { e.stopPropagation(); play(p); });
    gPins.appendChild(c);
  });
  svg.appendChild(gPins);
  /* ---------- CDN¹ photo pins (from the sheet's Photos tab) ---------- */
  var PH = (D.photos || []).map(function (p, i) { p.i = i; p.src = 'https://cdn.u.pika.page/' + p.u; p.walk = p.w; return p; });
  var gPhotos = sv('g', { class: 'wk-photos' });
  var phDefs = sv('defs', {}); svg.appendChild(phDefs);
  var clipS = sv('circle', { cx: 0, cy: 0, r: 1 }), clipC = sv('circle', { cx: 0, cy: 0, r: 1 });
  var cpS = sv('clipPath', { id: 'wk-ph-clip-s' }); cpS.appendChild(clipS); phDefs.appendChild(cpS);
  var cpC = sv('clipPath', { id: 'wk-ph-clip-c' }); cpC.appendChild(clipC); phDefs.appendChild(cpC);
  /* crop geometry: carousel photos are a slice (cx) of the published carousel image */
  function cropBox(p, bw, bh, cover) {
    var f0 = p.cx ? p.cx[0] : 0, f1 = p.cx ? p.cx[1] : 1, pa = (f1 - f0) * p.a;
    var pw = cover ? Math.max(bw, bh * pa) : Math.min(bw, bh * pa), ph = pw / pa, iw = pw / (f1 - f0);
    return { pw: pw, ph: ph, iw: iw, x: (cover ? (bw - pw) / 2 : 0) - f0 * iw, y: cover ? (bh - ph) / 2 : 0 };
  }
  function cropHTML(p, bw, bh, cover) {
    var b = cropBox(p, bw, bh, cover), fw = cover ? bw : b.pw, fh = cover ? bh : b.ph;
    return '<div class="wk-crop" style="width:' + fw + 'px;height:' + fh + 'px"><img alt="" src="' + p.src + '" style="width:' + b.iw + 'px;height:' + b.ph + 'px;left:' + b.x + 'px;top:' + b.y + 'px"></div>';
  }
  svg.insertBefore(gPhotos, gPins);
  var PIN_PX = 9, CELL_PX = 30;
  function unitsPerPx() { var r = svg.getBoundingClientRect(); return Math.max(cur[2] / (r.width || 1), cur[3] / (r.height || 1)); }
  function visiblePhotos() {
    if (!state.walk) return PH;
    var ws = PH.filter(function (p) { return p.walk === state.walk; });
    if (state.day != null) {
      var dn = WALKS.filter(function (w) { return w.id === state.walk; })[0].days[state.day].n;
      return ws.filter(function (p) { return p.dn === dn; });
    }
    return ws;
  }
  function clusterPhotos(list, upp) {
    var cell = CELL_PX * upp, grid = {}, out = [];
    list.forEach(function (p) {
      var key = Math.floor(p.x / cell) + ':' + Math.floor(p.y / cell);
      (grid[key] = grid[key] || []).push(p);
    });
    Object.keys(grid).forEach(function (k) {
      var g = grid[k], x = 0, y = 0;
      g.forEach(function (p) { x += p.x; y += p.y; });
      out.push({ items: g, x: x / g.length, y: y / g.length });
    });
    return out;
  }
  var phKey = '';
  function drawPhotos() {
    var upp = unitsPerPx(), list = visiblePhotos();
    var cl = clusterPhotos(list, upp);
    var key = cl.length + '|' + (state.walk || '') + '|' + state.day + '|' + Math.round(upp * 1000);
    if (key === phKey) return; phKey = key;
    while (gPhotos.firstChild) gPhotos.removeChild(gPhotos.firstChild);
    var r = PIN_PX * upp;
    clipS.setAttribute('r', r); clipC.setAttribute('r', r * 1.3);
    cl.forEach(function (c) {
      var n = c.items.length, rr = n > 1 ? r * 1.3 : r, lead = c.items[0];
      var g = sv('g', { class: 'wk-ph' + (n > 1 ? ' is-cluster' : ''), transform: 'translate(' + c.x.toFixed(2) + ' ' + c.y.toFixed(2) + ')' });
      g.appendChild(sv('circle', { r: rr + 1.6 * upp, class: 'wk-ph-ring' }));
      var bx0 = cropBox(lead, rr * 2, rr * 2, true);
      var im = sv('image', { href: lead.src, x: bx0.x - rr, y: bx0.y - rr, width: bx0.iw, height: bx0.ph, preserveAspectRatio: 'none', 'clip-path': 'url(#wk-ph-clip-' + (n > 1 ? 'c' : 's') + ')' });
      g.appendChild(im);
      if (n > 1) {
        var bx = rr * .8, by = -rr * .8;
        g.appendChild(sv('circle', { cx: bx, cy: by, r: 6.5 * upp, class: 'wk-ph-badge' }));
        var t = sv('text', { x: bx, y: by + 3 * upp, class: 'wk-ph-count', 'font-size': 8.5 * upp }); t.textContent = n; g.appendChild(t);
      }
      g.addEventListener('mouseenter', function () { phTip(c); });
      g.addEventListener('mouseleave', function () { phTip(null); });
      g.addEventListener('click', function (e) {
        e.stopPropagation(); phTip(null);
        if (n === 1) { openPhoto(lead, list); return; }
        var xs = c.items.map(function (p) { return p.x; }), ys = c.items.map(function (p) { return p.y; });
        var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
        var spread = Math.max(x1 - x0, y1 - y0);
        if (spread < 0.05) { openPhoto(lead, c.items); return; } // same spot: open, then arrow through
        var w = Math.max(spread * 1.8, 1.2), ar = vb[2] / vb[3], h = w / ar;
        zoomTo([(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]);
      });
      gPhotos.appendChild(g);
    });
  }
  var phTipEl = el('div', 'wk-phtip');
  mapWrap.appendChild(phTipEl);
  function phTip(c) {
    if (!c) { phTipEl.style.opacity = 0; return; }
    var p = c.items[0], n = c.items.length;
    phTipEl.innerHTML = cropHTML(p, 200, 132, true) + '<span><b>' + (p.d === 'done' ? 'Done!' : 'Day ' + p.d) + '</b>' + (n > 1 ? n + ' photos · click to zoom' : fmtWhen(p)) + '</span>';
    var pt = toScreen(c.x, c.y), mw = mapWrap.clientWidth;
    phTipEl.style.left = Math.max(110, Math.min(mw - 110, pt.x)) + 'px';
    phTipEl.classList.toggle('is-below', pt.y < 200);
    phTipEl.style.top = pt.y + 'px'; phTipEl.style.opacity = 1;
  }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtWhen(p) { return (+p.t.slice(3, 5)) + ' ' + MON[+p.t.slice(0, 2) - 1] + ' · ' + p.t.slice(6); }

  /* lightbox */
  var lb = el('div', 'wk-lb', '<button class="wk-lb-x" aria-label="Close">×</button><button class="wk-lb-prev" aria-label="Previous">‹</button><figure><div class="wk-lb-img"></div><figcaption></figcaption></figure><button class="wk-lb-next" aria-label="Next">›</button>');
  document.body.appendChild(lb);
  var lbList = [], lbIdx = 0;
  function openPhoto(p, list) {
    lbList = list.filter(function (q) { return q.d === p.d; }).sort(function (a, b) { return a.k - b.k; });
    lbIdx = Math.max(0, lbList.indexOf(p)); showLb(); lb.classList.add('is-on');
  }
  function showLb() {
    var p = lbList[lbIdx], post = p.d === 'done' ? { h: '/cdn1/done', t: 'Camino del Norte — Done!' } : D.cdn.filter(function (c) { return c.n === p.d; })[0];
    lb.querySelector('.wk-lb-img').innerHTML = cropHTML(p, window.innerWidth * .92, window.innerHeight * .8, false);
    lb.querySelector('figcaption').innerHTML = '<span class="wk-lbl">' + (p.d === 'done' ? 'Done!' : 'Day ' + p.d) + ' · ' + fmtWhen(p) + (p.m === 't' ? ' · in town' : p.m === '?' ? ' · location approximate' : p.m === 's' ? ' · after the walk' : '') + (p.c ? ' · from a carousel' : '') + '</span>' +
      (post ? ' <a href="' + post.h + '">' + post.t + ' →</a>' : '') + (lbList.length > 1 ? ' <span class="wk-small">' + (lbIdx + 1) + ' / ' + lbList.length + '</span>' : '');
    lb.classList.toggle('is-single', lbList.length < 2);
  }
  function stepLb(d) { lbIdx = (lbIdx + d + lbList.length) % lbList.length; showLb(); }
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('wk-lb-x')) lb.classList.remove('is-on'); });
  lb.querySelector('.wk-lb-prev').onclick = function (e) { e.stopPropagation(); stepLb(-1); };
  lb.querySelector('.wk-lb-next').onclick = function (e) { e.stopPropagation(); stepLb(1); };
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-on')) return;
    if (e.key === 'Escape') lb.classList.remove('is-on');
    if (e.key === 'ArrowLeft') stepLb(-1);
    if (e.key === 'ArrowRight') stepLb(1);
  });
  window.addEventListener('resize', function () { phKey = ''; drawPhotos(); });
  var marker = sv('circle', { r: 6, class: 'wk-marker' });
  marker.style.display = 'none';
  svg.appendChild(marker);
  svg.addEventListener('click', function () { if (state.walk) focusDay(null); });
  mapWrap.appendChild(svg);
  var tipEl = el('div', 'wk-tip');
  mapWrap.appendChild(tipEl);
  var resetBtn = el('button', 'wk-reset', 'Show all');
  resetBtn.addEventListener('click', function (e) { e.stopPropagation(); select(null); });
  mapWrap.appendChild(resetBtn);
  root.appendChild(mapWrap);

  function tip(html, x, y) {
    if (!html) { tipEl.style.opacity = 0; return; }
    tipEl.innerHTML = html;
    var pt = toScreen(x, y);
    tipEl.style.left = pt.x + 'px'; tipEl.style.top = pt.y + 'px'; tipEl.style.opacity = 1;
  }
  function toScreen(x, y) {
    var m = svg.getScreenCTM(), r = mapWrap.getBoundingClientRect();
    var p = svg.createSVGPoint(); p.x = x; p.y = y; p = p.matrixTransform(m);
    return { x: p.x - r.left, y: p.y - r.top };
  }

  /* smooth viewBox zoom */
  var cur = vb.slice(), anim = null;
  function zoomTo(box) {
    var from = cur.slice(), t0 = performance.now(), dur = 700;
    cancelAnimationFrame(anim);
    function step(t) {
      var k = Math.min(1, (t - t0) / dur); k = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      cur = from.map(function (v, i) { return v + (box[i] - v) * k; });
      svg.setAttribute('viewBox', cur.join(' '));
      var s = cur[2] / vb[2]; root.style.setProperty('--wk-s', s);
      drawPhotos();
      if (k < 1) anim = requestAnimationFrame(step);
    }
    anim = requestAnimationFrame(step);
  }
  function bboxOf(paths, pad) {
    var b = null;
    paths.forEach(function (p) { var r = p.getBBox(); b = b ? [Math.min(b[0], r.x), Math.min(b[1], r.y), Math.max(b[2], r.x + r.width), Math.max(b[3], r.y + r.height)] : [r.x, r.y, r.x + r.width, r.y + r.height]; });
    if (!b) return vb.slice();
    var w = b[2] - b[0], h = b[3] - b[1], ar = vb[2] / vb[3];
    var p = Math.max(w, h) * (pad || 0.15) + 8; w += p * 2; h += p * 2;
    if (w / h > ar) h = w / ar; else w = h * ar;
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    return [cx - w / 2, cy - h / 2, w, h];
  }

  /* ---------- detail panel ---------- */
  var panel = el('div', 'wk-panel');
  root.appendChild(panel);
  var audio = new Audio(); audio.preload = 'none';
  var nowPlaying = el('div', 'wk-now');
  root.appendChild(nowPlaying);
  function play(p) {
    if (audio.dataset.ep == p.ep && !audio.paused) { audio.pause(); return; }
    audio.src = p.mp3; audio.dataset.ep = p.ep; audio.play();
    nowPlaying.innerHTML = '<span class="wk-now-dot"></span><b>In Situ ' + p.ep + '</b> ' + p.t + ' <a href="' + p.url + '" target="_blank" rel="noopener">Episode page</a> <button class="wk-now-stop">Stop</button>';
    nowPlaying.classList.add('is-on');
    nowPlaying.querySelector('.wk-now-stop').onclick = function () { audio.pause(); };
    markPlaying();
  }
  audio.addEventListener('pause', function () { nowPlaying.classList.remove('is-on'); markPlaying(); });
  function markPlaying() {
    [].forEach.call(root.querySelectorAll('[data-ep]'), function (b) { b.classList.toggle('is-playing', !audio.paused && audio.dataset.ep == b.dataset.ep); });
  }

  function overview() {
    var h = '<div class="wk-list">';
    ROUTES.forEach(function (r) {
      var ws = WALKS.filter(function (w) { return w.route === r.id; });
      h += '<div class="wk-row"><div class="wk-row-name">' + r.name + '</div><div class="wk-row-walks">';
      ws.forEach(function (w) {
        h += '<button class="wk-row-walk' + (w.tracked ? '' : ' is-untracked') + '" data-go="' + w.id + '"><span class="wk-lbl">' + w.year + '</span>' +
          (w.tracked ? fmt(w.km) + ' km · ' + w.days.length + ' days' : 'Not tracked') + (w.live ? ' · <em>live</em>' : '') + '</button>';
      });
      h += '</div></div>';
    });
    return h + '</div>';
  }

  function detail(w) {
    var h = '<div class="wk-head"><div class="wk-name">' + routeName(w.route) + '</div>' +
      '<div class="wk-lbl">' + w.year + (w.tracked ? ' · ' + w.days.length + ' days · ' + fmt(w.km) + ' km · ' + fmt(w.climb) + ' m climbed' : ' · not tracked') + (w.live ? ' · sent live from the trail' : '') + '</div>' +
      '<div class="wk-route">' + (w.from ? w.from + ' → ' : '') + w.to + ' · ' + w.dates + '</div></div>';
    if (w.tracked) {
      h += '<div class="wk-profile"><div class="wk-lbl wk-profile-lbl">Elevation <span class="wk-readout"></span></div><svg class="wk-prof" preserveAspectRatio="none"></svg></div>';
    }
    if (w.dispatches.length) {
      h += '<div class="wk-section"><div class="wk-lbl">Dispatches · ' + w.live + '</div><div class="wk-strip">';
      w.dispatches.forEach(function (c) { h += '<a href="' + c.h + '" data-day="' + c.n.slice(0, 2) + '" title="Day ' + c.n + ': ' + c.t.replace(/"/g, '&quot;') + '"><img loading="lazy" src="' + c.img + '" alt=""></a>'; });
      h += '</div><div class="wk-strip-cap wk-small">Hover the days. Click to read one.</div></div>';
    }
    if (w.insitu.length) {
      h += '<div class="wk-section"><div class="wk-lbl">In Situ · recorded on this walk</div><ol class="wk-sounds">';
      w.insitu.forEach(function (p) { h += '<li><button class="wk-play" data-ep="' + p.ep + '" aria-label="Play">▶</button><span class="wk-sound-t">' + p.t + '</span><span class="wk-small">' + p.dt.slice(5, 10).replace('-', '/') + '</span></li>'; });
      h += '</ol></div>';
    }
    if (w.days.length) {
      h += '<div class="wk-section"><div class="wk-lbl">Days</div><table class="wk-days"><tbody>';
      w.days.forEach(function (d, i) {
        var hasSound = w.insitu.some(function (p) { return p.dt.slice(0, 10) === d.date; });
        var disp = w.dispatches.filter(function (c) { return c.n.slice(0, 2) === d.n; });
        h += '<tr data-i="' + i + '"><td class="wk-lbl">' + d.n + '</td><td>' + d.from + ' → ' + d.to + '</td><td class="wk-num">' + d.km.toFixed(1) + ' km</td><td class="wk-num wk-small">' + fmt(d.climb) + ' m</td><td class="wk-icons">' +
          (disp.length ? disp.map(function (c) { return '<a href="' + c.h + '" title="' + c.t.replace(/"/g, '&quot;') + '">✉</a>'; }).join('') : '') + (hasSound ? '<span title="In Situ recording">♪</span>' : '') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    if (!w.tracked) h += '<p class="wk-small wk-note">No GPS track for this walk. ' + (w.osm ? 'The dashed line is the waymarked route from OpenStreetMap, not the exact path walked.' : '') + '</p>';
    return h;
  }

  function render() {
    var w = WALKS.filter(function (x) { return x.id === state.walk; })[0];
    panel.innerHTML = w ? detail(w) : overview();
    [].forEach.call(panel.querySelectorAll('[data-go]'), function (b) { b.onclick = function () { select(b.dataset.go); }; });
    if (!w) return;
    [].forEach.call(panel.querySelectorAll('.wk-play'), function (b) { b.onclick = function () { play(D.insitu.filter(function (p) { return p.ep == b.dataset.ep; })[0]); }; });
    [].forEach.call(panel.querySelectorAll('.wk-days tr'), function (tr) {
      var i = +tr.dataset.i;
      tr.onmouseenter = function () { hoverDay(w, i); };
      tr.onmouseleave = function () { hoverDay(null); };
      tr.onclick = function (e) { if (e.target.tagName === 'A') return; focusDay(state.day === i ? null : i); };
    });
    markPlaying();
    if (w.tracked) drawProfile(w);
    var strip = panel.querySelector('.wk-strip');
    if (strip) dock(strip, panel.querySelector('.wk-strip-cap'), w);
  }

  /* elevation profile across the whole walk, with day boundaries */
  function drawProfile(w) {
    var s = panel.querySelector('.wk-prof'), readout = panel.querySelector('.wk-readout');
    var W = 1000, H = 120;
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var pts = [], maxE = 0, kmAt = 0;
    w.days.forEach(function (d) { if (d._clean) return; d._clean = 1; var e = d.ele, good = e.map(function (v) { return v > -100; });
      for (var j = 0; j < e.length; j++) if (!good[j]) { var a = j - 1, b = j + 1; while (a >= 0 && !good[a]) a--; while (b < e.length && !good[b]) b++;
        e[j] = a < 0 ? (b < e.length ? e[b] : 0) : b >= e.length ? e[a] : Math.round(e[a] + (e[b] - e[a]) * (j - a) / (b - a)); } });
    w.days.forEach(function (d, di) {
      d.ele.forEach(function (e, j) { pts.push({ km: kmAt + d.km * j / (d.ele.length - 1), e: e, di: di, f: j / (d.ele.length - 1) }); if (e > maxE) maxE = e; });
      kmAt += d.km;
    });
    var X = function (km) { return km / kmAt * W; }, Y = function (e) { return H - 6 - e / (maxE || 1) * (H - 16); };
    var dpath = 'M0 ' + H + ' ' + pts.map(function (p) { return 'L' + X(p.km).toFixed(1) + ' ' + Y(p.e).toFixed(1); }).join(' ') + ' L' + W + ' ' + H + 'Z';
    s.appendChild(sv('path', { d: dpath, class: 'wk-prof-area' }));
    var acc = 0;
    w.days.forEach(function (d, i) { acc += d.km; if (i < w.days.length - 1) s.appendChild(sv('line', { x1: X(acc), x2: X(acc), y1: 0, y2: H, class: 'wk-prof-tick' })); });
    var sel = sv('rect', { y: 0, height: H, class: 'wk-prof-sel', width: 0 }); s.appendChild(sel);
    var cursor = sv('line', { y1: 0, y2: H, class: 'wk-prof-cursor' }); s.appendChild(cursor);
    s._sel = sel;
    function at(clientX) {
      var r = s.getBoundingClientRect(), x = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * kmAt;
      var p = pts.reduce(function (a, b) { return Math.abs(b.km - x) < Math.abs(a.km - x) ? b : a; });
      return p;
    }
    s.addEventListener('mousemove', function (ev) {
      var p = at(ev.clientX), d = w.days[p.di];
      cursor.setAttribute('x1', X(p.km)); cursor.setAttribute('x2', X(p.km)); cursor.style.opacity = 1;
      readout.innerHTML = 'Day ' + d.n + ' · ' + d.from + ' → ' + d.to + ' · km ' + p.km.toFixed(1) + ' · ' + p.e + ' m';
      var path = dayPaths.filter(function (x) { return x.dataset.walk === w.id && +x.dataset.i === p.di; })[0];
      var L = path.getTotalLength(), pt = path.getPointAtLength(L * p.f);
      marker.setAttribute('cx', pt.x); marker.setAttribute('cy', pt.y); marker.style.display = '';
      highlight(w.id, p.di);
    });
    s.addEventListener('mouseleave', function () { cursor.style.opacity = 0; readout.textContent = ''; marker.style.display = 'none'; highlight(w.id, state.day); });
    s.addEventListener('click', function (ev) { focusDay(at(ev.clientX).di); });
  }

  /* dispatch strip with dock magnification */
  function dock(strip, cap, w) {
    var items = [].slice.call(strip.children), N = items.length, gap = 2, rest = cap.textContent;
    function layout(cx) {
      var W = strip.clientWidth - gap * (N - 1), base = W / N;
      var ws = items.map(function (a, i) { if (cx == null) return 1; var c = (i + .5) * (W / N), d = cx - c; return 1 + 4.5 * Math.exp(-(d * d) / (2 * 26 * 26)); });
      var sum = ws.reduce(function (p, x) { return p + x; }, 0);
      items.forEach(function (a, i) { var wd = ws[i] / sum * W; a.style.width = wd + 'px'; a.style.height = Math.min(Math.max(wd, base), 96) + 'px'; });
    }
    layout(null);
    strip.addEventListener('mousemove', function (e) {
      var r = strip.getBoundingClientRect(), cx = e.clientX - r.left; layout(cx);
      var i = Math.max(0, Math.min(N - 1, Math.floor(cx / (r.width / N)))), c = w.dispatches[i];
      cap.innerHTML = '<b class="wk-lbl">Day ' + c.n + '</b> ' + c.t;
      var di = w.days.findIndex(function (d) { return d.n === c.n.slice(0, 2); });
      if (di > -1) highlight(w.id, di);
    });
    strip.addEventListener('mouseleave', function () { layout(null); cap.textContent = rest; highlight(w.id, state.day); });
  }

  /* ---------- interactions ---------- */
  function highlight(wid, di) {
    dayPaths.forEach(function (p) {
      var inWalk = p.dataset.walk === wid;
      p.classList.toggle('is-walk', !!wid && inWalk);
      p.classList.toggle('is-day', inWalk && di != null && +p.dataset.i === di);
    });
    [].forEach.call(panel.querySelectorAll('.wk-days tr'), function (tr) { tr.classList.toggle('is-on', +tr.dataset.i === di); });
  }
  function hoverDay(w, i) {
    if (!w) { tip(null); highlight(state.walk, state.day); return; }
    var d = w.days[i];
    var path = dayPaths.filter(function (x) { return x.dataset.walk === w.id && +x.dataset.i === i; })[0];
    var b = path.getBBox();
    tip('<b>' + w.year + ' ' + routeName(w.route).replace('Camino ', '') + ' · Day ' + d.n + '</b>' + d.from + ' → ' + d.to + ' · ' + d.km.toFixed(1) + ' km', b.x + b.width / 2, b.y);
    highlight(w.id, i);
  }
  function focusDay(i) {
    state.day = i;
    var w = WALKS.filter(function (x) { return x.id === state.walk; })[0];
    if (!w) return;
    var paths = dayPaths.filter(function (p) { return p.dataset.walk === w.id && (i == null || +p.dataset.i === i); });
    if (paths.length) zoomTo(bboxOf(paths, i == null ? 0.08 : 0.35));
    highlight(w.id, i);
    phKey = ''; drawPhotos();
    var prof = panel.querySelector('.wk-prof');
    if (prof && prof._sel) {
      if (i == null) prof._sel.setAttribute('width', 0);
      else {
        var tot = w.km, a = 0; for (var k = 0; k < i; k++) a += w.days[k].km;
        prof._sel.setAttribute('x', a / tot * 1000); prof._sel.setAttribute('width', w.days[i].km / tot * 1000);
      }
    }
  }
  function select(id) {
    state.walk = id; state.day = null;
    [].forEach.call(index.querySelectorAll('.wk-chip'), function (b) { b.classList.toggle('is-on', (b.dataset.walk || null) === id); });
    root.classList.toggle('has-walk', !!id);
    [].forEach.call(gPins.children, function (c) { c.classList.toggle('is-dim', !!id && c.dataset.walk !== id); });
    render();
    var w = WALKS.filter(function (x) { return x.id === id; })[0];
    osmPaths.forEach(function (p) { p.classList.toggle('is-walk', p.dataset.walk === id); });
    if (w && !w.tracked && w.osm) zoomTo(w.clipX ? bboxOf(osmPaths.filter(function (p) { return p.dataset.walk === id; }), 0.08).map(function (v, i) { return v; }) : bboxOf(osmPaths.filter(function (p) { return p.dataset.walk === id; }), 0.08));
    else if (!w || !w.tracked) zoomTo(vb.slice());
    else zoomTo(bboxOf(dayPaths.filter(function (p) { return p.dataset.walk === id; }), 0.08));
    highlight(id, null);
    phKey = ''; drawPhotos();
  }
  render();
  requestAnimationFrame(function () { phKey = ''; drawPhotos(); });
})();
