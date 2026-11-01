import { createEl } from './dom.js';

//Φτιάχνει ένα μήνυμα (σφάλμα, κενά αποτελέσματα) με προαιρετικό κουμπί ενέργειας.
//action: { label, onClick }. role: 'status' (ήπιο) ή 'alert' (σφάλμα)
export function createMessage(text, action, role = 'status') {
    const box = createEl('div', 'message');
    box.setAttribute('role', role);
    box.appendChild(createEl('p', null, text)); // textContent: ασφαλές

    if (action) {
        const button = createEl('button', 'btn', action.label);
        button.type = 'button';
        button.addEventListener('click', action.onClick);
        box.appendChild(button);
    }
    return box;
}