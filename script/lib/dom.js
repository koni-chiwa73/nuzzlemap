//Φτιάχνει ένα στοιχείο με κλάση και κείμενο σε μία γραμμή
export function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}