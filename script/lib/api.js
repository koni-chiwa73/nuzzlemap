//Κάνει αίτημα και επιστρέφει τα δεδομένα JSON.
//Πετάει σφάλμα (με error.status) για κάθε απάντηση που δεν είναι 2xx.
export async function fetchJson(url, headers = {}) {
    const response = await fetch(url, { headers });

    // Το fetch ΔΕΝ πετάει σφάλμα για 404/500, οπότε το ελέγχουμε εμείς
    if (!response.ok) {
        const error = new Error(`HTTP error: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return response.json();
}

//Μετατρέπει ένα σφάλμα σε κατανοητό μήνυμα για τον χρήστη
export function getFriendlyError(error, subject) {
    if (error.status === 401 || error.status === 403) {
        return 'We could not access the database (the access key was rejected).';
    }
    if (error.status === 404) {
        return 'We could not find the requested data.';
    }
    if (error.status === 429) {
        return 'Too many requests right now. Please wait a minute and try again.';
    }
    if (error.status >= 500) {
        return 'The database is having problems. Please try again later.';
    }
    if (!navigator.onLine) {
        return 'You seem to be offline. Check your internet connection and try again.';
    }
    return `Something went wrong while loading ${subject}.`;
}