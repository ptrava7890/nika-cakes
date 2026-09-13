/* NIKA CAKES — поведение страницы. Без библиотек. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* 1. Заставка — один раз за сеанс */
  function ready() { root.classList.add('is-ready'); }
  var splash = $('#splash');
  if (splash && getComputedStyle(splash).display !== 'none') {
    var started = Date.now();
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      splash.classList.add('is-out');
      try { sessionStorage.setItem('nc-splash', '1'); } catch (e) {}
      setTimeout(function () { splash.remove(); }, 900);
      ready();
    };
    splash.addEventListener('click', finish);
    window.addEventListener('load', function () {
      setTimeout(finish, Math.max(0, 1400 - (Date.now() - started)));
    });
    setTimeout(finish, 3200);
  } else {
    if (splash) splash.remove();
    ready();
  }

  /* 2. Шапка темнеет при прокрутке */
  var header = $('#header');
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 3. Мобильное меню */
  var burger = $('.burger');
  var nav = $('#nav');
  function setNav(open) {
    root.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  burger.addEventListener('click', function () { setNav(!root.classList.contains('nav-open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  /* 4. Плавное появление блоков */
  var reveals = $$('.reveal');
  if (hasIO && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* 5. Счётчики в блоке «О себе» */
  var fmt = function (n) { return n.toLocaleString('ru-RU'); };
  function runCounter(el) {
    var target = +el.dataset.count;
    var suffix = el.dataset.suffix || '';
    var t0 = null;
    var step = function (t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 1600);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3)))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  var counters = $$('[data-count]');
  if (hasIO && !reduceMotion) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { el.textContent = '0' + (el.dataset.suffix || ''); cio.observe(el); });
  }

  /* 6. Ленты: кнопки и перетаскивание мышью (пальцем листается само) */
  $$('[data-rail]').forEach(function (rail) {
    var wrap = rail.closest('[data-rail-wrap]');
    var prev = wrap && $('[data-prev]', wrap);
    var next = wrap && $('[data-next]', wrap);
    var stepSize = function () {
      var c = rail.children[0];
      return c ? c.getBoundingClientRect().width + (parseFloat(getComputedStyle(rail).columnGap) || 0) : rail.clientWidth * 0.8;
    };
    var update = function () {
      if (!prev) return;
      prev.disabled = rail.scrollLeft < 4;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    };
    if (prev && next) {
      prev.addEventListener('click', function () { rail.scrollBy({ left: -stepSize(), behavior: 'smooth' }); });
      next.addEventListener('click', function () { rail.scrollBy({ left: stepSize(), behavior: 'smooth' }); });
    }
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    var down = false, moved = false, x0 = 0, s0 = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; x0 = e.clientX; s0 = rail.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 5) { moved = true; rail.classList.add('is-dragging'); }
      if (moved) rail.scrollLeft = s0 - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (!moved) return;
      rail.classList.remove('is-dragging');
      var st = stepSize();
      rail.scrollTo({ left: Math.round(rail.scrollLeft / st) * st, behavior: 'smooth' });
      setTimeout(function () { moved = false; }, 0);
    });
    rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  /* 7. Просмотр фото из галереи */
  var items = $$('.mosaic__item');
  var lb = $('#lightbox');
  if (lb && items.length) {
    var lbImg = $('.lightbox__img', lb);
    var lbCount = $('.lightbox__count', lb);
    var idx = 0;
    var lastFocus = null;
    var show = function (i) {
      idx = (i + items.length) % items.length;
      lbImg.src = items[idx].dataset.full;
      lbImg.alt = $('img', items[idx]).alt;
      lbCount.textContent = (idx + 1) + ' / ' + items.length;
    };
    var open = function (i) {
      lastFocus = document.activeElement;
      show(i);
      lb.hidden = false;
      root.classList.add('lb-open');
      $('.lightbox__close', lb).focus();
    };
    var close = function () {
      lb.hidden = true;
      root.classList.remove('lb-open');
      if (lastFocus) lastFocus.focus();
    };
    items.forEach(function (it, i) { it.addEventListener('click', function () { open(i); }); });
    $('.lightbox__close', lb).addEventListener('click', close);
    $('.lightbox__prev', lb).addEventListener('click', function () { show(idx - 1); });
    $('.lightbox__next', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });

    // Свайп вниз — закрыть, влево/вправо — листать
    var tx = 0, ty = 0;
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchmove', function (e) {
      var dy = e.touches[0].clientY - ty;
      if (dy > 0) {
        lbImg.style.transform = 'translateY(' + dy + 'px)';
        lbImg.style.opacity = String(Math.max(0.4, 1 - dy / 400));
      }
    }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      lbImg.style.transform = '';
      lbImg.style.opacity = '';
      if (dy > 90 && Math.abs(dx) < 80) close();
      else if (Math.abs(dx) > 50 && Math.abs(dy) < 60) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* 8. Форма заявки — демо, ничего не отправляет */
  var form = $('#orderForm');
  if (form) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var d = new Date();
    d.setDate(d.getDate() + 1);
    var minDate = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    form.elements.date.min = minDate;

    // Кнопка «Заказать …» у десерта сразу выбирает его в форме
    $$('[data-product]').forEach(function (a) {
      a.addEventListener('click', function () {
        var r = form.querySelector('input[name="product"][value="' + a.dataset.product + '"]');
        if (r) r.checked = true;
      });
    });

    var setError = function (name, on) {
      var f = form.querySelector('[data-field="' + name + '"]');
      if (f) f.classList.toggle('is-error', on);
      return on;
    };
    var clearError = function (e) {
      var f = e.target.closest('[data-field]');
      if (f) f.classList.remove('is-error');
    };
    form.addEventListener('input', clearError);
    form.addEventListener('change', clearError);

    var success = $('#orderSuccess');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var date = String(fd.get('date') || '');
      var bad = false;
      bad = setError('product', !fd.get('product')) || bad;
      bad = setError('date', !date || date < minDate) || bad;
      bad = setError('name', !String(fd.get('name') || '').trim()) || bad;
      bad = setError('phone', String(fd.get('phone') || '').replace(/\D/g, '').length < 7) || bad;
      if (bad) {
        var first = form.querySelector('.is-error input, .is-error select');
        if (first) first.focus();
        return;
      }
      var when = new Date(date + 'T12:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      $('[data-summary]', success).textContent = fd.get('product') + ' на ' + when + ', ' + String(fd.get('delivery')).toLowerCase();
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
    $('[data-reset]', success).addEventListener('click', function () {
      form.reset();
      success.hidden = true;
      form.hidden = false;
    });
  }

  /* 9. Нижняя панель на телефоне появляется, когда кнопки первого экрана ушли вверх */
  var mbar = $('.mbar');
  var heroCta = $('.hero__cta');
  if (mbar && heroCta && hasIO) {
    new IntersectionObserver(function (en) {
      mbar.classList.toggle('is-visible', !en[0].isIntersecting && en[0].boundingClientRect.top < 0);
    }).observe(heroCta);
  } else if (mbar) {
    mbar.classList.add('is-visible');
  }

  /* 10. Подсветка текущего раздела в меню */
  var links = $$('.nav__list a');
  if (hasIO && links.length) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-active'); });
        if (byId[en.target.id]) byId[en.target.id].classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) sio.observe(s);
    });
  }

  /* 11. Лёгкий параллакс первого экрана — только на компьютере */
  var media = $('.hero__media');
  if (media && !reduceMotion && window.matchMedia('(min-width: 900px)').matches) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, window.innerHeight);
        media.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0)';
        ticking = false;
      });
    }, { passive: true });
  }

  /* 12. Год в подвале */
  var yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
