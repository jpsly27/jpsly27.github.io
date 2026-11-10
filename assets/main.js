/* Portfolio — Jean Philippe Souli
   Vanilla JS, aucune dépendance. Chaque bloc est indépendant et respecte prefers-reduced-motion. */
(() => {
  'use strict';
  window.__pf = true;

  /* ---------- Utilitaires ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cssVar = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const onVisible = (el, cb, opts = {}) => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting, e)), opts);
    io.observe(el);
    return io;
  };

  /* ---------- Découpage du texte (titre hero + titres de section) ---------- */
  let ci = 0;
  $$('.hero-title .split').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.style.setProperty('--i', ci++);
      s.addEventListener('pointerenter', () => {
        if (reduced) return;
        s.classList.remove('jump'); void s.offsetWidth; s.classList.add('jump');
      });
      s.addEventListener('animationend', () => s.classList.remove('jump'));
      el.appendChild(s);
    });
  });

  $$('[data-words]').forEach((el) => {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
            wi.style.setProperty('--i', i++);
            w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          // élément (ex. .grad) : on l'anime comme un seul mot
          const w = document.createElement('span'); w.className = 'w';
          n.classList.add('wi'); n.style.setProperty('--i', i++);
          n.replaceWith(w); w.appendChild(n);
        }
      });
    };
    wrap(el);
  });

  /* Décalage automatique des éléments groupés */
  $$('[data-stagger]').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--d', i * 110)));

  /* ---------- Écran de démarrage ---------- */
  async function runLoader() {
    const loader = $('#loader');
    if (!loader || root.classList.contains('skip-loader')) { loader && loader.remove(); return; }
    const log = $('#loaderLog'), bar = $('#loaderBar'), pct = $('#loaderPct');
    const lines = [
      '<span class="c-d">  .   ____          _</span>',
      '<span class="c-g"> :: Spring Boot ::</span>        <span class="c-d">(v3.3)</span>',
      '<span class="c-c">INFO</span>  Starting <span class="c-w">JeanPhilippeSouliApplication</span>',
      '<span class="c-c">INFO</span>  Loading skills <span class="c-d">[java, spring-boot, flutter]</span>',
      '<span class="c-c">INFO</span>  Mapped endpoints <span class="c-d">/projets /contact</span>',
      '<span class="c-g">✔ Started in 1.4 s</span>'
    ];
    let skip = false;
    const onSkip = () => { skip = true; };
    loader.addEventListener('pointerdown', onSkip);
    addEventListener('keydown', onSkip, { once: true });
    const total = 1400, t0 = performance.now();
    const tick = (now) => {
      const p = skip ? 1 : clamp((now - t0) / total, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      bar.style.transform = `scaleX(${e})`;
      pct.textContent = Math.round(e * 100) + '%';
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    for (let i = 0; i < lines.length && !skip; i++) {
      log.insertAdjacentHTML('beforeend', `<span class="ll">${lines[i]}</span>`);
      await sleep(total / lines.length);
    }
    await sleep(skip ? 0 : 220);
    loader.classList.add('done');
    root.classList.remove('is-loading');
    try { sessionStorage.setItem('booted', '1'); } catch (e) { /* stockage indisponible */ }
    setTimeout(() => loader.remove(), 1200);
    await sleep(280);
  }

  /* ---------- Texte qui tourne dans le hero ---------- */
  async function rotator() {
    const el = $('#rotator');
    if (!el || reduced) return;
    const words = [
      ['API REST solides', '--green'],
      ['apps mobiles en Flutter', '--cyan'],
      ['back-ends Spring Boot', '--green'],
      ['idées qui deviennent des apps', '--cyan']
    ];
    let i = 0;
    await sleep(2600);
    for (;;) {
      const cur = words[i][0];
      for (let k = cur.length; k >= 0; k--) { el.textContent = cur.slice(0, k); await sleep(26); }
      i = (i + 1) % words.length;
      el.style.color = `var(${words[i][1]})`;
      await sleep(220);
      const next = words[i][0];
      for (let k = 1; k <= next.length; k++) { el.textContent = next.slice(0, k); await sleep(50 + Math.random() * 45); }
      await sleep(2200);
    }
  }
  /* ---------- Terminal interactif ---------- */
  const Term = (() => {
    const body = $('#termBody'), out = $('#termOut'), form = $('#termForm'), input = $('#termInput');
    if (!out) return null;
    const history = [];
    let hIdx = 0, busy = false;

    const print = (html, cls = '') => {
      const d = document.createElement('div');
      d.className = 'l ' + cls;
      d.innerHTML = html;
      out.appendChild(d);
      body.scrollTop = body.scrollHeight;
      return d;
    };
    const printAll = async (lines, delay = 45) => {
      for (const l of lines) { print(l); if (!reduced) await sleep(delay); }
    };
    const goTo = (id) => { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
    const sections = ['competences', 'projets', 'parcours', 'equipe', 'contact'];

    const cmds = {
      help: () => [
        '<span class="c-y">Commandes disponibles :</span>',
        '  <span class="c-g">whoami</span>     qui suis-je ?',
        '  <span class="c-g">skills</span>     ma stack technique',
        '  <span class="c-g">projets</span>    ce que j\'ai construit',
        '  <span class="c-g">parcours</span>   ma formation',
        '  <span class="c-g">contact</span>    me joindre',
        '  <span class="c-g">hire-me</span>    le meilleur choix de ta journée',
        '  <span class="c-g">theme</span>      basculer clair / sombre',
        '  <span class="c-g">clear</span>      nettoyer le terminal',
        '<span class="c-d">Astuce : ↑ ↓ pour l\'historique, Tab pour compléter. Il y a aussi des commandes cachées…</span>'
      ],
      whoami: () => [
        '<span class="c-w">Jean Philippe Souli</span>',
        'Développeur junior <span class="c-g">Java · Spring Boot</span> &amp; <span class="c-o">mobile (Flutter)</span>',
        '<span class="c-d">📍 Abidjan, Côte d\'Ivoire</span>'
      ],
      skills: () => [
        '<span class="c-g">back-end </span>  Java 17+, Spring Boot, Spring Data JPA, Spring Security, API REST, Maven',
        '<span class="c-c">mobile   </span>  Flutter, Dart, Android, consommation d\'API',
        '<span class="c-o">données  </span>  MySQL, PostgreSQL, SQL',
        '<span class="c-p">outils   </span>  Git &amp; GitHub, IntelliJ IDEA, Android Studio, Postman, Docker (bases)'
      ],
      projets: () => [
        '<span class="c-g">→ PharmaFind</span>     app Flutter pour trouver ses médicaments · <a href="https://github.com/jpsly27/Pharmafind" target="_blank" rel="noopener">github</a>',
        '<span class="c-g">→ Despo Couture</span>  gestion d\'atelier de couture · noté <span class="c-y">15/20</span>',
        '<span class="c-d">Tape "cd projets" pour les voir en détail.</span>'
      ],
      parcours: () => [
        '<span class="c-y">2026</span>  Licence Réseaux et Génie Logiciel <span class="c-d">· Pigier Côte d\'Ivoire</span>',
        '<span class="c-y">2025</span>  BTS IDA <span class="c-d">· Pigier Côte d\'Ivoire</span>'
      ],
      contact: () => [
        'e-mail    <a href="mailto:jeanphilippesouli@gmail.com">jeanphilippesouli@gmail.com</a>',
        'tél.      <a href="tel:+2250152781121">+225 01 52 78 11 21</a>',
        'github    <a href="https://github.com/jpsly27" target="_blank" rel="noopener">github.com/jpsly27</a>'
      ],
      'hire-me': async () => {
        const l = print('Analyse du profil <span class="c-d">[          ]</span> 0%');
        for (let p = 1; p <= 10; p++) {
          await sleep(reduced ? 0 : 90);
          l.innerHTML = `Analyse du profil <span class="c-g">[${'█'.repeat(p)}${' '.repeat(10 - p)}]</span> ${p * 10}%`;
        }
        print('<span class="c-g">✔ Match parfait.</span> Direction la section contact…');
        Confetti.rain();
        setTimeout(() => goTo('contact'), 900);
        return [];
      },
      theme: () => { Theme.toggle(); return ['Thème : <span class="c-y">' + Theme.current() + '</span>']; },
      clear: () => { out.innerHTML = ''; return []; },
      ls: () => ['<span class="c-c">competences/  projets/  parcours/  equipe/  contact/</span>  secret.txt'],
      pwd: () => ['/home/visiteur/portfolio'],
      date: () => [new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Abidjan' }) + ' (Abidjan)'],
      sudo: () => ['[sudo] mot de passe pour visiteur : ********', '<span class="c-p">Bien essayé 😏 Cet incident sera signalé… au café.</span>'],
      cafe: () => ['☕ Préparation du café… <span class="c-g">prêt</span>. Productivité <span class="c-y">+42 %</span>.'],
      java: () => ['openjdk version "17" · compile des idées en applis.'],
      flutter: () => ['<span class="c-c">flutter run</span> → ⚡ hot reload activé. Le jury adore les démos.'],
      exit: () => ['Impossible de partir si vite 😉 Il reste plein de choses à voir.'],
      konami: () => ['Essaie ↑ ↑ ↓ ↓ ← → ← → B A, hors du terminal.']
    };
    cmds.coffee = cmds.cafe;
    cmds.aide = cmds.help;
    cmds.projects = cmds.projets;

    async function run(raw) {
      const line = raw.trim();
      print(`<span class="c-g">visiteur@jp:~$</span> <span class="cmd">${esc(line)}</span>`);
      if (!line) return;
      history.push(line); hIdx = history.length;
      const [name, ...args] = line.split(/\s+/);
      const key = name.toLowerCase();
      let res;
      if (key === 'cd') {
        const t = (args[0] || '').replace(/\/$/, '').toLowerCase();
        if (!t || t === '~') res = ['Tu es déjà à la maison.'];
        else if (t === '..') res = ['Tu es déjà à la racine. Ambitieux.'];
        else if (sections.includes(t)) { res = [`<span class="c-d">→ /${t}</span>`]; setTimeout(() => goTo(t), 250); }
        else res = [`cd: ${esc(t)} : dossier introuvable`];
      } else if (key === 'cat') {
        const f = (args[0] || '').toLowerCase();
        res = f === 'secret.txt'
          ? ['<span class="c-y">Psst…</span> tape ↑ ↑ ↓ ↓ ← → ← → B A n\'importe où sur la page.']
          : [`cat: ${esc(f || '?')} : fichier introuvable`];
      } else if (key === 'echo') {
        res = [esc(args.join(' '))];
      } else if (key === 'rm') {
        res = ['Non. 🙂 On ne supprime rien ici.'];
      } else if (cmds[key]) {
        res = await cmds[key](args);
      } else {
        res = [`commande introuvable : <span class="c-o">${esc(name)}</span>. Tape <span class="c-g">help</span>.`];
      }
      await printAll(res || []);
    }

    async function exec(cmd) {
      if (busy) return;
      busy = true;
      await run(cmd);
      busy = false;
      body.scrollTop = body.scrollHeight;
    }

    form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; exec(v); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const v = input.value.toLowerCase();
        const match = Object.keys(cmds).concat(['cd', 'cat']).filter((c) => c.startsWith(v));
        if (v && match.length === 1) input.value = match[0] + ' ';
        else if (v && match.length > 1) print('<span class="c-d">' + match.join('  ') + '</span>');
      }
    });
    body.addEventListener('click', () => { if (!getSelection().toString()) input.focus({ preventScroll: true }); });
    $$('#termChips [data-cmd]').forEach((b) => b.addEventListener('click', () => exec(b.dataset.cmd)));

    async function boot() {
      const lines = [
        '<span class="c-g"> :: Spring Boot ::</span>                <span class="c-d">(v3.3)</span>',
        '<span class="c-c">INFO</span>  Starting <span class="c-w">JeanPhilippeSouliApplication</span>',
        '<span class="c-c">INFO</span>  Loaded skills: java, spring-boot, rest-api',
        '<span class="c-c">INFO</span>  Mobile module ready: flutter, dart',
        '<span class="c-c">INFO</span>  Mapped endpoints: /projets /contact',
        '<span class="c-c">INFO</span>  Tomcat started on port <span class="c-y">8080</span>',
        '<span class="c-g">✔ Started in 2.41 s — prêt pour le hackathon</span>',
        '&nbsp;',
        'Tape <span class="c-g">help</span> pour explorer, ou clique une commande ↓'
      ];
      await printAll(lines, 170);
      form.classList.add('on');
    }
    return { boot, exec };
  })();
  /* ---------- Réseau de particules du hero ---------- */
  const Net = (() => {
    const canvas = $('#net'), hero = $('#hero');
    if (!canvas) return { boost() {}, colors() {} };
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, nodes = [], packets = [], raf = 0, running = false, boost = 0, pal = {};
    const mouse = { x: -9999, y: -9999, on: false };
    const LINK = 130;

    const readColors = () => {
      pal = { line: cssVar('--net-line'), dot: cssVar('--net-dot'), acc: [cssVar('--green'), cssVar('--orange'), cssVar('--cyan')] };
    };
    const make = (x, y, burst) => {
      const accent = Math.random() < 0.2;
      const a = rand(0, Math.PI * 2), sp = burst ? rand(2, 5) : rand(0.08, 0.3);
      return { x: x ?? rand(0, w), y: y ?? rand(0, h), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: accent ? rand(1.8, 2.8) : rand(0.8, 1.6), c: accent ? Math.floor(rand(0, 3)) : -1, burst: !!burst };
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 13000, 28, finePointer ? 110 : 50));
      nodes = nodes.filter((n) => !n.burst);
      while (nodes.length < count) nodes.push(make());
      nodes.length = count;
      if (!running) draw();
    };
    const spawnPacket = () => {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      if (a) packets.push({ a, b: null, t: 0, c: Math.floor(rand(0, 3)) });
    };

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const sp = 1 + boost;
      for (const n of nodes) {
        if (mouse.on) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140) { const d = Math.sqrt(d2) || 1, f = ((140 - d) / 140) * 0.9; n.x += (dx / d) * f; n.y += (dy / d) * f; }
        }
        n.x += n.vx * sp; n.y += n.vy * sp;
        if (Math.hypot(n.vx, n.vy) > 0.35) { n.vx *= 0.97; n.vy *= 0.97; }
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = pal.line;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.globalAlpha = (1 - d2 / (LINK * LINK)) * 0.32;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      if (mouse.on) {
        ctx.strokeStyle = pal.acc[0];
        for (const n of nodes) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 200 * 200) {
            ctx.globalAlpha = (1 - d2 / 40000) * 0.7;
            ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(n.x, n.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.globalAlpha = n.c >= 0 ? 0.95 : 0.55;
        ctx.fillStyle = n.c >= 0 ? pal.acc[n.c] : pal.dot;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      // Paquets de données qui voyagent de nœud en nœud
      if (packets.length < 5 && Math.random() < 0.04) spawnPacket();
      for (const p of packets) {
        if (!p.b) {
          const near = nodes.filter((n) => n !== p.a && Math.hypot(n.x - p.a.x, n.y - p.a.y) < LINK);
          p.b = near[Math.floor(Math.random() * near.length)];
          if (!p.b) { p.dead = true; continue; }
        }
        p.t += 0.025 * sp;
        const x = lerp(p.a.x, p.b.x, p.t), y = lerp(p.a.y, p.b.y, p.t);
        ctx.globalAlpha = 1;
        ctx.fillStyle = pal.acc[p.c];
        ctx.shadowColor = pal.acc[p.c]; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (p.t >= 1) { p.a = p.b; p.b = null; p.t = 0; p.hops = (p.hops || 0) + 1; if (p.hops > 6) p.dead = true; }
      }
      packets = packets.filter((p) => !p.dead);
      ctx.globalAlpha = 1;
      boost *= 0.97;
      if (running) raf = requestAnimationFrame(draw);
    }

    const start = () => { if (running || reduced) return; running = true; raf = requestAnimationFrame(draw); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    readColors();
    resize();
    addEventListener('resize', resize);
    hero.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true; });
    hero.addEventListener('pointerleave', () => { mouse.on = false; });
    hero.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, .term')) return;
      const r = canvas.getBoundingClientRect();
      for (let i = 0; i < 8; i++) nodes.push(make(e.clientX - r.left, e.clientY - r.top, true));
      const extra = nodes.filter((n) => n.burst);
      if (extra.length > 40) nodes.splice(nodes.indexOf(extra[0]), 8);
      boost = Math.max(boost, 1.5);
    });
    onVisible(hero, (vis) => (vis && !document.hidden ? start() : stop()));
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    return { boost(v) { boost = v; }, colors() { readColors(); if (!running) draw(); } };
  })();

  /* ---------- Curseur personnalisé ---------- */
  if (finePointer && !reduced) {
    const dot = $('.cursor-dot'), ring = $('.cursor-ring'), label = $('.cursor-label');
    root.classList.add('has-cursor');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      root.classList.add('cursor-on');
    }, { passive: true });
    document.addEventListener('pointerleave', () => root.classList.remove('cursor-on'));
    addEventListener('blur', () => root.classList.remove('cursor-on'));
    (function loop() {
      rx = lerp(rx, mx, 0.2); ry = lerp(ry, my, 0.2);
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, input, [data-cursor], .chip');
      const lab = t && t.dataset.cursor;
      ring.classList.toggle('hover', !!t && !lab);
      ring.classList.toggle('label', !!lab);
      ring.classList.toggle('text', !!t && t.matches('input'));
      label.textContent = lab || '';
    });
    addEventListener('pointerdown', () => ring.classList.add('down'));
    addEventListener('pointerup', () => ring.classList.remove('down'));
  }

  /* ---------- Boutons magnétiques, projecteur, inclinaison 3D ---------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.28}px, ${y * 0.38}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    const spots = $$('[data-spotlight]');
    addEventListener('pointermove', (e) => {
      for (const c of spots) {
        const r = c.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        c.style.setProperty('--mx', `${e.clientX - r.left}px`);
        c.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
    }, { passive: true });

    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .15s ease-out';
        el.style.transform = `perspective(1000px) rotateX(${-py * 9}deg) rotateY(${px * 11}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = ''; el.style.transform = ''; });
    });

    const term = $('#term'), hero = $('#hero');
    hero.addEventListener('pointermove', (e) => {
      const px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5;
      term.style.transform = `rotateY(${px * -8}deg) rotateX(${py * 6}deg)`;
    });
    hero.addEventListener('pointerleave', () => { term.style.transform = ''; });
  }
  /* ---------- Apparition au défilement ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-words]').forEach((el) => revealIO.observe(el));

  /* ---------- Navigation, progression, défilement ---------- */
  const nav = $('#nav'), pill = $('.nav-pill'), links = $$('.nav-links a');
  const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
  const progress = $('#progressBar'), heroGrid = $('#heroGrid');
  const tl = $('#timeline'), tlFill = $('#tlFill'), tlItems = $$('.tl-item');
  let lastY = scrollY, activeLink = null;

  const movePill = (a) => {
    if (a === activeLink) return;
    activeLink = a;
    links.forEach((l) => l.classList.toggle('active', l === a));
    if (!a) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  };

  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 30);
    if (!root.classList.contains('menu-open')) nav.classList.toggle('hide', y > lastY && y > 500);
    lastY = y;

    let current = null;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * 0.45) current = links[i]; });
    movePill(current);

    if (!reduced && y < innerHeight * 1.2 && heroGrid) {
      heroGrid.style.transform = `translateY(${y * 0.18}px)`;
      heroGrid.style.opacity = String(clamp(1 - y / (innerHeight * 0.9), 0, 1));
    }

    if (tl) {
      const r = tl.getBoundingClientRect();
      const p = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
      tlFill.style.transform = `scaleY(${p})`;
      tlItems.forEach((it) => {
        const d = it.querySelector('.tl-dot').getBoundingClientRect();
        it.classList.toggle('lit', d.top < innerHeight * 0.6);
      });
    }
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  addEventListener('resize', () => { activeLink = undefined; onScroll(); });

  // Menu mobile
  const burger = $('#burger'), menu = $('#mobileMenu');
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    menu.inert = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    root.classList.toggle('menu-open', open);
    nav.classList.remove('hide');
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });

  /* ---------- Bandeaux défilants qui réagissent au scroll ---------- */
  (() => {
    const tracks = $$('.marquee-track');
    if (!tracks.length) return;
    tracks.forEach((t) => { const html = t.innerHTML; t.innerHTML = html + html + html; });
    const st = tracks.map((t, i) => ({ t, x: 0, dir: i % 2 ? 1 : -1, w: 0 }));
    const measure = () => st.forEach((s) => { s.w = s.t.scrollWidth / 3; if (s.dir > 0) s.x = -s.w; });
    measure();
    addEventListener('resize', measure);
    if (reduced) return;
    let vel = 0, prevY = scrollY, sign = 1, on = false;
    const loop = () => {
      const dy = scrollY - prevY; prevY = scrollY;
      vel = lerp(vel, dy, 0.12);
      if (Math.abs(vel) > 0.6) sign = vel > 0 ? 1 : -1;
      const speed = (0.7 + Math.min(Math.abs(vel) * 0.35, 12)) * sign;
      for (const s of st) {
        s.x += s.dir * speed;
        if (s.x <= -s.w * 2) s.x += s.w;
        if (s.x >= 0) s.x -= s.w;
        s.t.style.transform = `translate3d(${s.x}px,0,0)`;
      }
      if (on) requestAnimationFrame(loop);
    };
    onVisible($('.marquees'), (vis) => { if (vis && !on) { on = true; prevY = scrollY; requestAnimationFrame(loop); } else if (!vis) on = false; });
  })();
  /* ---------- Démo : journal de requêtes de l'API ---------- */
  (() => {
    const log = $('#reqLog');
    if (!log) return;
    const reqs = [
      ['GET', '/api/projets', 200], ['POST', '/api/contact', 201], ['GET', '/api/competences', 200],
      ['PUT', '/api/profil', 200], ['GET', '/api/hackathons', 200], ['DELETE', '/api/bugs/42', 204],
      ['GET', '/api/cafe', 418], ['GET', '/api/projets/1', 200], ['POST', '/api/auth/login', 200]
    ];
    let i = 0, timer = 0;
    const add = () => {
      const [m, p, s] = reqs[i++ % reqs.length];
      const d = document.createElement('div');
      d.className = 'req';
      d.innerHTML = `<span class="m m-${m}">${m}</span><span class="p">${p}</span><span class="s${s >= 400 ? ' w' : ''}">${s}</span><span class="t">${Math.round(rand(3, 38))}ms</span>`;
      log.appendChild(d);
      while (log.children.length > 9) log.firstElementChild.remove();
    };
    for (let k = 0; k < 4; k++) add();
    if (reduced) return;
    onVisible(log, (vis) => { clearInterval(timer); if (vis) timer = setInterval(add, 1200); });
  })();

  /* ---------- Démo : PharmaFind ---------- */
  (() => {
    const typed = $('#pfTyped'), items = $$('.pf-item');
    if (!typed) return;
    if (reduced) { items.forEach((it) => it.classList.add('show')); return; }
    const drugs = ['Paracétamol 500 mg', 'Amoxicilline', 'Ibuprofène 400', 'Vitamine C'];
    let visible = false;
    onVisible(typed.closest('.project-visual'), (v) => { visible = v; }, { threshold: 0.2 });
    const waitVisible = async () => { while (!visible) await sleep(300); };
    (async () => {
      let n = 0;
      typed.textContent = '';
      for (;;) {
        await waitVisible();
        const word = drugs[n++ % drugs.length];
        for (let k = 1; k <= word.length; k++) { typed.textContent = word.slice(0, k); await sleep(65); }
        await sleep(250);
        items.forEach((it, idx) => {
          const ok = Math.random() > (idx === 2 ? 0.7 : 0.15);
          const em = it.querySelector('em');
          em.className = ok ? 'ok' : 'ko';
          em.textContent = ok ? 'Disponible' : 'Rupture';
          it.querySelector('small').textContent = 'Pharmacie · ' + (rand(0.4, 1.4) + idx * 1.3).toFixed(1).replace('.', ',') + ' km';
          setTimeout(() => it.classList.add('show'), idx * 160);
        });
        await sleep(3000);
        items.forEach((it) => it.classList.remove('show'));
        await sleep(300);
        for (let k = word.length; k >= 0; k--) { typed.textContent = word.slice(0, k); await sleep(25); }
        await sleep(350);
      }
    })();
  })();

  /* ---------- Compteurs (mesures de Despo Couture) ---------- */
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    if (reduced) { el.textContent = end; return; }
    const io = onVisible(el, (vis) => {
      if (!vis) return;
      io.disconnect();
      const t0 = performance.now(), dur = 1600;
      const step = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), 300);
    }, { threshold: 0.5 });
  });

  /* ---------- Horloge d'Abidjan ---------- */
  (() => {
    const clock = $('#clock'), mood = $('#clockMood');
    const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Abidjan', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const hourFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Abidjan', hour: 'numeric', hour12: false });
    const moods = [[6, 'sûrement en train de dormir 😴'], [9, 'café + revue de code ☕'], [12, 'en plein dans le code'], [14, 'pause déj\' 🍛'], [19, 'en train de livrer des features'], [24, 'side project ou hackathon 🌙']];
    const tick = () => {
      if (clock) clock.textContent = fmt.format(new Date());
      if (mood) {
        const h = parseInt(hourFmt.format(new Date()), 10) % 24;
        mood.textContent = '· ' + moods.find(([lim]) => h < lim)[1];
      }
    };
    tick();
    setInterval(tick, 1000);
  })();
  /* ---------- Confettis ---------- */
  const Confetti = (() => {
    const c = $('#confetti'), ctx = c.getContext('2d');
    let parts = [], running = false;
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    addEventListener('resize', size);
    const colors = () => [cssVar('--green'), cssVar('--orange'), cssVar('--cyan'), cssVar('--yellow'), '#f472b6', '#ffffff'];
    const step = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.life < p.ttl && p.y < innerHeight + 40);
      for (const p of parts) {
        p.vy += 0.25; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
        ctx.save();
        ctx.globalAlpha = 1 - Math.max(0, (p.life - p.ttl * 0.7) / (p.ttl * 0.3));
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.4, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(step);
      else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    };
    const burst = (x, y, n = 70, power = 1) => {
      if (reduced) return;
      const pal = colors();
      for (let i = 0; i < n; i++) {
        parts.push({ x, y, vx: rand(-6, 6) * power, vy: rand(-12, -3) * power, r: rand(6, 11), rot: rand(0, 6.3), vr: rand(-0.3, 0.3), c: pal[i % pal.length], round: Math.random() < 0.35, life: 0, ttl: rand(80, 140) });
      }
      if (!running) { running = true; requestAnimationFrame(step); }
    };
    const rain = () => { for (let i = 0; i < 6; i++) setTimeout(() => burst(rand(0.1, 0.9) * innerWidth, rand(0.05, 0.3) * innerHeight, 45, 1.1), i * 140); };
    return { burst, rain };
  })();

  /* ---------- Toast ---------- */
  const toast = (msg) => {
    const t = $('#toast');
    t.innerHTML = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2800);
  };

  /* ---------- Copier e-mail / téléphone ---------- */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const el = document.getElementById(btn.dataset.copy);
      const text = el.textContent.trim();
      const done = (label) => {
        btn.textContent = label; btn.classList.add('done');
        setTimeout(() => { btn.textContent = 'Copier'; btn.classList.remove('done'); }, 1800);
      };
      try {
        await navigator.clipboard.writeText(text);
        done('Copié ✓');
        const r = btn.getBoundingClientRect();
        Confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 50, 0.8);
        toast(`📋 <b>${esc(text)}</b> copié dans le presse-papiers`);
      } catch (e) {
        const range = document.createRange(); range.selectNodeContents(el);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        done('Sélectionné');
      }
    });
  });

  /* ---------- Thème clair / sombre (avec transition circulaire) ---------- */
  const Theme = (() => {
    const btn = $('#themeToggle'), meta = $('meta[name="theme-color"]');
    const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const sync = () => { meta.setAttribute('content', current() === 'light' ? '#f6f4ee' : '#07080d'); Net.colors(); };
    const set = (next, x = innerWidth - 60, y = 36) => {
      const apply = () => {
        root.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
        sync();
      };
      if (!document.startViewTransition || reduced) { apply(); return; }
      const t = document.startViewTransition(apply);
      t.ready.then(() => {
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(() => {});
    };
    const toggle = (x, y) => set(current() === 'light' ? 'dark' : 'light', x, y);
    btn.addEventListener('click', (e) => {
      const r = btn.getBoundingClientRect();
      toggle(r.left + r.width / 2, r.top + r.height / 2);
    });
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', sync);
    sync();
    return { toggle: () => toggle(), current };
  })();

  /* ---------- Easter eggs ---------- */
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kPos = 0;
  addEventListener('keydown', (e) => {
    if (e.target.matches && e.target.matches('input, textarea')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kPos = k === konami[kPos] ? kPos + 1 : (k === konami[0] ? 1 : 0);
    if (kPos === konami.length) {
      kPos = 0;
      Confetti.rain();
      Net.boost(6);
      root.classList.add('party');
      toast('🚀 <b>Mode hackathon activé</b> — motivation +100');
      setTimeout(() => root.classList.remove('party'), 6000);
    }
  });

  const baseTitle = document.title;
  document.addEventListener('visibilitychange', () => { document.title = document.hidden ? '👋 Reviens, l\'API t\'attend !' : baseTitle; });

  console.log('%c👋 Salut, curieux·se !', 'font: 700 16px system-ui; color: #4ade80');
  console.log('%cTu lis le code source ? On devrait sûrement travailler ensemble → jeanphilippesouli@gmail.com', 'font: 13px system-ui; color: #8b93a7');

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Démarrage ---------- */
  (async () => {
    onScroll();
    await runLoader();
    document.body.classList.add('ready');
    await sleep(reduced ? 0 : 900);
    if (Term) Term.boot();
    rotator();
  })();
})();
