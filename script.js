
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
  if (!mainMenu) return;
  mainMenu.style.display = "flex"
  mainMenu.style.top = "0"
}

function close() {
  if (!mainMenu) return;
  mainMenu.style.top = "-100%"
}

// Add resize event listener to handle menu visibility on screen size change
window.addEventListener("resize", () => {
  if (!mainMenu) return;
  if (window.innerWidth > 800) {
    mainMenu.style.display = "flex"
    mainMenu.style.top = "0"
  } else {
    mainMenu.style.display = "none"
    mainMenu.style.top = "-100%"
  }
})























/* Slideshow JS removed (slideshow functionality was deleted). */
















  /* Auto-update copyright year in index.html */
  (function updateCopyrightYear(){
    try {
      const el = document.getElementById('year');
      if (el) el.textContent = new Date().getFullYear();
    } catch (e) { /* ignore on pages without the element */ }
  })();

  /* Total run time display for about.html */
  (function runTimeCounter(){
    const el = document.getElementById('runTime');
    if (!el) return;

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

    function formatElapsed(ms) {
      const totalSec = Math.floor(ms / 1000);
      const years = Math.floor(totalSec / (3600*24*365));
      const days = Math.floor((totalSec % (3600*24*365)) / (3600*24));
      const hours = Math.floor((totalSec % (3600*24)) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      const parts = [];
      if (years) parts.push(years + 'y');
      if (days) parts.push(days + 'd');
      parts.push(String(hours).padStart(2,'0') + 'h');
      parts.push(String(minutes).padStart(2,'0') + 'm');
      parts.push(String(seconds).padStart(2,'0') + 's');
      return parts.join(' ');
    }

    function update() {
      const now = new Date();
      const elapsed = now - start;
      el.textContent = formatElapsed(elapsed);
    }

    update();
    setInterval(update, 1000);
  })();