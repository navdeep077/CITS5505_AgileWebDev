/*
 * journal.js
 * Handles the coffee journal — add, load and delete entries
 */

let selectedRating = 0;

// ── Star Rating ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('#star-rating span');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.val);
            document.getElementById('journal-rating').value = selectedRating;
            stars.forEach((s, i) => {
                s.textContent = i < selectedRating ? '★' : '☆';
                s.style.color = i < selectedRating ? 'var(--caramel)' : '';
            });
        });
    });

    loadJournalEntries();
});

// ── Save Entry ────────────────────────────────────────────────────────────────
function saveJournalEntry() {
    const cafe   = document.getElementById('journal-cafe').value;
    const date   = document.getElementById('journal-date').value;
    const brew   = document.getElementById('journal-brew').value;
    const mood   = document.getElementById('journal-mood').value;
    const rating = parseInt(document.getElementById('journal-rating').value) || 0;
    const notes  = document.getElementById('journal-notes').value.trim();

    if (!cafe) {
        showToast('Please select a cafe', 'error');
        return;
    }
    if (!notes) {
        showToast('Please add some notes', 'error');
        return;
    }

    fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafe, visit_date: date, brew_type: brew, mood, rating, notes })
    })
    .then(res => res.json())
    .then(() => {
        // Reset form
        document.getElementById('journal-cafe').value  = '';
        document.getElementById('journal-date').value  = '';
        document.getElementById('journal-brew').value  = '';
        document.getElementById('journal-mood').value  = '';
        document.getElementById('journal-notes').value = '';
        document.getElementById('journal-rating').value = 0;
        selectedRating = 0;
        document.querySelectorAll('#star-rating span').forEach(s => {
            s.textContent = '☆';
            s.style.color = '';
        });
        showToast('Journal entry saved ✓', 'success');
        loadJournalEntries();
    })
    .catch(err => console.error('Journal save error:', err));
}

// ── Load Entries ──────────────────────────────────────────────────────────────
function loadJournalEntries() {
    fetch('/api/journal')
        .then(res => res.json())
        .then(entries => {
            const container = document.getElementById('journal-entries');

            if (entries.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:var(--muted);">
                        <i class="bi bi-journal" style="font-size:2.5rem;display:block;margin-bottom:1rem;"></i>
                        <h5>No entries yet</h5>
                        <p>Start logging your coffee visits above</p>
                    </div>`;
                return;
            }

            container.innerHTML = entries.map(e => `
                <div class="journal-entry-card" id="journal-entry-${e.id}">
                    <div class="journal-entry-header">
                        <div>
                            <div class="journal-cafe-name">
                                <i class="bi bi-cup-hot-fill" style="color:var(--caramel)"></i>
                                ${e.cafe}
                            </div>
                            <div class="journal-meta">
                                ${e.visit_date ? `📅 ${e.visit_date}` : ''}
                                ${e.brew_type ? `&nbsp;•&nbsp; ☕ ${e.brew_type}` : ''}
                                ${e.mood ? `&nbsp;•&nbsp; ${e.mood}` : ''}
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            ${e.rating ? `<div class="journal-stars">${'★'.repeat(e.rating)}${'☆'.repeat(5 - e.rating)}</div>` : ''}
                            <button onclick="deleteJournalEntry(${e.id})"
                                style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="journal-notes">${e.notes}</p>
                </div>
            `).join('');
        })
        .catch(err => console.error('Journal load error:', err));
}

// ── Delete Entry ──────────────────────────────────────────────────────────────
function deleteJournalEntry(id) {
    if (!confirm('Delete this journal entry?')) return;
    fetch(`/api/journal/${id}`, { method: 'DELETE' })
        .then(() => {
            document.getElementById(`journal-entry-${id}`)?.remove();
            showToast('Entry deleted', 'info');
        })
        .catch(err => console.error('Journal delete error:', err));
}