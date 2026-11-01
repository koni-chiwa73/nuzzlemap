//Επιστρέφει το URL μόνο αν είναι http ή https. Αλλιώς null.
//Κρίσιμο: ένα href="javascript:..." από χρήστη θα εκτελούσε κώδικα στον browser (XSS).
export function safeHttpUrl(value) {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
        return null; // το new URL() πετάει σφάλμα για άκυρα URL
    }
}

//Φτιάχνει σύνδεσμο tel: μόνο με ψηφία και "+" (αφαιρεί κενά και ό,τι άλλο)
export function phoneHref(value) {
    if (!value) return null;
    const digits = String(value).replace(/[^\d+]/g, '');
    return digits.length >= 6 ? `tel:${digits}` : null;
}