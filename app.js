(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function tramo(p, a, b) { return cl((p - a) / (b - a)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function suave(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- Cabecera ---------- */
  var cab = document.getElementById('cab');
  function cabecera() { cab.classList.toggle('solida', scrollY > 40); }

  /* ---------- 1 · Historia: las notas vuelan al libro y salen siete sistemas ---------- */
  var sec = document.querySelector('.historia'), cv = document.getElementById('lienzo');
  var libro = document.getElementById('libro-h');
  var textos = [].slice.call(sec.querySelectorAll('.h-t'));
  var barra = sec.querySelector('.h-progreso span'), desliza = sec.querySelector('.desliza');
  var ctx = cv.getContext('2d'), cw = 0, ch = 0, dpr = 1;

  function cargar(src) { var im = new Image(); im.decoding = 'async'; im.src = src; return im; }
  var imgNotas = [0, 1, 2, 3, 4, 5].map(function (i) { return cargar('img/nota' + i + '.webp'); });
  var imgIconos = ['mente', 'aprender', 'cocina', 'dinero', 'hogar', 'trabajo', 'notion'].map(function (n) { return cargar('img/i-' + n + '.webp'); });

  // notas repartidas por la pantalla (posición relativa, sin tapar el título central)
  var notas = [], semilla = 7;
  function azar() { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; }
  while (notas.length < 18) {
    var x = .05 + azar() * .9, y = .08 + azar() * .84;
    if (Math.abs(y - .5) < .17 || (Math.abs(x - .5) < .42 && Math.abs(y - .5) < .25)) continue;
    notas.push({ x: x, y: y, im: imgNotas[notas.length % 6], k: .78 + azar() * .4, rot: (azar() - .5) * 34, fase: azar() * 6.28, d: azar() * .05, curva: (azar() - .5) * 2 });
  }

  function tam() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = cv.clientWidth; ch = cv.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  }
  function progreso() {
    if (reduce) return 1;
    var r = sec.getBoundingClientRect();
    return cl(-r.top / (sec.offsetHeight - innerHeight));
  }

  function dibujarHistoria(t) {
    var p = progreso(), movil = cw < 861;

    // textos por fases
    textos.forEach(function (el) {
      var a = +el.dataset.a, b = +el.dataset.b;
      var ent = a === 0 ? 1 : tramo(p, a, a + .05), sal = 1 - tramo(p, b - .05, b);
      var o = Math.min(ent, sal), dy = (1 - ent) * 30 - (1 - sal) * 30;
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < .01 ? 'hidden' : 'visible';
      var base = el.classList.contains('h-uno') || (el.classList.contains('h-final') && !movil) ? 'translateY(-50%) ' : '';
      el.style.transform = base + 'translate3d(0,' + dy.toFixed(1) + 'px,0)';
    });
    barra.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    desliza.style.opacity = (1 - tramo(p, .01, .06)).toFixed(3);

    // libro en 3D
    var ap = ease(tramo(p, .1, .3)), gira = ease(tramo(p, .1, .46)), fin = ease(tramo(p, .74, .86));
    var bw = libro.offsetWidth, bh = libro.offsetHeight;
    var ry = -72 + 60 * gira - 8 * fin + Math.sin(t / 1400) * 2 * (1 - fin);
    var sc = (.55 + .45 * gira) * (movil ? (1 - .2 * ease(tramo(p, .44, .52))) * (1 - .12 * fin) : 1 - .05 * fin);
    var tx = movil ? 0 : -cw * .24 * fin, ty = movil ? -ch * .2 * fin : 0;
    libro.style.opacity = ap.toFixed(3);
    libro.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotateX(4deg) rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
    libro.style.setProperty('--brillo', (120 - 140 * ease(tramo(p, .3, .52))).toFixed(1) + '%');
    var top = movil ? .42 : .46, bx = cw / 2 + tx, by = ch * top + ty, sw = bw * sc, sh = bh * sc;

    // lienzo
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // halo dorado cuando el libro absorbe las notas
    var g = tramo(p, .24, .34) * (1 - tramo(p, .36, .52)) + tramo(p, .48, .56) * (1 - tramo(p, .7, .78)) * .7;
    if (g > 0) {
      var rad = sh * .95, grad = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
      grad.addColorStop(0, 'rgba(232,206,150,' + (.5 * g).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(232,206,150,0)');
      ctx.fillStyle = grad; ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
    }

    // notas sueltas que vuelan hacia el libro
    var tn = Math.max(48, Math.min(120, Math.min(cw, ch) * .11));
    notas.forEach(function (n) {
      var m = ease(tramo(p, .08 + n.d, .34 + n.d));
      if (m >= 1 || !n.im.complete) return;
      var bob = Math.sin(t / 900 + n.fase) * 7 * (1 - m);
      var x0 = n.x * cw, y0 = n.y * ch + bob;
      var dx = bx - x0, dy = by - y0, arco = Math.sin(m * Math.PI) * n.curva * 90;
      var x = x0 + dx * m - dy / Math.hypot(dx, dy || 1) * arco, y = y0 + dy * m + dx / Math.hypot(dx, dy || 1) * arco;
      var s = tn * n.k * (1 - .82 * m), o = 1 - tramo(m, .75, 1);
      var r = (n.rot * (1 - m) + Math.sin(t / 1300 + n.fase) * 3 * (1 - m)) * Math.PI / 180;
      var ar = n.im.naturalHeight / n.im.naturalWidth || 1;
      ctx.save(); ctx.globalAlpha = o; ctx.translate(x, y); ctx.rotate(r);
      ctx.drawImage(n.im, -s / 2, -s * ar / 2, s, s * ar); ctx.restore();
    });

    // siete sistemas que salen del libro y lo rodean
    var vuelve = ease(tramo(p, .7, .78));
    if (p > .46 && vuelve < 1) {
      var ti = Math.max(50, Math.min(92, bw * .3));
      var rx = movil ? Math.min(sw * .5 + ti * .7 + 8, cw / 2 - ti / 2 - 6) : sw * 1.08, ryy = movil ? sh * .5 + ti * .6 : sh * .6;
      imgIconos.forEach(function (im, i) {
        if (!im.complete) return;
        var e = ease(tramo(p, .48 + i * .018, .58 + i * .018)) * (1 - vuelve);
        if (e <= 0) return;
        var ang = -Math.PI / 2 + i * Math.PI * 2 / 7;
        var x = bx + Math.cos(ang) * rx * e, y = by + Math.sin(ang) * ryy * e + Math.sin(t / 1100 + i) * 3;
        var s = ti * (.35 + .65 * e);
        ctx.save(); ctx.globalAlpha = Math.min(1, e * 1.4);
        ctx.beginPath(); ctx.arc(x, y, s * .47, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
        ctx.drawImage(im, x - s / 2, y - s / 2, s, s); ctx.restore();
      });
    }
  }

  /* ---------- Bucle de animación (solo mientras la historia está a la vista) ---------- */
  var enVista = true, vivo = false;
  function bucle(t) {
    dibujarHistoria(t);
    if (enVista && !reduce) requestAnimationFrame(bucle); else vivo = false;
  }
  function arrancar() { if (!vivo) { vivo = true; requestAnimationFrame(bucle); } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { enVista = es[0].isIntersecting; if (enVista) arrancar(); }).observe(sec);
  }

  /* ---------- 3 · Recorrido de los siete sistemas ---------- */
  var marco = [].slice.call(document.querySelectorAll('.rec-marco img'));
  var puntos = [].slice.call(document.querySelectorAll('.rec-puntos span'));
  function activar(i) {
    marco.forEach(function (im) { im.classList.toggle('activa', im.dataset.i === i); });
    puntos.forEach(function (s, k) { s.classList.toggle('activo', String(k + 1) === i); });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) activar(e.target.dataset.i); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('.bloque').forEach(function (b) { io.observe(b); });
  }

  // parallax interno de las imágenes en móvil
  var bImgs = [].slice.call(document.querySelectorAll('.b-img img'));
  function parallax() {
    if (reduce || innerWidth > 860) return;
    bImgs.forEach(function (im) {
      var r = im.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      var q = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      im.style.setProperty('--py', (q * -18).toFixed(1) + 'px');
    });
  }

  /* ---------- Aparición suave y cifras ---------- */
  var rs = [].slice.call(document.querySelectorAll('.r'));
  function contar(el) {
    var n = +el.dataset.n, t0 = performance.now();
    (function paso(t) {
      var k = suave(cl((t - t0) / 1400)); el.textContent = Math.round(n * k);
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var ir = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('visto'); ir.unobserve(e.target);
        var b = e.target.querySelector && e.target.querySelector('b[data-n]'); if (b) contar(b);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    rs.forEach(function (el) { ir.observe(el); });
  } else {
    rs.forEach(function (el) { el.classList.add('visto'); });
  }

  /* ---------- Copiar el prompt de muestra ---------- */
  var btn = document.getElementById('copiar'), pre = document.getElementById('prompt-muestra'), aviso = document.getElementById('copiado');
  btn.addEventListener('click', function () {
    var texto = pre.textContent;
    function hecho() { aviso.textContent = 'Copiado. Pégalo en tu IA y cambia lo que va entre corchetes.'; }
    function plan() {
      var r = document.createRange(); r.selectNodeContents(pre);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      aviso.textContent = 'Texto seleccionado: cópialo con Ctrl+C o mantén pulsado.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(hecho, plan); else plan();
  });

  /* ---------- Eventos ---------- */
  function alDesplazar() { cabecera(); parallax(); if (!vivo) dibujarHistoria(performance.now()); }
  tam(); cabecera(); parallax();
  addEventListener('resize', function () { tam(); dibujarHistoria(performance.now()); }, { passive: true });
  addEventListener('scroll', alDesplazar, { passive: true });
  imgNotas.concat(imgIconos).forEach(function (im) { im.addEventListener('load', function () { dibujarHistoria(performance.now()); }); });
  arrancar();
})();
