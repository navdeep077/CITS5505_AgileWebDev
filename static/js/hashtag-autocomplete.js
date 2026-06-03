/*
 * hashtag-autocomplete.js
 * Shows hashtag suggestions when user types # in post textarea
 */

let trendingTags = [];

// Load trending tags once
fetch('/api/hashtags/trending')
    .then(r => r.json())
    .then(tags => {
        // Merge with default coffee tags
        const defaults = [
            {tag:'coffee',count:0},{tag:'cafe',count:0},
            {tag:'coldBrew',count:0},{tag:'espresso',count:0},
            {tag:'flatWhite',count:0},{tag:'latte',count:0},
            {tag:'Perth',count:0},{tag:'specialty',count:0}
        ];
        const existing = tags.map(t => t.tag);
        const extras   = defaults.filter(d => !existing.includes(d.tag));
        trendingTags   = [...tags, ...extras];
    })
    .catch(() => {
        trendingTags = [
            {tag:'coffee',count:0},{tag:'cafe',count:0},
            {tag:'coldBrew',count:0},{tag:'espresso',count:0},
            {tag:'flatWhite',count:0},{tag:'Perth',count:0}
        ];
    });

function initHashtagAutocomplete(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    // Create suggestion box
    const box = document.createElement('div');
    box.className      = 'hashtag-suggestions mention-suggestions';
    box.style.display  = 'none';
    box.style.position = 'absolute';
    box.style.bottom   = '100%';
    box.style.left     = '0';
    box.style.right    = '0';
    box.style.marginBottom = '4px';
    box.style.zIndex   = '200';
    textarea.parentElement.style.position = 'relative';
    textarea.parentElement.appendChild(box);

    textarea.addEventListener('input', () => {
        const val   = textarea.value;
        const pos   = textarea.selectionStart;
        const chunk = val.slice(0, pos);
        const match = chunk.match(/#(\w*)$/);

        if (!match) {
            box.style.display = 'none';
            return;
        }

        const typed = match[1].toLowerCase();
        const suggestions = trendingTags.filter(t =>
            t.tag.toLowerCase().startsWith(typed) && t.tag !== typed
        ).slice(0, 5);

        if (suggestions.length === 0) {
            box.style.display = 'none';
            return;
        }

        box.innerHTML = suggestions.map(t => `
            <div class="hashtag-suggestion-item"
                 onclick="insertHashtag('${t.tag}', '${textareaId}')">
                <span style="color:var(--caramel);font-weight:700;">#</span>
                ${t.tag}
                <span class="tag-count">${t.count}</span>
            </div>
        `).join('');
        box.style.display = 'block';
    });

    // Hide on click outside
    document.addEventListener('click', e => {
        if (!box.contains(e.target) && e.target !== textarea) {
            box.style.display = 'none';
        }
    });
}

function insertHashtag(tag, textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const val   = textarea.value;
    const pos   = textarea.selectionStart;
    const chunk = val.slice(0, pos);
    const match = chunk.match(/#(\w*)$/);

    if (match) {
        const start    = pos - match[0].length;
        const newVal   = val.slice(0, start) + `#${tag} ` + val.slice(pos);
        textarea.value = newVal;
        textarea.focus();
        textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }

    // Hide box
    textarea.parentElement.querySelector('.hashtag-suggestions').style.display = 'none';
}

// Init on modal text area
// ── Init on modal open ────────────────────────────────────────
// The modal textarea only exists after the FAB is clicked
// We patch the global openModal function to init autocomplete

document.addEventListener('DOMContentLoaded', () => {
    // Patch openModal
    const originalOpenModal = window.openModal;
    window.openModal = function() {
        if (originalOpenModal) originalOpenModal();
        setTimeout(() => {
            initHashtagAutocomplete('modal-text');
            initMentionAutocomplete('modal-text');
        }, 150);
    };

    initHashtagAutocomplete('modal-text');
    initMentionAutocomplete('modal-text');
});

// ── Global delegated @ mention for comment inputs ─────────────
// Instead of trying to attach to each input individually,
// listen on document for input events and show a floating dropdown

(function() {
    let mentionBox = null;
    let activeInput = null;

    // Create one shared floating dropdown
    function getBox() {
        if (!mentionBox) {
            mentionBox = document.createElement('div');
            mentionBox.className = 'hashtag-suggestions';
            mentionBox.style.cssText = `
                display:none;
                position:fixed;
                z-index:9999;
                min-width:200px;
                max-width:280px;
                max-height:200px;
                overflow-y:auto;
                box-shadow:0 8px 24px rgba(26,14,0,0.15);
            `;
            document.body.appendChild(mentionBox);
        }
        return mentionBox;
    }

    function hideBox() {
        const b = getBox();
        b.style.display = 'none';
        activeInput = null;
    }

    // Position box near the input
    function positionBox(input) {
        const rect = input.getBoundingClientRect();
        const box  = getBox();
        box.style.left = rect.left + 'px';
        box.style.top  = (rect.top - box.offsetHeight - 4) + 'px';

        // After display set, recalculate top
        requestAnimationFrame(() => {
            box.style.top = (rect.top - box.offsetHeight - 4) + 'px';
        });
    }

    // Listen for input events on any comment input
    document.addEventListener('input', (e) => {
        const input = e.target;
        if (!input.classList.contains('comment-input')) return;

        activeInput = input;
        const val   = input.value;
        const pos   = input.selectionStart;
        const chunk = val.slice(0, pos);
        const match = chunk.match(/@(\w+)$/);

        if (!match || match[1].length < 1) {
            hideBox();
            return;
        }

        fetch(`/api/search?q=${encodeURIComponent(match[1])}`)
            .then(r => r.json())
            .then(data => {
                const users = (data.users || []).slice(0, 5);
                const box   = getBox();

                if (users.length === 0) {
                    hideBox();
                    return;
                }

                box.innerHTML = users.map(u => `
                    <div class="hashtag-suggestion-item"
                         data-username="${u.username}"
                         style="cursor:pointer;">
                        <span style="
                            width:24px;height:24px;border-radius:50%;
                            background:var(--caramel);color:white;
                            display:inline-flex;align-items:center;
                            justify-content:center;font-size:0.75rem;
                            font-weight:700;flex-shrink:0;">
                            ${u.username.charAt(0).toUpperCase()}
                        </span>
                        <span style="font-weight:700;">@${u.username}</span>
                    </div>
                `).join('');

                box.style.display = 'block';
                positionBox(input);
            })
            .catch(() => hideBox());
    });

    // Click on suggestion
    document.addEventListener('mousedown', (e) => {
        const item = e.target.closest('[data-username]');
        if (item && mentionBox && mentionBox.contains(item)) {
            e.preventDefault();
            const username = item.dataset.username;
            const input    = activeInput;
            if (!input) return;

            const val   = input.value;
            const pos   = input.selectionStart;
            const chunk = val.slice(0, pos);
            const match = chunk.match(/@(\w+)$/);

            if (match) {
                const start    = pos - match[0].length;
                const newVal   = val.slice(0, start) + `@${username} ` + val.slice(pos);
                input.value    = newVal;
                input.focus();
                const newPos = start + username.length + 2;
                input.setSelectionRange(newPos, newPos);
            }

            hideBox();
        } else if (mentionBox && !mentionBox.contains(e.target)) {
            hideBox();
        }
    });

    // Hide on scroll or resize
    document.addEventListener('scroll', hideBox, true);
    window.addEventListener('resize', hideBox);
})();

function initMentionOnCommentInputs() {
    document.querySelectorAll('.comment-input, input[type="text"][placeholder*="comment"]')
        .forEach(input => {
            if (input.dataset.mentionInit) return;
            input.dataset.mentionInit = 'true';
            initMentionAutocompleteOnInput(input);
        });
}
// ── MENTION AUTOCOMPLETE ──────────────────────────────────────
function initMentionAutocomplete(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea || textarea.dataset.mentionInit) return;
    textarea.dataset.mentionInit = 'true';

    // Create mention suggestion box
    const box = document.createElement('div');
    box.className = 'hashtag-suggestions';
    box.style.display   = 'none';
    box.style.position  = 'absolute';
    box.style.bottom    = '100%';
    box.style.left      = '0';
    box.style.right     = '0';
    box.style.marginBottom = '4px';
    textarea.parentElement.style.position = 'relative';
    textarea.parentElement.appendChild(box);

    textarea.addEventListener('input', () => {
        const val   = textarea.value;
        const pos   = textarea.selectionStart;
        const chunk = val.slice(0, pos);
        const match = chunk.match(/@(\w+)$/);

        if (!match || match[1].length < 1) {
            box.style.display = 'none';
            return;
        }

        const typed = match[1].toLowerCase();

        // Search users
        fetch(`/api/search?q=${encodeURIComponent(typed)}`)
            .then(r => r.json())
            .then(data => {
                const users = (data.users || []).slice(0, 5);
                if (users.length === 0) {
                    box.style.display = 'none';
                    return;
                }
                box.innerHTML = users.map(u => `
                    <div class="hashtag-suggestion-item"
                         onclick="insertMention('${u.username}', '${textareaId}')">
                        <span style="
                            width:24px;height:24px;border-radius:50%;
                            background:var(--caramel);color:white;
                            display:inline-flex;align-items:center;
                            justify-content:center;font-size:0.75rem;
                            font-weight:700;flex-shrink:0;">
                            ${u.username.charAt(0).toUpperCase()}
                        </span>
                        <span style="font-weight:700;">@${u.username}</span>
                        ${u.bio
                            ? `<span class="tag-count"
                                style="font-size:0.72rem;color:var(--muted);
                                    white-space:nowrap;overflow:hidden;
                                    text-overflow:ellipsis;max-width:100px;">
                                    ${u.bio.substring(0,30)}
                               </span>`
                            : ''}
                    </div>
                `).join('');
                box.style.display = 'block';
            })
            .catch(() => { box.style.display = 'none'; });
    });

    document.addEventListener('click', e => {
        if (!box.contains(e.target) && e.target !== textarea) {
            box.style.display = 'none';
        }
    });
}

function insertMention(username, textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const val   = textarea.value;
    const pos   = textarea.selectionStart;
    const chunk = val.slice(0, pos);
    const match = chunk.match(/@(\w+)$/);

    if (match) {
        const start    = pos - match[0].length;
        const newVal   = val.slice(0, start) + `@${username} ` + val.slice(pos);
        textarea.value = newVal;
        textarea.focus();
        const newPos = start + username.length + 2;
        textarea.setSelectionRange(newPos, newPos);
    }

    const box = textarea.parentElement.querySelector('.mention-suggestions');
    if (box) box.style.display = 'none';
}
// ── Init mention on a specific input element ──────────────────
function initMentionAutocompleteOnInput(textarea) {
    if (!textarea || textarea.dataset.mentionInit2) return;
    textarea.dataset.mentionInit2 = 'true';

    const box = document.createElement('div');
    box.className      = 'hashtag-suggestions mention-suggestions';
    box.style.display  = 'none';
    box.style.position = 'absolute';
    box.style.bottom       = 'calc(100% + 4px)';
    box.style.left         = '0';
    box.style.right        = '0';
    box.style.marginBottom = '0';
    box.style.maxHeight    = '160px';
    box.style.overflowY    = 'auto';
    box.style.zIndex   = '200';

    const wrap = textarea.parentElement;
    wrap.style.position = 'relative';
    wrap.appendChild(box);

    textarea.addEventListener('input', () => {
        const val   = textarea.value;
        const pos   = textarea.selectionStart;
        const chunk = val.slice(0, pos);
        const match = chunk.match(/@(\w+)$/);

        if (!match || match[1].length < 1) {
            box.style.display = 'none';
            return;
        }

        fetch(`/api/search?q=${encodeURIComponent(match[1])}`)
            .then(r => r.json())
            .then(data => {
                const users = (data.users || []).slice(0, 5);
                if (users.length === 0) {
                    box.style.display = 'none';
                    return;
                }
                box.innerHTML = users.map(u => `
                    <div class="hashtag-suggestion-item"
                         onmousedown="insertMentionOnInput('${u.username}', this)">
                        <span style="
                            width:24px;height:24px;border-radius:50%;
                            background:var(--caramel);color:white;
                            display:inline-flex;align-items:center;
                            justify-content:center;font-size:0.75rem;
                            font-weight:700;flex-shrink:0;">
                            ${u.username.charAt(0).toUpperCase()}
                        </span>
                        <span style="font-weight:700;">@${u.username}</span>
                    </div>
                `).join('');
                box.style.display = 'block';
            })
            .catch(() => { box.style.display = 'none'; });
    });

    textarea.addEventListener('blur', () => {
        setTimeout(() => { box.style.display = 'none'; }, 500);
    });
}

function insertMentionOnInput(username, itemEl) {
    const box      = itemEl.closest('.mention-suggestions');
    const wrap     = box?.parentElement;
    const textarea = wrap?.querySelector('input, textarea');
    if (!textarea) return;

    const val   = textarea.value;
    const pos   = textarea.selectionStart;
    const chunk = val.slice(0, pos);
    const match = chunk.match(/@(\w+)$/);

    if (match) {
        const start    = pos - match[0].length;
        const newVal   = val.slice(0, start) + `@${username} ` + val.slice(pos);
        textarea.value = newVal;
        textarea.focus();
        const newPos = start + username.length + 2;
        textarea.setSelectionRange(newPos, newPos);
    }

    if (box) box.style.display = 'none';
}