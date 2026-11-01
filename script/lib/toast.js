export const TOAST_DURATION = 3000; // σε milliseconds

let toastTimer;

//Εμφανίζει το toast. type: 'success' ή 'error'
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');

    // Δεν βασιζόμαστε μόνο στο χρώμα: προσθέτουμε και εικονίδιο
    const icon = type === 'error' ? '⚠️' : '✅';
    toast.textContent = `${icon} ${message}`;

    toast.classList.remove('hidden', 'toast--success', 'toast--error');
    toast.classList.add(`toast--${type}`);

    // Ακυρώνουμε το παλιό χρονόμετρο, αλλιώς θα έκρυβε το νέο μήνυμα νωρίς
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), TOAST_DURATION);
}