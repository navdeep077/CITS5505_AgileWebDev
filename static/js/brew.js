/*
  Brew map filter system 

  Handles:
  - Filter chip interactions
  - Café filtering by category
  - Dynamic shop visibility
  - Empty-state display handling
*/

// Controls café filtering and interactive brew map display

// Select all filter chips used for category-based filtering
const chips  = document.querySelectorAll('.filter-chip');
// Select all café/shop cards displayed on the page
const items  = document.querySelectorAll('.shop-item');
// Empty-state message displayed when no cafés match the filter
const noRes  = document.getElementById('no-results');

// Attach click event listeners to each filter chip
chips.forEach(chip => {
    // Handle filter selection and update UI state
    chip.addEventListener('click', () => {
        // Remove active styling from previously selected filter
        chips.forEach(c => c.classList.remove('active-filter'));
        // Highlight the currently selected filter chip
        chip.classList.add('active-filter');

        // Read the selected filter type from data attributes
        const filter = chip.dataset.filter;
        // Track the number of visible cafés after filtering
        let visible  = 0;

        // Loop through all cafés and determine visibility
        items.forEach(item => {
            // Default visibility state for the current café item
            let show = false;
            // Display all cafés when the "all" filter is selected
            if (filter === 'all')       show = true;
            // Filter cafés currently marked as open
            if (filter === 'open')      show = item.dataset.open     === 'true';
            // Filter cafés that are pet friendly
            if (filter === 'pet')       show = item.dataset.pet      === 'true';
            // Filter cafés serving cold brew coffee
            if (filter === 'cold-brew') show = item.dataset.coldBrew === 'true';
            // Filter cafés serving pour-over coffee
            if (filter === 'pour-over') show = item.dataset.pourOver === 'true';

            // Show or hide café cards depending on filter result
            item.style.display = show ? '' : 'none';
            // Increase visible café count when a match is found
            if (show) visible++;
        });

        // Display a "no results" message if no cafés match the filter
        noRes.style.display = visible === 0 ? 'block' : 'none';
    });
});