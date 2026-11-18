(function(){
  'use strict';
  var B = window.BOOK || {chapters:[]};
  var root = document.body.dataset.root || '';
  var page = document.body.dataset.page;
  var K = 'hisn:';
  function get(k, d){ try{ var v = localStorage.getItem(K+k); return v===null? d : JSON.parse(v); }catch(e){ return d; } }
  function set(k, v){ try{ localStorage.setItem(K+k, JSON.stringify(v)); }catch(e){} }
  function $(s, c){ return (c||document).querySelector(s); }
  function $$(s, c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); }

  /* ---- theme ---- */
  $('#themeToggle').addEventListener('click', function(){
    var t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try{ localStorage.setItem(K+'theme', t); }catch(e){}
  });

  /* ---- arabic font size ---- */
  var fs = get('arsize', null);
  function applyFs(){ if(fs) document.documentElement.style.setProperty('--ar-size', fs + 'rem'); }
  applyFs();
  $('#fontPlus').addEventListener('click', function(){ fs = Math.min(3, (fs || 1.75) + 0.15); applyFs(); set('arsize', fs); });
  $('#fontMinus').addEventListener('click', function(){ fs = Math.max(1.1, (fs || 1.75) - 0.15); applyFs(); set('arsize', fs); });

  /* ---- sidebar / toc ---- */
  var read = get('read', {});
  var toc = $('#toc');
  function buildToc(){
    toc.innerHTML = '';
    B.chapters.forEach(function(c){
      var a = document.createElement('a');
      a.href = root + c.file; a.dataset.id = c.id;
      a.innerHTML = '<span class="t"></span><span class="chk"></span>';
      a.querySelector('.t').textContent = c.fr;
      a.title = c.ar;
      if(read[c.id]) a.querySelector('.chk').textContent = '✓';
      if(c.id === page) a.classList.add('current');
      toc.appendChild(a);
    });
    var cur = $('a.current', toc); if(cur) cur.scrollIntoView({block:'center'});
  }
  buildToc();
  function updateProgress(){
    var n = B.chapters.length, r = B.chapters.filter(function(c){ return read[c.id]; }).length;
    var pct = Math.round(r*100/n);
    $('#sideProgressTxt').textContent = r + ' / ' + n + ' chapitres lus (' + pct + ' %)';
    var hb = $('#homeBar'); if(hb){ hb.style.width = pct + '%'; $('#homeTxt').textContent = pct + ' % lu'; }
    $$('ol.ix a').forEach(function(a){ a.querySelector('.ix-state').textContent = read[a.dataset.id] ? '✓' : ''; });
  }
  updateProgress();
  $('#tocSearch').addEventListener('input', function(){
    var q = this.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    $$('a', toc).forEach(function(a){
      var t = (a.textContent + ' ' + a.title).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      a.style.display = t.indexOf(q) > -1 ? '' : 'none';
    });
  });
  $('#tocToggle').addEventListener('click', function(){ document.body.classList.toggle('side-open'); });
  $('#overlay').addEventListener('click', function(){ document.body.classList.remove('side-open'); });
  $('#resetProgress').addEventListener('click', function(){
    if(!confirm('Réinitialiser toute la progression de lecture ?')) return;
    read = {}; set('read', read); set('last', null); buildToc(); updateProgress(); refreshRead();
  });

  /* ---- mark as read ---- */
  var mr = $('#markRead');
  function refreshRead(){
    if(!mr) return;
    if(read[page]){ mr.textContent = '✓ Chapitre lu — annuler'; mr.classList.add('read'); }
    else { mr.textContent = 'Marquer ce chapitre comme lu'; mr.classList.remove('read'); }
  }
  if(mr){
    refreshRead();
    mr.addEventListener('click', function(){
      if(read[page]) delete read[page]; else read[page] = Date.now();
      set('read', read); buildToc(); updateProgress(); refreshRead();
    });
  }

  /* ---- scroll progress + last position ---- */
  var bar = $('#progressBar span');
  var saveT;
  window.addEventListener('scroll', function(){
    var h = document.documentElement.scrollHeight - innerHeight;
    var p = h > 0 ? scrollY / h : 0;
    bar.style.width = (p*100) + '%';
    if(page !== 'couverture'){
      clearTimeout(saveT);
      saveT = setTimeout(function(){
        set('last', {page: page, y: scrollY, file: (B.chapters.filter(function(c){return c.id===page;})[0]||{}).file});
        if(p > 0.97 && !read[page] && mr){ read[page] = Date.now(); set('read', read); buildToc(); updateProgress(); refreshRead(); }
      }, 300);
    }
  }, {passive:true});
  var last = get('last', null);
  if(page === 'couverture' && !read.couverture){ read.couverture = Date.now(); set('read', read); }
  if(page === 'couverture' && last && last.file){
    var rb = $('#resumeBtn'); rb.hidden = false; rb.href = last.file + '#y' + Math.round(last.y);
    var ch = B.chapters.filter(function(c){ return c.id === last.page; })[0];
    if(ch) rb.textContent = 'Reprendre : ' + ch.fr;
  }
  var m = location.hash.match(/^#y(\d+)$/);
  if(m){ setTimeout(function(){ window.scrollTo(0, +m[1]); }, 60); }

  /* ---- notes popup ---- */
  var pop = $('#notePop'); var popY = 0;
  function closePop(){ pop.hidden = true; }
  $$('sup.nref a').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var li = document.getElementById('note-' + a.dataset.note);
      if(!li) return;
      $('.inner', pop).innerHTML = '<strong>Note ' + a.dataset.note + '</strong>' + li.innerHTML;
      pop.hidden = false; popY = scrollY;
      var r = a.getBoundingClientRect();
      var w = pop.offsetWidth, hgt = pop.offsetHeight;
      var left = Math.min(Math.max(8, r.left - w/2), innerWidth - w - 8);
      var top = r.bottom + 8; if(top + hgt > innerHeight - 8) top = Math.max(8, r.top - hgt - 8);
      pop.style.left = left + 'px'; pop.style.top = top + 'px';
    });
  });
  $('.close', pop).addEventListener('click', closePop);
  document.addEventListener('click', function(e){ if(!pop.hidden && !pop.contains(e.target) && !e.target.closest('sup.nref')) closePop(); });
  window.addEventListener('scroll', function(){ if(!pop.hidden && Math.abs(scrollY - popY) > 150) closePop(); }, {passive:true});
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ closePop(); $('#bmPanel').hidden = true; document.body.classList.remove('side-open'); } });

  /* ---- bookmarks ---- */
  var bms = get('bookmarks', []);
  function chTitle(id){ var c = B.chapters.filter(function(x){ return x.id === id; })[0]; return c ? c : null; }
  function isBm(n){ return bms.some(function(b){ return b.n === n; }); }
  function paintBm(){
    $$('.bm-btn').forEach(function(b){ var on = isBm(b.dataset.bm); b.classList.toggle('on', on); b.textContent = on ? '★' : '☆'; });
  }
  $$('.bm-btn').forEach(function(b){
    b.addEventListener('click', function(){
      var n = b.dataset.bm;
      if(isBm(n)) bms = bms.filter(function(x){ return x.n !== n; });
      else bms.push({n: n, page: page});
      set('bookmarks', bms); paintBm();
    });
  });
  paintBm();
  function renderBm(){
    var ul = $('#bmList'); ul.innerHTML = '';
    if(!bms.length){ ul.innerHTML = '<li>Aucun marque-page. Cliquez sur ☆ à côté d\'une invocation pour l\'ajouter.</li>'; return; }
    bms.slice().sort(function(a,b){ return a.n - b.n; }).forEach(function(b){
      var c = chTitle(b.page); if(!c) return;
      var li = document.createElement('li');
      var a = document.createElement('a'); a.href = root + c.file + '#d' + b.n;
      a.textContent = 'Invocation n° ' + b.n + ' — ' + c.fr;
      var x = document.createElement('button'); x.textContent = '✕'; x.title = 'Retirer';
      x.addEventListener('click', function(){ bms = bms.filter(function(y){ return y.n !== b.n; }); set('bookmarks', bms); renderBm(); paintBm(); });
      a.addEventListener('click', function(){ $('#bmPanel').hidden = true; });
      li.appendChild(a); li.appendChild(x); ul.appendChild(li);
    });
  }
  $('#bmOpen').addEventListener('click', function(){ renderBm(); $('#bmPanel').hidden = false; });
  $('#bmPanel .close').addEventListener('click', function(){ $('#bmPanel').hidden = true; });
  $('#bmPanel').addEventListener('click', function(e){ if(e.target.id === 'bmPanel') this.hidden = true; });
})();
