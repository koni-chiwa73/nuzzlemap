import { initGallery } from './lib/gallery.js';
import { parseRange, splitList } from './lib/data.js';

const API_URL = 'https://api.thedogapi.com/v1/breeds';
const API_KEY = 'live_TxLnQwUQTnBPoPg9WXIJmWWaruClHrSUHRpAw7RuYNssdSHalW7HCRx1idw9aqY5';

const SIZE_ORDER = ['Small', 'Medium', 'Large', 'Giant'];

//Δική μας σύμβαση (το API δεν δίνει «μέγεθος»): το ορίζουμε από το μέσο βάρος σε kg
function getSize(avgKg) {
    if (avgKg === null) return null;
    if (avgKg < 10) return 'Small';
    if (avgKg < 25) return 'Medium';
    if (avgKg < 40) return 'Large';
    return 'Giant';
}

//Μετατρέπει μια φυλή από το TheDogAPI στο κοινό σχήμα
function normalizeDog(raw) {
    const weight = parseRange(raw.weight?.metric);
    const height = parseRange(raw.height?.metric);
    const lifeSpan = parseRange(raw.life_span);
    const size = getSize(weight ? weight.avg : null);

    return {
        id: raw.id,
        name: raw.name,
        origin: raw.origin || null,
        temperament: splitList(raw.temperament),
        lifeSpan,
        weight,
        size,
        group: raw.breed_group || null,
        imageUrl: raw.image?.url
            || (raw.reference_image_id
                ? `https://cdn2.thedogapi.com/images/${raw.reference_image_id}.jpg`
                : null),
        wikipediaUrl: raw.wikipedia_url || null,
        description: raw.description || null,
        details: [
            { label: 'Bred for', value: raw.bred_for },
            { label: 'Breed group', value: raw.breed_group },
            { label: 'Origin', value: raw.origin },
            { label: 'Size', value: size },
            { label: 'Weight', value: weight ? `${weight.text} kg` : null },
            { label: 'Height', value: height ? `${height.text} cm` : null },
            { label: 'Life span', value: lifeSpan ? `${lifeSpan.text} years` : null }
        ]
    };
}

const byLifeSpan = breed => breed.lifeSpan?.avg ?? null;
const byWeight = breed => breed.weight?.avg ?? null;

initGallery({
    apiUrl: API_URL,
    apiKey: API_KEY,
    subject: 'dog breeds',
    normalize: normalizeDog,
    sortOptions: [
        { id: 'life-asc',   label: 'Life span: Low to High', direction: 'asc',  getValue: byLifeSpan },
        { id: 'life-desc',  label: 'Life span: High to Low', direction: 'desc', getValue: byLifeSpan },
        { id: 'weight-asc',  label: 'Weight: Light to Heavy', direction: 'asc',  getValue: byWeight },
        { id: 'weight-desc', label: 'Weight: Heavy to Light', direction: 'desc', getValue: byWeight }
    ],
    filters: [
        { id: 'group', label: 'All groups', getValue: breed => breed.group },
        { id: 'size',  label: 'Any size',   getValue: breed => breed.size, order: SIZE_ORDER }
    ]
});