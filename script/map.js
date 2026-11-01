/* ==========================================================
   INTERACTIVE MAP
   Εμφανίζει τα σημεία του data/places.json σε χάρτη Leaflet
   και σε λίστα καρτών. Φίλτρα, αναζήτηση και χάρτης δουλεύουν μαζί.
   ========================================================== */
import { createEl } from './lib/dom.js';
import { fetchJson, getFriendlyError } from './lib/api.js';
import { createMessage } from './lib/messages.js';
import { safeHttpUrl, phoneHref } from './lib/security.js';

/* ==========================================================
   1. ΡΥΘΜΙΣΕΙΣ
   ========================================================== */
const DATA_URL = 'data/places.json';

// Το URL των tiles σε ΜΙΑ σταθερά, ώστε να αλλάζει εύκολα ο πάροχος
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const GREECE_CENTER = [39.0, 23.0]; // [lat, lng]
const GREECE_ZOOM = 6;

// Περίπου τα όρια της Ελλάδας. Σημεία εκτός αυτών θεωρούνται λάθος δεδομένα.
const GREECE_BOUNDS = { minLat: 34.5, maxLat: 42, minLng: 19, maxLng: 30 };

const CATEGORIES = {
    organization: { label: 'Animal welfare organisation', icon: '🤝' },
    shelter:      { label: 'Shelter',                     icon: '🏠' },
    shop:         { label: 'Pet shop & business',         icon: '🛍️' },
    friendly:     { label: 'Pet-friendly place',          icon: '☕' }
};

const DESKTOP_QUERY = '(min-width: 900px)';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ==========================================================
   2. ΣΤΟΙΧΕΙΑ DOM ΚΑΙ STATE
   ========================================================== */
const listEl = document.getElementById('places-list');
const searchInput = document.getElementById('search');
const categorySelect = document.getElementById('filter-category');
const regionSelect = document.getElementById('filter-region');
const countEl = document.getElementById('count');
const loader = document.getElementById('loader');

let allPlaces = [];
let activeId = null;       // ποιο σημείο είναι επιλεγμένο
let markersById = {};      // id -> marker του Leaflet
let regionsBuilt = false;

const state = { query: '', category: '', region: '' };

/* ==========================================================
   3. ΜΗΝΥΜΑΤΑ ΣΤΗ ΛΙΣΤΑ
   ========================================================== */
function showListMessage(text, action, role) {
    const item = createEl('li', 'places-empty');
    item.appendChild(createMessage(text, action, role));
    listEl.replaceChildren(item);
}

// Αν η βιβλιοθήκη Leaflet δεν φορτώθηκε (π.χ. μπλοκάρισμα CDN), δεν συνεχίζουμε
if (typeof L === 'undefined') {
    showListMessage('The map library could not be loaded. Check your connection and refresh the page.', null, 'alert');
    loader.classList.add('hidden');
    throw new Error('Leaflet (L) is not available');
}

/* ==========================================================
   4. Ο ΧΑΡΤΗΣ
   ========================================================== */
const map = L.map('map', { minZoom: 5 }).setView(GREECE_CENTER, GREECE_ZOOM);

L.tileLayer(TILE_URL, {
    maxZoom: 19,
    attribution: TILE_ATTRIBUTION
}).addTo(map);

// Ομάδα στρώματος: εδώ μπαίνουν ΟΛΑ τα markers, και τα αδειάζουμε με μία κίνηση
const markersLayer = L.layerGroup().addTo(map);

/* ==========================================================
   5. ΕΛΕΓΧΟΣ ΚΑΙ ΚΑΝΟΝΙΚΟΠΟΙΗΣΗ ΔΕΔΟΜΕΝΩΝ
   ========================================================== */

//Μετατρέπει μια εγγραφή στο σχήμα που χρησιμοποιεί η σελίδα
function normalizePlace(raw) {
    return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? '').trim(),
        category: raw.category,
        region: raw.region || 'Other',
        city: raw.city || null,
        address: raw.address || null,
        lat: Number(raw.lat),
        lng: Number(raw.lng),
        description: raw.description || null,
        phone: raw.phone || null,
        website: safeHttpUrl(raw.website) // μόνο http/https, αλλιώς null
    };
}

//Είναι η εγγραφή αρκετά σωστή ώστε να τη δείξουμε;
function isValidPlace(place) {
    const b = GREECE_BOUNDS;
    const hasValidCoords =
        Number.isFinite(place.lat) && Number.isFinite(place.lng) &&
        place.lat >= b.minLat && place.lat <= b.maxLat &&
        place.lng >= b.minLng && place.lng <= b.maxLng;

    return Boolean(place.id && place.name && CATEGORIES[place.category] && hasValidCoords);
}

function formatAddress(place) {
    return [place.address, place.city, place.region].filter(Boolean).join(', ');
}

//Πεζά και χωρίς τόνους, ώστε "αθηνα" να βρίσκει "Αθήνα"
function fold(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* ==========================================================
   6. ΚΑΡΤΕΣ ΚΑΙ POPUPS
   ========================================================== */

//Σύνδεσμοι επικοινωνίας (κοινοί για κάρτα και popup)
function createContactLinks(place) {
    const box = createEl('div', 'contact');

    const tel = phoneHref(place.phone);
    if (tel) {
        const phoneLink = createEl('a', null, `📞 ${place.phone}`);
        phoneLink.href = tel;
        box.appendChild(phoneLink);
    }

    if (place.website) {
        const webLink = createEl('a', null, '🌐 Website');
        webLink.href = place.website;
        webLink.target = '_blank';
        webLink.rel = 'noopener noreferrer';
        box.appendChild(webLink);
    }
    return box;
}

function createPlaceCard(place) {
    const category = CATEGORIES[place.category];

    const card = createEl('li', 'place-card');
    card.dataset.id = place.id;
    if (place.id === activeId) card.classList.add('is-active');

    card.appendChild(createEl('span', `place-tag place-tag--${place.category}`, `${category.icon} ${category.label}`));
    card.appendChild(createEl('h2', null, place.name));
    card.appendChild(createEl('p', 'place-address', `📍 ${formatAddress(place)}`));

    if (place.description) {
        card.appendChild(createEl('p', 'place-description', place.description));
    }

    card.appendChild(createContactLinks(place));

    const showBtn = createEl('button', 'btn btn--ghost', 'Show on map');
    showBtn.type = 'button';
    showBtn.setAttribute('aria-label', `Show ${place.name} on the map`);
    showBtn.addEventListener('click', () => focusPlace(place.id));
    card.appendChild(showBtn);

    return card;
}

//Το περιεχόμενο του popup χτίζεται ως στοιχείο DOM (όχι ως κείμενο HTML)
function createPopupContent(place) {
    const category = CATEGORIES[place.category];
    const box = createEl('div', 'popup');
    box.appendChild(createEl('strong', 'popup-title', place.name));
    box.appendChild(createEl('span', 'popup-category', `${category.icon} ${category.label}`));
    box.appendChild(createEl('p', null, formatAddress(place)));
    box.appendChild(createContactLinks(place));
    return box;
}

/* ==========================================================
   7. MARKERS
   ========================================================== */
function createIcon(categoryKey) {
    return L.divIcon({
        className: `pin pin--${categoryKey}`, // αντικαθιστά το προεπιλεγμένο λευκό τετράγωνο
        html: `<span aria-hidden="true">${CATEGORIES[categoryKey].icon}</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],    // το «σημείο» του marker: το κέντρο του κύκλου
        popupAnchor: [0, -20]    // πού «δείχνει» η ουρά του popup
    });
}

function createMarker(place) {
    const marker = L.marker([place.lat, place.lng], {
        icon: createIcon(place.category),
        title: place.name
    });

    marker.bindPopup(createPopupContent(place), { maxWidth: 260 });

    // Όταν το marker μπει στον χάρτη, δίνουμε όνομα στους screen readers
    marker.on('add', () => marker.getElement()?.setAttribute('aria-label', place.name));

    // Ανοίγει το popup (με κλικ ή από τον κώδικα): τονίζουμε την αντίστοιχη κάρτα
    marker.on('popupopen', () => setActive(place.id));
    marker.on('popupclose', () => {
        if (activeId === place.id) setActive(null);
    });

    return marker;
}

/* ==========================================================
   8. ΣΥΓΧΡΟΝΙΣΜΟΣ ΛΙΣΤΑΣ ΚΑΙ ΧΑΡΤΗ
   ========================================================== */

//Τονίζει την κάρτα του επιλεγμένου σημείου (και την κυλά στο ορατό μέρος, στον υπολογιστή)
function setActive(id) {
    activeId = id;

    let activeCard = null;
    listEl.querySelectorAll('.place-card').forEach(card => {
        const isActive = card.dataset.id === id;
        card.classList.toggle('is-active', isActive);
        if (isActive) activeCard = card;
    });

    // Στο κινητό η λίστα είναι κάτω από τον χάρτη: δεν θέλουμε να κυλήσει η σελίδα μακριά από αυτόν
    if (activeCard && window.matchMedia(DESKTOP_QUERY).matches) {
        activeCard.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
}

//Κλικ σε κάρτα: πετάμε στο σημείο και ανοίγουμε το popup
function focusPlace(id) {
    const marker = markersById[id];
    const place = allPlaces.find(p => p.id === id);
    if (!marker || !place) return;

    // Στο κινητό ο χάρτης είναι πάνω από τη λίστα: τον φέρνουμε στην οθόνη
    if (!window.matchMedia(DESKTOP_QUERY).matches) {
        document.getElementById('map').scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    // Το popup ανοίγει ΜΕΤΑ το τέλος της κίνησης, αλλιώς το αυτόματο pan μπλέκεται με αυτήν
    map.once('moveend', () => marker.openPopup());
    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 13), { animate: !reduceMotion });
}

/* ==========================================================
   9. ΦΙΛΤΡΑ, ΑΝΑΖΗΤΗΣΗ, ΕΜΦΑΝΙΣΗ
   ========================================================== */
function matchesQuery(place) {
    if (!state.query) return true;
    const haystack = fold(
        [place.name, place.city, place.address, place.region, place.description]
            .filter(Boolean)
            .join(' ')
    );
    return haystack.includes(state.query);
}

function getVisiblePlaces() {
    return allPlaces.filter(place =>
        matchesQuery(place) &&
        (!state.category || place.category === state.category) &&
        (!state.region || place.region === state.region)
    );
}

function renderList(places) {
    if (places.length === 0) {
        showListMessage(
            'No places match your search and filters.',
            { label: 'Clear filters', onClick: resetFilters }
        );
        return;
    }
    listEl.replaceChildren(...places.map(createPlaceCard));
}

function renderMarkers(places) {
    markersLayer.clearLayers(); // αφαιρεί τα παλιά markers (και κλείνει τα popups τους)
    markersById = {};

    places.forEach(place => {
        const marker = createMarker(place);
        markersById[place.id] = marker;
        markersLayer.addLayer(marker);
    });
}

//Προσαρμόζει την προβολή ώστε να χωράνε όλα τα ορατά σημεία
function fitToPlaces(places) {
    if (places.length === 0) return;
    const bounds = L.latLngBounds(places.map(place => [place.lat, place.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
}

function updateView() {
    if (allPlaces.length === 0) return; // δεν έχουμε δεδομένα: δεν πειράζουμε τα μηνύματα

    const visible = getVisiblePlaces();

    if (activeId && !visible.some(place => place.id === activeId)) {
        activeId = null;
    }

    countEl.textContent = `${visible.length} ${visible.length === 1 ? 'place' : 'places'}`;
    renderList(visible);
    renderMarkers(visible);
    fitToPlaces(visible);
}

function resetFilters() {
    state.query = '';
    state.category = '';
    state.region = '';
    searchInput.value = '';
    categorySelect.value = '';
    regionSelect.value = '';
    updateView();
}

function setupControls() {
    // Οι κατηγορίες είναι γνωστές εκ των προτέρων
    Object.entries(CATEGORIES).forEach(([key, category]) => {
        categorySelect.append(new Option(`${category.icon} ${category.label}`, key));
    });

    searchInput.addEventListener('input', () => {
        state.query = fold(searchInput.value.trim());
        updateView();
    });

    categorySelect.addEventListener('change', () => {
        state.category = categorySelect.value;
        updateView();
    });

    regionSelect.addEventListener('change', () => {
        state.region = regionSelect.value;
        updateView();
    });
}

//Οι περιοχές βγαίνουν από τα ίδια τα δεδομένα
function buildRegionOptions() {
    const regions = [...new Set(allPlaces.map(place => place.region))].sort((a, b) => a.localeCompare(b));
    regions.forEach(region => regionSelect.append(new Option(region, region)));
}

/* ==========================================================
   10. ΑΝΑΚΤΗΣΗ ΔΕΔΟΜΕΝΩΝ
   ========================================================== */
async function load() {
    loader.classList.remove('hidden');
    try {
        const data = await fetchJson(DATA_URL);

        if (!Array.isArray(data)) {
            throw new Error('Unexpected data format');
        }

        allPlaces = data.map(normalizePlace).filter(place => {
            const valid = isValidPlace(place);
            if (!valid) console.warn('Skipped invalid place:', place);
            return valid;
        });

        if (allPlaces.length === 0) {
            showListMessage('No places available yet.');
            return;
        }

        if (!regionsBuilt) {
            buildRegionOptions();
            regionsBuilt = true;
        }

        updateView();
    } catch (error) {
        console.error('Failed to load places:', error);
        countEl.textContent = '';
        showListMessage(getFriendlyError(error, 'places'), { label: 'Try again', onClick: load }, 'alert');
    } finally {
        loader.classList.add('hidden');
    }
}

/* ==========================================================
   11. ΕΚΚΙΝΗΣΗ
   ========================================================== */
setupControls();
load();