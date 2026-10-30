/* ==========================================================
   ΚΟΙΝΟ LAYOUT: header, navigation, footer και θέμα (dark/light)
   Φορτώνεται από ΚΑΘΕ σελίδα. Για να προσθέσεις ή να αλλάξεις
   link στο menu, αλλάζεις ΜΟΝΟ τον πίνακα NAV_ITEMS.
   ========================================================== */

const NAV_ITEMS = [
    { id: 'cats', label: 'Cats', icon: '🐱', href: 'cats.html' },
    { id: 'dogs', label: 'Dogs', icon: '🐶', href: 'dogs.html' },
    { id: 'map',  label: 'Map',  icon: '🗺️', href: 'map.html' }
];

//Φτιάχνει το header και το βάζει στην αρχή του <body>
function renderHeader() {
    // Η κάθε σελίδα δηλώνει ποια είναι με <body data-page="cats">
    const currentPage = document.body.dataset.page;

    const linksHtml = NAV_ITEMS.map(item => {
        const isCurrent = item.id === currentPage;
        return `
          <li>
            <a class="nav-link" href="${item.href}"${isCurrent ? ' aria-current="page"' : ''}>
              ${item.icon} ${item.label}
            </a>
          </li>`;
    }).join('');

    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="site-header-inner">
        <a class="brand" href="index.html">🐾 Nuzzle<span class="brand-map">Map</span></a>
        <nav class="main-nav" aria-label="Main navigation">
          <ul class="nav-list">${linksHtml}</ul>
        </nav>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="false"></button>
      </div>`;

    document.body.prepend(header);
}

//Φτιάχνει το footer και το βάζει στο τέλος του <body>
function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `<p>🐾 NuzzleMap · © ${new Date().getFullYear()}</p>`;
    document.body.append(footer);
}

//Εφαρμόζει το θέμα και ενημερώνει το κουμπί
function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    const button = document.getElementById('theme-toggle');
    button.setAttribute('aria-pressed', String(isDark));
    button.textContent = isDark ? '☀️ Light' : '🌙 Dark';
}

function setupThemeToggle() {
    const button = document.getElementById('theme-toggle');

    // Το αρχικό θέμα το έβαλε ήδη το μικρό script στο <head>
    applyTheme(document.documentElement.classList.contains('dark'));

    button.addEventListener('click', () => {
        const isDark = !document.documentElement.classList.contains('dark');
        applyTheme(isDark);
        try {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch (e) {
            // Αν ο browser μπλοκάρει το localStorage, το θέμα απλώς δεν θα αποθηκευτεί
        }
    });
}

renderHeader();
renderFooter();
setupThemeToggle();