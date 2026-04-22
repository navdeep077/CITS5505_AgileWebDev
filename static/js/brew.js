/* ── Brew Map Filter Logic ─────────────────────────── */
const chips  = document.querySelectorAll('.filter-chip');
const items  = document.querySelectorAll('.shop-item');
const noRes  = document.getElementById('no-results');

chips.forEach(chip => {
    chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active-filter'));
        chip.classList.add('active-filter');

        const filter = chip.dataset.filter;
        let visible  = 0;

        items.forEach(item => {
            let show = false;
            if (filter === 'all')       show = true;
            if (filter === 'open')      show = item.dataset.open     === 'true';
            if (filter === 'pet')       show = item.dataset.pet      === 'true';
            if (filter === 'cold-brew') show = item.dataset.coldBrew === 'true';
            if (filter === 'pour-over') show = item.dataset.pourOver === 'true';

            item.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        noRes.style.display = visible === 0 ? 'block' : 'none';
    });
});