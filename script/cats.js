import { initGallery } from './lib/gallery.js';
import { parseRange, splitList } from './lib/data.js';

const API_URL = 'https://api.thecatapi.com/v1/breeds';
const API_KEY = 'live_ItRkwkOGmuU0FpEReCSHivNYDQMmxHAM58h8aZ5cJlEZJt0Xp2LX0jUZPhmxsXcg';

//Μετατρέπει μια φυλή από το TheCatAPI στο κοινό σχήμα
function normalizeCat(raw) {
    const weight = parseRange(raw.weight?.metric);
    const lifeSpan = parseRange(raw.life_span);

    return {
        id: raw.id,
        name: raw.name,
        origin: raw.origin || null,
        temperament: splitList(raw.temperament),
        lifeSpan,
        weight,
        size: null,
        group: null,
        imageUrl: raw.image?.url
            || (raw.reference_image_id
                ? `https://cdn2.thecatapi.com/images/${raw.reference_image_id}.jpg`
                : null),
        wikipediaUrl: raw.wikipedia_url || null,
        description: raw.description || null,
        details: [
            { label: 'Also known as', value: raw.alt_names },
            { label: 'Origin', value: raw.origin },
            { label: 'Weight', value: weight ? `${weight.text} kg` : null },
            { label: 'Life span', value: lifeSpan ? `${lifeSpan.text} years` : null }
        ]
    };
}

const byLifeSpan = breed => breed.lifeSpan?.avg ?? null;

initGallery({
    apiUrl: API_URL,
    apiKey: API_KEY,
    subject: 'cat breeds',
    normalize: normalizeCat,
    sortOptions: [
        { id: 'life-asc',  label: 'Life span: Low to High', direction: 'asc',  getValue: byLifeSpan },
        { id: 'life-desc', label: 'Life span: High to Low', direction: 'desc', getValue: byLifeSpan }
    ],
    filters: []
});