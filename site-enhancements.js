/* ============================================================
   SITE-ENHANCEMENTS.JS — Adrian R. Tataro Portfolio
   Theme toggle, splash screen, scroll-to-top, page transitions,
   keyboard nav, mobile swipe gestures, gallery filter/search +
   skeleton loading, and share buttons.
   ============================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initSplash();
    initScrollTop();
    initPageTransitions();
    initKeyboardNav();
    initSwipeGestures();
    initGallery();
    initShareResume();
    initSkipLink();
  });

  /* ─────────────────────────────────────────────
     TOAST
  ───────────────────────────────────────────── */
  var toastTimer = null;
  function showToast(message) {
    var toast = document.getElementById('aidi-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'aidi-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2200);
  }

  /* ─────────────────────────────────────────────
     SKIP LINK
  ───────────────────────────────────────────── */
  function initSkipLink() {
    if (document.querySelector('.skip-link')) return;
    var target = document.querySelector('.content') || document.querySelector('main') || document.body;
    if (target && !target.id) target.id = 'main-content';

    var link = document.createElement('a');
    link.className = 'skip-link';
    link.href = '#' + (target ? target.id : 'main-content');
    link.textContent = 'Skip to main content';
    document.body.insertBefore(link, document.body.firstChild);
  }

  /* ─────────────────────────────────────────────
     SPLASH SCREEN
  ───────────────────────────────────────────── */
  function initSplash() {
    var splash = document.getElementById('site-splash');
    if (!splash) return;

    var hidden = false;
    function hideSplash() {
      if (hidden) return;
      hidden = true;
      splash.classList.add('hide');
      setTimeout(function () {
        if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
      }, 600);
    }

    // Hide once the page has fully loaded, but never make people wait
    // more than ~1.4s, and never less than ~450ms (avoids a flash).
    var minTimer = setTimeout(function () {
      if (document.readyState === 'complete') hideSplash();
    }, 450);
    window.addEventListener('load', function () {
      clearTimeout(minTimer);
      setTimeout(hideSplash, 350);
    });
    setTimeout(hideSplash, 1400);
  }

  /* ─────────────────────────────────────────────
     SCROLL TO TOP
  ───────────────────────────────────────────── */
  function initScrollTop() {
    var btn = document.getElementById('scroll-top-btn');
    if (!btn) return;

    function onScroll() {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─────────────────────────────────────────────
     PAGE LOAD / TRANSITION FADE
  ───────────────────────────────────────────── */
  function initPageTransitions() {
    requestAnimationFrame(function () {
      document.body.classList.add('page-loaded');
    });

    var links = document.querySelectorAll('nav .mainMenu li a[href], .box a[href], .download-btn[href]');
    links.forEach(function (link) {
      var href = link.getAttribute('href') || '';
      // Only intercept same-site .html navigations (skip external links,
      // downloads, mailto, anchors, and modified clicks).
      var isInternalHtml = /\.html(\?.*)?(#.*)?$/i.test(href) && !/^https?:\/\//i.test(href);
      if (!isInternalHtml) return;

      link.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        document.body.classList.add('page-fade-out');
        setTimeout(function () {
          window.location.href = href;
        }, 220);
      });
    });
  }

  /* ─────────────────────────────────────────────
     KEYBOARD NAVIGATION
  ───────────────────────────────────────────── */
  function initKeyboardNav() {
    var openMenu = document.querySelector('.openMenu');
    var closeMenu = document.querySelector('.closeMenu');
    var mainMenu = document.querySelector('.mainMenu');

    [openMenu, closeMenu].forEach(function (el) {
      if (!el) return;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          el.click();
        }
      });
    });

    // Escape closes the mobile menu and the AI assistant popup
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (mainMenu && mainMenu.classList.contains('is-open')) {
        mainMenu.classList.remove('is-open');
        if (openMenu) openMenu.focus();
      }
      var aiPopup = document.getElementById('ai-assistant-popup');
      var aiToggle = document.getElementById('ai-assistant-toggle');
      if (aiPopup && aiPopup.classList.contains('open')) {
        aiPopup.classList.remove('open');
        if (aiToggle) aiToggle.focus();
      }
    });

    // Move focus into the drawer when it opens, for keyboard users
    if (openMenu && mainMenu) {
      openMenu.addEventListener('click', function () {
        setTimeout(function () {
          var firstLink = mainMenu.querySelector('li a');
          if (firstLink) firstLink.focus();
        }, 50);
      });
    }
  }

  /* ─────────────────────────────────────────────
     MOBILE SWIPE GESTURES
  ───────────────────────────────────────────── */
  function initSwipeGestures() {
    var mainMenu = document.querySelector('.mainMenu');
    if (!mainMenu) return;

    var startX = null;
    var startY = null;
    var EDGE = 28;
    var THRESHOLD = 55;

    document.addEventListener('touchstart', function (e) {
      if (window.innerWidth > 800) return;
      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (window.innerWidth > 800 || startX === null) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = Math.abs(t.clientY - startY);

      if (dy > 60) { startX = null; return; } // ignore mostly-vertical swipes

      var isOpen = mainMenu.classList.contains('is-open');

      if (isOpen && dx > THRESHOLD) {
        // swipe right closes the drawer
        mainMenu.classList.remove('is-open');
      } else if (!isOpen && dx < -THRESHOLD && (window.innerWidth - startX) <= 40 + EDGE) {
        // swipe left, starting near the right edge, opens the drawer
        mainMenu.classList.add('is-open');
      }
      startX = null;
      startY = null;
    }, { passive: true });
  }

  /* ─────────────────────────────────────────────
     SHARE HELPER (used by gallery + resume)
  ───────────────────────────────────────────── */
  function shareItem(title) {
    var url = window.location.href.split('#')[0];
    var shareData = {
      title: title || document.title,
      text: title ? (title + ' — ' + document.title) : document.title,
      url: url
    };

    if (navigator.share) {
      navigator.share(shareData).catch(function () { /* user cancelled, ignore */ });
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showToast('Link copied to clipboard!');
      }).catch(function () {
        window.prompt('Copy this link:', url);
      });
    } else {
      window.prompt('Copy this link:', url);
    }
  }
  window.AIDIShare = shareItem;

  function initShareResume() {
    var btn = document.getElementById('share-resume-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      shareItem('Adrian R. Tataro — Resume');
    });
  }

  /* ─────────────────────────────────────────────
     GALLERY: SKELETON LOADING + FILTER/SEARCH + SHARE
  ───────────────────────────────────────────── */
  function initGallery() {
    var container = document.querySelector('.gallery-container');
    if (!container) return;

    var polaroids = Array.prototype.slice.call(container.querySelectorAll('.polaroid'));
    if (!polaroids.length) return;

    /* -- Skeleton loading -- */
    polaroids.forEach(function (card) {
      var img = card.querySelector('img');
      if (!img) return;
      if (img.complete && img.naturalWidth) return; // already cached/loaded
      img.classList.add('img-loading');
      img.addEventListener('load', function () { img.classList.remove('img-loading'); });
      img.addEventListener('error', function () { img.classList.remove('img-loading'); });
    });

    /* -- Inject a share button onto each photo -- */
    polaroids.forEach(function (card) {
      if (card.querySelector('.polaroid-share-btn')) return;
      var caption = card.querySelector('.container p');
      var label = caption ? caption.textContent.trim() : 'Photo';
      var btn = document.createElement('button');
      btn.className = 'polaroid-share-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Share ' + label + ' photo');
      btn.innerHTML = '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i>';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        shareItem(label + ' photo');
      });
      card.appendChild(btn);
    });

    /* -- Build category list from existing captions -- */
    var categories = [];
    polaroids.forEach(function (card) {
      var caption = card.querySelector('.container p');
      var cat = caption ? caption.textContent.trim() : '';
      card.setAttribute('data-category', cat);
      if (cat && categories.indexOf(cat) === -1) categories.push(cat);
    });

    if (!categories.length) return;

    /* -- Build filter/search bar -- */
    var bar = document.createElement('div');
    bar.className = 'gallery-filter-bar';
    bar.innerHTML =
      '<div class="gallery-search-row">' +
        '<input type="text" id="gallery-search-input" placeholder="Search photos (e.g. Grade 12, LCR, Pets)..." aria-label="Search gallery photos">' +
      '</div>' +
      '<div class="gallery-filter-chips" role="group" aria-label="Filter photos by category"></div>';

    container.parentNode.insertBefore(bar, container);

    var emptyMsg = document.createElement('p');
    emptyMsg.className = 'gallery-filter-empty';
    emptyMsg.textContent = 'No photos match your search.';
    container.parentNode.insertBefore(emptyMsg, container.nextSibling);

    var chipsWrap = bar.querySelector('.gallery-filter-chips');
    var searchInput = bar.querySelector('#gallery-search-input');

    var allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.textContent = 'All';
    allChip.className = 'active';
    allChip.setAttribute('data-cat', '__all__');
    chipsWrap.appendChild(allChip);

    categories.forEach(function (cat) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = cat;
      chip.setAttribute('data-cat', cat);
      chipsWrap.appendChild(chip);
    });

    var activeCategory = '__all__';

    function applyFilter() {
      var query = (searchInput.value || '').trim().toLowerCase();
      var visibleCount = 0;

      polaroids.forEach(function (card) {
        var cat = card.getAttribute('data-category') || '';
        var matchesCategory = activeCategory === '__all__' || cat === activeCategory;
        var matchesSearch = !query || cat.toLowerCase().indexOf(query) !== -1;
        var visible = matchesCategory && matchesSearch;
        card.classList.toggle('is-hidden', !visible);
        if (visible) visibleCount++;
      });

      emptyMsg.classList.toggle('show', visibleCount === 0);
    }

    chipsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-cat]');
      if (!btn) return;
      activeCategory = btn.getAttribute('data-cat');
      chipsWrap.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      applyFilter();
    });

    searchInput.addEventListener('input', applyFilter);
  }
})();
