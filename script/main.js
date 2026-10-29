//API & DOM Elements
const API_URL = 'https://api.thecatapi.com/v1/breeds';
const API_KEY = 'live_ItRkwkOGmuU0FpEReCSHivNYDQMmxHAM58h8aZ5cJlEZJt0Xp2LX0jUZPhmxsXcg';
const gallery = document.getElementById('gallery');
const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort');
const toast = document.getElementById('toast');
const loader = document.getElementById('loader');

let allBreeds = [];
let searchQuery = '';
let sortOrder = '';

//Calculate the average life span
function getAverageLifeSpan(lifeSpan) {
    if (!lifeSpan) return 0;
    const parts = lifeSpan.split(" - ").map(num => parseInt(num.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return (parts[0] + parts[1]) / 2;
    }
    return !isNaN(parts[0]) ? parts[0] : 0;
}

//Display Toast 
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

//Core App Logic
//Fetch Breeds
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

//Breeds Cards
function displayBreeds(breeds) {
    gallery.innerHTML ='';
    if (breeds.length === 0) {
        showMessage('No breeds found. Try a different search.');
        return;
    }
    breeds.forEach(breed => {
        const card = document.createElement('div');
        card.classList.add('card');

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        if (breed.reference_image_id) {
            img.src = `https://cdn2.thecatapi.com/images/${breed.reference_image_id}.jpg`;
        } else {
            img.src = 'https://placehold.co/300x200?text=No+Image';
        }
        img.alt = breed.name;
        img.onerror = () => {
            img.src = 'https://placehold.co/300x200?text=No+Image';
        };
        
        card.innerHTML = `
        <h2>${breed.name}</h2>
        <p><strong>Origin:</strong> ${valueOrFallback(breed.origin)}</p>
        <p><strong>Temperament:</strong> ${valueOrFallback(breed.temperament)}</p>
        <p><strong>Life Span:</strong> ${breed.life_span ? `${breed.life_span} years` : 'Unknown'}</p>
        <p><strong>Weight:</strong> ${breed.weight?.metric ? `${breed.weight.metric} kg` : 'Unknown'}</p>
        ${breed.wikipedia_url ? `<a href="${breed.wikipedia_url}" target="_blank">More on Wikipedia</a>` : ''}
        <button class="adopt-btn">Adopt Me</button>
        `;

        card.prepend(img);

        const adoptBtn = card.querySelector('.adopt-btn');
        adoptBtn.addEventListener('click', () => handleAdopt(breed, adoptBtn));

        gallery.appendChild(card);
    });
}

//Adopt Me Button - Feedback
function handleAdopt(breed,adoptBtn){
    adoptBtn.disabled=true;
    adoptBtn.textContent="Sending...";

    fetch('https://jsonplaceholder.typicode.com/posts',{
        method:'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ breedId: breed.id, name:breed.name})
    })
        .then(() => {
            adoptBtn.textContent = "Adopted!";
            showToast('Adoption request sent!');
        })
        .catch(() => {
            adoptBtn.textContent = "Try Again";
            showToast('Something went wrong...');
        })
        .finally(() => {
            setTimeout(() => {
                adoptBtn.textContent = "Adopt Me";
                adoptBtn.disabled = false;
            }, 3000);
        });
}

//Search and Sort Features
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

function updateView() {
    displayBreeds(getVisibleBreeds());
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

//Dark Mode: εναλλάσσεται με το πλήρωμα του πλήκτρου "d"
document.addEventListener('keydown', e => {
    // Αγνοούμε το πλήκτρο όταν ο χρήστης γράφει σε πεδίο ή πατά συνδυασμό (π.χ. Ctrl+D)
    if (e.target.matches('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key.toLowerCase() === 'd') {
        document.body.classList.toggle('dark');
    }
});

fetchBreeds();