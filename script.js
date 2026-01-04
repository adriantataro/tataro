
const mainMenu = document.querySelector(".mainMenu")
const closeMenu = document.querySelector(".closeMenu")
const openMenu = document.querySelector(".openMenu")
const menu_items = document.querySelectorAll("nav .mainMenu li a")

// Guard attachments so script doesn't throw on pages without these elements
if (openMenu) openMenu.addEventListener("click", show)
if (closeMenu) closeMenu.addEventListener("click", close)

// Close menu when you click on a menu item
if (menu_items && menu_items.length) {
  menu_items.forEach((item) => {
    item.addEventListener("click", () => {
      close()
    })
  })
}

function show() {
  if (!mainMenu) return
  mainMenu.classList.add("is-open")
}

function close() {
  if (!mainMenu) return
  mainMenu.classList.remove("is-open")
}

// Ensure desktop layout is always visible and reset mobile state on resize
window.addEventListener("resize", () => {
  if (!mainMenu) return
  if (window.innerWidth > 800) {
    mainMenu.classList.remove("is-open")
  }
})























/* Slideshow JS removed (slideshow functionality was deleted). */
















  /* Auto-update copyright year in index.html */
  (function autoUpdateCopyrightYear(){
    try {
      const el = document.getElementById('year');
      if (!el) return;
      const setYear = () => { el.textContent = new Date().getFullYear(); };
      setYear();

      // Schedule next update exactly at the start of the next year (local time)
      const MAX_TIMEOUT = 2147483647; // max setTimeout on many browsers (~24.8 days)
      function scheduleNext() {
        const now = new Date();
        const nextJan1 = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
        let ms = nextJan1 - now;
        if (ms <= 0) {
          // if somehow non-positive, update immediately and reschedule
          setYear();
          ms = 1000;
        }
        // If ms is larger than the max timeout, schedule a nearer wake-up to re-evaluate
        if (ms > MAX_TIMEOUT) {
          setTimeout(scheduleNext, MAX_TIMEOUT);
        } else {
          setTimeout(() => { setYear(); scheduleNext(); }, ms);
        }
      }
      scheduleNext();
    } catch (e) { /* ignore on pages without the element */ }
  })();

  /* Total run time display for about.html */
  (function runTimeCounter(){
    const el = document.getElementById('runTime');
    if (!el) return;
    // If an inline fallback is already managing updates, don't start another interval
    if (window.__runTimeManaged) return;

    // Read start from data-start attribute (ISO-like string). Default: 2020-01-01
    const startAttr = (el.getAttribute('data-start') || '2020-01-01T00:00:00Z').trim();
    let start = new Date(startAttr);
    // Accept common shortened formats like YYYY or YYYY-MM by normalizing them
    if (isNaN(start)) {
      if (/^\d{4}-\d{2}$/.test(startAttr)) {
        // YYYY-MM -> YYYY-MM-01T00:00:00Z
        start = new Date(startAttr + '-01T00:00:00Z');
      } else if (/^\d{4}$/.test(startAttr)) {
        // YYYY -> YYYY-01-01T00:00:00Z
        start = new Date(startAttr + '-01-01T00:00:00Z');
      }
    }
    if (isNaN(start)) {
      el.textContent = 'Invalid start date';
      return;
    }

    function computeParts(start, now) {
      // compute full years elapsed (exact, accounting for leap years)
      let years = now.getFullYear() - start.getFullYear();
      const anniv = new Date(start);
      anniv.setFullYear(start.getFullYear() + years);
      if (anniv > now) {
        years--;
        anniv.setFullYear(start.getFullYear() + years);
      }
      // days since last anniversary
      const msSinceAnniv = now - anniv;
      const days = Math.floor(msSinceAnniv / (24*3600*1000));
      let rem = msSinceAnniv - days * 24*3600*1000;
      const hours = Math.floor(rem / (3600*1000)); rem -= hours * 3600*1000;
      const minutes = Math.floor(rem / (60*1000)); rem -= minutes * 60*1000;
      const seconds = Math.floor(rem / 1000);
      return { years, days, hours, minutes, seconds };
    }

    function formatParts(p) {
      const parts = [];
      if (p.years) parts.push(p.years + 'y');
      if (p.days || p.years) parts.push(p.days + 'd');
      parts.push(String(p.hours).padStart(2,'0') + 'h');
      parts.push(String(p.minutes).padStart(2,'0') + 'm');
      parts.push(String(p.seconds).padStart(2,'0') + 's');
      return parts.join(' ');
    }

    function update() {
      const now = new Date();
      const p = computeParts(start, now);
      el.textContent = formatParts(p);
    }

    update();
    setInterval(update, 1000);
  })();