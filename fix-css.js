const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

// Find the index of '.kanban-card-footer' block
const footerIndex = css.indexOf('.kanban-card-footer {');
if (footerIndex !== -1) {
    // Find the closing brace of that block
    const blockEnd = css.indexOf('}', footerIndex);
    if (blockEnd !== -1) {
        // Truncate everything after the block
        css = css.substring(0, blockEnd + 1) + '\n\n';
    }
}

// Append clean CSS
css += `
/* Modal Styling */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    width: 90%;
    max-width: 500px;
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    position: relative;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--glass-border);
    padding-bottom: 1rem;
    margin-bottom: 1rem;
}

.modal-header h2 {
    font-size: 1.25rem;
    color: var(--primary);
    margin: 0;
}

.modal-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    transition: color 0.2s;
    line-height: 1;
}

.modal-close:hover {
    color: var(--text-main);
}

.modal-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.modal-detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-detail-label {
    color: var(--text-muted);
    font-weight: 500;
}

.modal-detail-value {
    color: var(--text-main);
    font-weight: 600;
    text-align: right;
}
`;

// However, because fs.readFileSync might read UTF-16 bytes incorrectly if mixed,
// we just write it out.
fs.writeFileSync('styles.css', css, 'utf8');
console.log('Fixed styles.css!');
