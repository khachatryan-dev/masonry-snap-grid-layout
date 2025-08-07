import './masonry-snap-grid-layout.css';
import MasonrySnapGridLayout  from './MasonrySnapGridLayout';

const container = document.getElementById('masonry');
if (container) {
    const masonry = new MasonrySnapGridLayout(container, {
        gutter: 20,
        minColWidth: 200,
        animate: true,
        initialItems: 40,

        // Custom item content example
        itemContent: (index) => {
            const div = document.createElement('div');
            div.textContent = `Custom Item ${index + 1}`;
            div.style.color = '#fff';
            div.style.fontWeight = 'bold';
            div.style.textAlign = 'center';
            div.style.padding = '1rem';
            return div;
        },

        classNames: {
            container: 'masonry-snap-grid-layout-container',
            item: 'masonry-snap-grid-layout-item',
        },
    });

    // Example to update count later
    masonry.addItems(5);

    // Example to shuffle items
    masonry.shuffleItems();
}

export default MasonrySnapGridLayout;
export { MasonrySnapGridLayout };