/* ==========================================================
   1. ΡΥΘΜΙΣΕΙΣ ΚΑΙ ΣΤΟΙΧΕΙΑ ΤΟΥ DOM
   ========================================================== */
const API_URL = 'https://api.thecatapi.com/v1/breeds';
const API_KEY = 'live_ItRkwkOGmuU0FpEReCSHivNYDQMmxHAM58h8aZ5cJlEZJt0Xp2LX0jUZPhmxsXcg';
const PLACEHOLDER_IMG = 'https://placehold.co/400x300?text=No+Image';

const gallery = document.getElementById('gallery');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const toast = document.getElementById('toast');
const loader = document.getElementById('loader');
const countEl = document.getElementById('count');

/* ==========================================================
   2. STATE (οι τρέχουσες επιλογές και τα δεδομένα)
   ========================================================== */
let allBreeds = [];   // όλες οι φυλές, όπως ήρθαν από το API
let searchQuery = ''; // τι έγραψε ο χρήστης
let sortOrder = '';   // '', 'asc' ή 'desc'

/* ==========================================================
   3. ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ
   ========================================================== */

//Υπολογίζει τον μέσο όρο του life span (π.χ. "12 - 15" -> 13.5)
function getAverageLifeSpan(lifeSpan) {
    if (!lifeSpan) return 0;
    const parts = lifeSpan.split(' - ').map(num => parseInt(num.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return (parts[0] + parts[1]) / 2;
    }
    return !isNaN(parts[0]) ? parts[0] : 0;
}

//Εμφανίζει το toast
function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 400);
}

//Εμφανίζει ένα μήνυμα μέσα στο gallery (σφάλμα ή κενά αποτελέσματα)
function showMessage(text) {
    gallery.innerHTML = '';
    const p = document.createElement('p');
    p.classList.add('message');
    p.textContent = text; // textContent: το κείμενο μπαίνει ως απλό κείμενο, όχι ως HTML
    gallery.appendChild(p);
}

//Επιστρέφει την τιμή αν υπάρχει, αλλιώς ένα κείμενο αντικατάστασης
function valueOrFallback(value, fallback = 'Unknown') {
    return value ? value : fallback;
}

//Φτιάχνει ένα στοιχείο με κλάση και κείμενο σε μία γραμμή
function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

/* ==========================================================
   4. ΑΝΑΚΤΗΣΗ ΔΕΔΟΜΕΝΩΝ
   ========================================================== */
async function fetchBreeds() {
    loader.classList.remove('hidden');
    try {
        const response = await fetch(API_URL, {
            headers: { 'x-api-key': API_KEY }
        });

        // Το fetch ΔΕΝ πετάει σφάλμα για 404/500, οπότε το ελέγχουμε εμείς
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        // Περιμένουμε πίνακα φυλών. Αν πάρουμε κάτι άλλο, δεν συνεχίζουμε
        if (!Array.isArray(data)) {
            throw new Error('Unexpected data format from API');
        }

        allBreeds = data;
        updateView();
        setupControls();
    } catch (error) {
        console.error('Failed to fetch breeds:', error);
        showMessage('Oops! Something went wrong while loading cat breeds. Please try again later.');
    } finally {
        loader.classList.add('hidden');
    }
}

/* ==========================================================
   5. ΚΑΡΤΕΣ
   ========================================================== */

//Μικρό «στατιστικό»: ετικέτα + τιμή (π.χ. Weight / 4 - 6 kg)
function createStat(label, value) {
    const stat = createEl('div', 'stat');
    stat.appendChild(createEl('span', null, label));
    stat.appendChild(createEl('strong', null, value));
    return stat;
}

//Διαλέγει την καλύτερη διαθέσιμη εικόνα
function getImageUrl(breed) {
    if (breed.image?.url) return breed.image.url;
    if (breed.reference_image_id) {
        return `https://cdn2.thecatapi.com/images/${breed.reference_image_id}.jpg`;
    }
    return PLACEHOLDER_IMG;
}

//Φτιάχνει ΜΙΑ κάρτα φυλής
function createCard(breed) {
    const card = createEl('article', 'card');

    // 1. Εικόνα + badge
    const media = createEl('div', 'card-media');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = breed.name;
    img.src = getImageUrl(breed);
    img.onerror = () => {
        img.onerror = null; // αποφεύγουμε ατέρμονο βρόχο αν αποτύχει και το placeholder
        img.src = PLACEHOLDER_IMG;
    };
    media.appendChild(img);
    if (breed.life_span) {
        media.appendChild(createEl('span', 'badge', `${breed.life_span} yrs`));
    }
    card.appendChild(media);

    // 2. Περιεχόμενο
    const body = createEl('div', 'card-body');
    body.appendChild(createEl('h2', null, breed.name));
    body.appendChild(createEl('p', 'origin', `📍 ${valueOrFallback(breed.origin)}`));

    const chips = createEl('ul', 'chips');
    (breed.temperament || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .slice(0, 3)
        .forEach(t => chips.appendChild(createEl('li', 'chip', t)));
    body.appendChild(chips);

    const stats = createEl('div', 'stats');
    stats.appendChild(createStat('Weight', breed.weight?.metric ? `${breed.weight.metric} kg` : 'Unknown'));
    stats.appendChild(createStat('Life span', breed.life_span ? `${breed.life_span} years` : 'Unknown'));
    body.appendChild(stats);

    // 3. Ενέργειες
    const actions = createEl('div', 'card-actions');
    if (breed.wikipedia_url) {
        const link = createEl('a', 'card-link', 'Wikipedia ↗');
        link.href = breed.wikipedia_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        actions.appendChild(link);
    }
    // Δύο κλάσεις: "btn" (κοινό στυλ κουμπιού) + "adopt-btn" (ειδική τοποθέτηση)
    const adoptBtn = createEl('button', 'btn adopt-btn', 'Adopt Me');
    adoptBtn.type = 'button';
    adoptBtn.addEventListener('click', () => handleAdopt(breed, adoptBtn));
    actions.appendChild(adoptBtn);
    body.appendChild(actions);

    card.appendChild(body);
    return card;
}

//Εμφανίζει τη λίστα καρτών
function displayBreeds(breeds) {
    gallery.innerHTML = '';
    if (breeds.length === 0) {
        showMessage('No breeds found. Try a different search.');
        return;
    }
    breeds.forEach(breed => gallery.appendChild(createCard(breed)));
}

/* ==========================================================
   6. ΚΟΥΜΠΙ "ADOPT ME"
   ========================================================== */
function handleAdopt(breed, adoptBtn) {
    adoptBtn.disabled = true;
    adoptBtn.textContent = 'Sending...';

    fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breedId: breed.id, name: breed.name })
    })
        .then(() => {
            adoptBtn.textContent = 'Adopted!';
            showToast('Adoption request sent!');
        })
        .catch(() => {
            adoptBtn.textContent = 'Try Again';
            showToast('Something went wrong...');
        })
        .finally(() => {
            setTimeout(() => {
                adoptBtn.textContent = 'Adopt Me';
                adoptBtn.disabled = false;
            }, 3000);
        });
}

/* ==========================================================
   7. ΑΝΑΖΗΤΗΣΗ ΚΑΙ ΤΑΞΙΝΟΜΗΣΗ
   ========================================================== */

//Υπολογίζει ποιες φυλές θα φαίνονται, με βάση ΟΛΕΣ τις τρέχουσες επιλογές
function getVisibleBreeds() {
    // filter() επιστρέφει ΝΕΟ πίνακα, άρα το sort παρακάτω δεν αλλάζει το allBreeds
    const result = allBreeds.filter(b =>
        b.name.toLowerCase().includes(searchQuery)
    );

    if (sortOrder === 'asc') {
        result.sort((a, b) => getAverageLifeSpan(a.life_span) - getAverageLifeSpan(b.life_span));
    } else if (sortOrder === 'desc') {
        result.sort((a, b) => getAverageLifeSpan(b.life_span) - getAverageLifeSpan(a.life_span));
    }
    return result;
}

//Ενημερώνει την οθόνη: μετρητής + κάρτες
function updateView() {
    const visible = getVisibleBreeds();
    countEl.textContent = `${visible.length} ${visible.length === 1 ? 'breed' : 'breeds'}`;
    displayBreeds(visible);
}

//Οι listeners ενημερώνουν μόνο το state και καλούν το updateView
function setupControls() {
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim().toLowerCase();
        updateView();
    });
    sortSelect.addEventListener('change', () => {
        sortOrder = sortSelect.value;
        updateView();
    });
}

/* ==========================================================
   8. ΕΚΚΙΝΗΣΗ
   ========================================================== */
fetchBreeds();