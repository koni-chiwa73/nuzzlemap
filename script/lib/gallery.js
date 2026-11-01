/* ==========================================================
   ΚΟΙΝΗ ΓΚΑΛΕΡΙΑ ΦΥΛΩΝ
   Χρησιμοποιείται από τις γάτες και τους σκύλους.

   Κάθε σελίδα καλεί initGallery({...}) και δίνει:
     apiUrl, apiKey   : από πού έρχονται τα δεδομένα
     subject          : κείμενο για τα μηνύματα (π.χ. 'dog breeds')
     normalize        : συνάρτηση που μετατρέπει ΜΙΑ φυλή στο κοινό σχήμα
     sortOptions      : οι επιλογές ταξινόμησης
     filters          : τα φίλτρα (προαιρετικά)
     showAdopt        : true/false για το κουμπί "Adopt Me"

   Το κοινό σχήμα μιας φυλής (αυτό που επιστρέφει η normalize):
   {
     id, name,
     origin:        string | null,
     temperament:   string[],
     lifeSpan:      { text, avg } | null,
     weight:        { text, avg } | null,   (σε kg)
     size:          string | null,
     group:         string | null,
     imageUrl:      string | null,
     wikipediaUrl:  string | null,
     description:   string | null,
     details:       [{ label, value }]      (για το παράθυρο λεπτομερειών)
   }
   ========================================================== */
import { createEl } from './dom.js';
import { fetchJson, getFriendlyError } from './api.js';
import { compareNullable } from './data.js';
import { showToast, TOAST_DURATION } from './toast.js';

const PLACEHOLDER_IMG = 'https://placehold.co/400x300?text=No+Image';

export function initGallery(config) {
    const {
        apiUrl,
        apiKey,
        subject,
        normalize,
        sortOptions = [],
        filters = [],
        showAdopt = true
    } = config;

    /* ---------- Στοιχεία του DOM ---------- */
    const gallery = document.getElementById('gallery');
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort');
    const filtersBox = document.getElementById('filters');
    const countEl = document.getElementById('count');
    const loader = document.getElementById('loader');
    const dialog = document.getElementById('details-dialog');

    /* ---------- State ---------- */
    let allBreeds = [];
    let filtersBuilt = false;
    const state = {
        query: '',    // τι έγραψε ο χρήστης
        sort: '',     // το id της ταξινόμησης που διάλεξε
        filters: {}   // π.χ. { group: 'Toy', size: '' }
    };

    /* ==========================================================
       ΜΗΝΥΜΑΤΑ
       ========================================================== */

    //Εμφανίζει μήνυμα μέσα στο gallery. Αν δοθεί onRetry, προστίθεται κουμπί επανάληψης.
    function showMessage(text, onRetry) {
        gallery.innerHTML = '';

        const box = createEl('div', 'message');
        box.appendChild(createEl('p', null, text)); // textContent: ασφαλές, απλό κείμενο

        if (onRetry) {
            box.setAttribute('role', 'alert');
            const retryBtn = createEl('button', 'btn', 'Try again');
            retryBtn.type = 'button';
            retryBtn.addEventListener('click', onRetry);
            box.appendChild(retryBtn);
        }

        gallery.appendChild(box);
    }

    /* ==========================================================
       ΚΑΡΤΕΣ
       ========================================================== */

    function createImage(breed) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = breed.name;
        img.src = breed.imageUrl || PLACEHOLDER_IMG;
        img.onerror = () => {
            img.onerror = null; // αποφεύγουμε ατέρμονο βρόχο
            img.src = PLACEHOLDER_IMG;
        };
        return img;
    }

    //Μικρό «στατιστικό»: ετικέτα + τιμή
    function createStat(label, value) {
        const stat = createEl('div', 'stat');
        stat.appendChild(createEl('span', null, label));
        stat.appendChild(createEl('strong', null, value));
        return stat;
    }

    //Φτιάχνει ΜΙΑ κάρτα φυλής
    function createCard(breed) {
        const card = createEl('article', 'card');

        // 1. Εικόνα + badges
        const media = createEl('div', 'card-media');
        media.appendChild(createImage(breed));
        if (breed.group) {
            media.appendChild(createEl('span', 'badge badge--left', breed.group));
        }
        if (breed.lifeSpan) {
            media.appendChild(createEl('span', 'badge', `${breed.lifeSpan.text} yrs`));
        }
        card.appendChild(media);

        // 2. Περιεχόμενο
        const body = createEl('div', 'card-body');
        body.appendChild(createEl('h2', null, breed.name));
        body.appendChild(createEl('p', 'origin', `📍 ${breed.origin || 'Unknown'}`));

        const chips = createEl('ul', 'chips');
        breed.temperament
            .slice(0, 3)
            .forEach(t => chips.appendChild(createEl('li', 'chip', t)));
        body.appendChild(chips);

        const stats = createEl('div', 'stats');
        const weightLabel = breed.size ? `Weight · ${breed.size}` : 'Weight';
        stats.appendChild(createStat(weightLabel, breed.weight ? `${breed.weight.text} kg` : 'Unknown'));
        stats.appendChild(createStat('Life span', breed.lifeSpan ? `${breed.lifeSpan.text} years` : 'Unknown'));
        body.appendChild(stats);

        // 3. Ενέργειες
        const actions = createEl('div', 'card-actions');

        const detailsBtn = createEl('button', 'btn btn--ghost', 'Details');
        detailsBtn.type = 'button';
        detailsBtn.setAttribute('aria-label', `More details about ${breed.name}`);
        detailsBtn.addEventListener('click', () => openDetails(breed));
        actions.appendChild(detailsBtn);

        if (showAdopt) {
            const adoptBtn = createEl('button', 'btn adopt-btn', 'Adopt Me');
            adoptBtn.type = 'button';
            adoptBtn.addEventListener('click', () => handleAdopt(breed, adoptBtn));
            actions.appendChild(adoptBtn);
        }
        body.appendChild(actions);

        card.appendChild(body);
        return card;
    }

    //Εμφανίζει τη λίστα καρτών
    function displayBreeds(breeds) {
        gallery.innerHTML = '';
        if (breeds.length === 0) {
            showMessage(
                state.query
                    ? `No breeds found for "${state.query}". Try a different search or filter.`
                    : 'No breeds match these filters.'
            );
            return;
        }
        breeds.forEach(breed => gallery.appendChild(createCard(breed)));
    }

    /* ==========================================================
       ΠΑΡΑΘΥΡΟ ΛΕΠΤΟΜΕΡΕΙΩΝ (<dialog>)
       ========================================================== */
    function openDetails(breed) {
        const inner = dialog.querySelector('.details-inner');
        inner.innerHTML = '';

        const closeBtn = createEl('button', 'details-close', '✕');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close details');
        closeBtn.addEventListener('click', () => dialog.close());

        const media = createEl('div', 'details-media');
        media.appendChild(createImage(breed));

        const content = createEl('div', 'details-content');
        const title = createEl('h2', null, breed.name);
        title.id = 'details-title'; // το χρησιμοποιεί το aria-labelledby του dialog
        content.appendChild(title);

        if (breed.description) {
            content.appendChild(createEl('p', 'details-description', breed.description));
        }

        if (breed.temperament.length > 0) {
            const chips = createEl('ul', 'chips');
            breed.temperament.forEach(t => chips.appendChild(createEl('li', 'chip', t)));
            content.appendChild(chips);
        }

        // <dl> = λίστα ορισμών: <dt> ο όρος, <dd> η τιμή
        const list = createEl('dl', 'details-list');
        breed.details
            .filter(item => item.value) // κρύβουμε ό,τι λείπει
            .forEach(item => {
                const row = createEl('div', 'details-row');
                row.appendChild(createEl('dt', null, item.label));
                row.appendChild(createEl('dd', null, item.value));
                list.appendChild(row);
            });
        content.appendChild(list);

        if (breed.wikipediaUrl) {
            const link = createEl('a', 'btn', 'Read on Wikipedia ↗');
            link.href = breed.wikipediaUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            content.appendChild(link);
        }

        inner.append(closeBtn, media, content);
        dialog.showModal(); // ανοίγει ως modal: κλείδωμα εστίασης, Esc για κλείσιμο
    }

    /* ==========================================================
       ΚΟΥΜΠΙ "ADOPT ME"
       ========================================================== */
    async function handleAdopt(breed, adoptBtn) {
        adoptBtn.disabled = true;
        adoptBtn.textContent = 'Sending...';

        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ breedId: breed.id, name: breed.name })
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            adoptBtn.textContent = 'Requested ✓';
            showToast(`Adoption request for ${breed.name} sent!`, 'success');

            setTimeout(() => {
                adoptBtn.textContent = 'Adopt Me';
                adoptBtn.disabled = false;
            }, TOAST_DURATION);
        } catch (error) {
            console.error('Adoption request failed:', error);
            showToast('Something went wrong. Please try again.', 'error');
            adoptBtn.textContent = 'Try Again';
            adoptBtn.disabled = false;
        }
    }

    /* ==========================================================
       ΑΝΑΖΗΤΗΣΗ, ΦΙΛΤΡΑ, ΤΑΞΙΝΟΜΗΣΗ
       ========================================================== */

    //Ταιριάζει η φυλή με το κείμενο αναζήτησης; (αλλάξτε εδώ για να ψάχνει και αλλού)
    function matchesQuery(breed) {
        return breed.name.toLowerCase().includes(state.query);
    }

    //Ταιριάζει η φυλή με ΟΛΑ τα ενεργά φίλτρα;
    function matchesFilters(breed) {
        return filters.every(filter => {
            const chosen = state.filters[filter.id];
            return !chosen || filter.getValue(breed) === chosen;
        });
    }

    //Υπολογίζει ποιες φυλές θα φαίνονται, με βάση ΟΛΕΣ τις τρέχουσες επιλογές
    function getVisibleBreeds() {
        const result = allBreeds.filter(breed => matchesQuery(breed) && matchesFilters(breed));

        const sortOption = sortOptions.find(option => option.id === state.sort);
        if (sortOption) {
            result.sort((a, b) =>
                compareNullable(sortOption.getValue(a), sortOption.getValue(b), sortOption.direction)
            );
        }
        return result;
    }

    //Ενημερώνει την οθόνη: μετρητής + κάρτες
    function updateView() {
        if (allBreeds.length === 0) return; // δεν έχουμε δεδομένα: δεν πειράζουμε το μήνυμα σφάλματος

        const visible = getVisibleBreeds();
        countEl.textContent = `${visible.length} ${visible.length === 1 ? 'breed' : 'breeds'}`;
        displayBreeds(visible);
    }

    //Φτιάχνει τα φίλτρα από τις ΤΙΜΕΣ που υπάρχουν στα δεδομένα
    function buildFilters() {
        filters.forEach(filter => {
            const select = createEl('select', 'control');
            select.setAttribute('aria-label', filter.label);
            select.append(new Option(filter.label, ''));

            // Set = συλλογή μοναδικών τιμών (χωρίς διπλότυπα)
            const values = [...new Set(allBreeds.map(breed => filter.getValue(breed)).filter(Boolean))];
            values.sort(
                filter.order
                    ? (a, b) => filter.order.indexOf(a) - filter.order.indexOf(b)
                    : (a, b) => a.localeCompare(b)
            );
            values.forEach(value => select.append(new Option(value, value)));

            state.filters[filter.id] = '';
            select.addEventListener('change', () => {
                state.filters[filter.id] = select.value;
                updateView();
            });

            filtersBox.appendChild(select);
        });
    }

    //Οι listeners ενημερώνουν μόνο το state και καλούν το updateView
    function setupControls() {
        sortSelect.append(new Option('Sort by…', ''));
        sortOptions.forEach(option => sortSelect.append(new Option(option.label, option.id)));

        searchInput.addEventListener('input', () => {
            state.query = searchInput.value.trim().toLowerCase();
            updateView();
        });

        sortSelect.addEventListener('change', () => {
            state.sort = sortSelect.value;
            updateView();
        });

        // Κλικ στο φόντο (backdrop) κλείνει το παράθυρο λεπτομερειών
        dialog.addEventListener('click', event => {
            if (event.target === dialog) dialog.close();
        });
    }

    /* ==========================================================
       ΑΝΑΚΤΗΣΗ ΔΕΔΟΜΕΝΩΝ
       ========================================================== */
    async function load() {
        loader.classList.remove('hidden');
        try {
            const data = await fetchJson(apiUrl, { 'x-api-key': apiKey });

            if (!Array.isArray(data)) {
                throw new Error('Unexpected data format from API');
            }

            // Μετατροπή στο κοινό σχήμα και αλφαβητική σειρά ως προεπιλογή
            allBreeds = data
                .map(normalize)
                .sort((a, b) => a.name.localeCompare(b.name));

            if (allBreeds.length === 0) {
                showMessage('No breeds available right now.');
                return;
            }

            // Τα φίλτρα χτίζονται μία φορά, ακόμα κι αν πατηθεί "Try again"
            if (!filtersBuilt) {
                buildFilters();
                filtersBuilt = true;
            }

            updateView();
        } catch (error) {
            console.error(`Failed to load ${subject}:`, error);
            countEl.textContent = '';
            showMessage(getFriendlyError(error, subject), load);
        } finally {
            loader.classList.add('hidden');
        }
    }

    setupControls();
    load();
}