//Μετατρέπει ένα κείμενο εύρους σε αντικείμενο { text, avg }.
//"12 - 15", "12 - 15 years", "10 – 12 years" και "7" δουλεύουν όλα.
//Επιστρέφει null όταν δεν υπάρχει κανένας αριθμός (π.χ. "NaN" ή κενό).
export function parseRange(value) {
    if (!value) return null;

    // Βρίσκει όλους τους αριθμούς μέσα στο κείμενο (regular expression)
    const numbers = String(value).match(/\d+(?:\.\d+)?/g);
    if (!numbers) return null;

    const first = Number(numbers[0]);
    const last = Number(numbers[numbers.length - 1]);

    return {
        text: first === last ? `${first}` : `${first} - ${last}`,
        avg: (first + last) / 2
    };
}

//Σπάει μια λίστα χωρισμένη με κόμμα σε πίνακα: "Active, Loyal" -> ["Active", "Loyal"]
export function splitList(value) {
    return (value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

//Συγκρίνει δύο αριθμούς για το sort. Οι τιμές null πηγαίνουν ΠΑΝΤΑ στο τέλος.
export function compareNullable(a, b, direction = 'asc') {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return direction === 'asc' ? a - b : b - a;
}