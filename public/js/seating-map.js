class SeatingMap {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Seating map container not found:', containerId);
            return;
        }

        this.options = {
            onSectionClick: () => {},
            onSectionHover: () => {},
            ...options
        };
        
        this.sections = new Map();
        this.selectedSection = null;
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        
        this.initializeMap();
    }

    async initializeMap() {
        try {
            const eventId = new URLSearchParams(window.location.search).get('eventId');
            if (!eventId) {
                throw new Error('No event ID provided');
            }

            this.showLoading();
            const response = await fetch(`/api/events/${eventId}/seating`);
            
            if (response.status === 404) {
                throw new Error('Seating map not available for this event');
            }
            
            if (!response.ok) {
                throw new Error('Failed to load seating map');
            }
            
            const data = await response.json();
            if (!data.sections || data.sections.length === 0) {
                throw new Error('No seating sections available');
            }

            this.renderMap(data);
            this.setupControls();
        } catch (error) {
            console.error('Error loading seating map:', error);
            this.showError(error.message);
        }
    }

    showLoading() {
        this.container.innerHTML = `
            <div class="loading-message">
                <div class="spinner"></div>
                <p>Loading seating map...</p>
            </div>
        `;
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="error-message">
                <p>${message || 'Unable to load seating map. Please try again later.'}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    renderMap(data) {
        // Clear any existing content
        this.container.innerHTML = '';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 1000 1000');
        svg.style.transform = `scale(${this.zoom}) translate(${this.pan.x}px, ${this.pan.y}px)`;

        // Add a background rectangle
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('width', '1000');
        background.setAttribute('height', '1000');
        background.setAttribute('fill', '#f8f9fa');
        svg.appendChild(background);

        // Render each section
        data.sections.forEach(section => {
            if (!section.coordinates) {
                console.warn('Section missing coordinates:', section.id);
                return;
            }

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', section.coordinates);
            path.setAttribute('class', 'section-highlight');
            path.setAttribute('data-section-id', section.id);
            
            // Set fill color based on price level
            path.style.fill = this.getPriceLevelColor(section.priceLevel);
            
            // Store section data
            this.sections.set(section.id, {
                element: path,
                data: section
            });
            
            // Add event listeners
            path.addEventListener('click', () => this.handleSectionClick(section));
            path.addEventListener('mouseenter', () => this.handleSectionHover(section));
            path.addEventListener('mouseleave', () => this.handleSectionLeave(section));
            
            svg.appendChild(path);
        });

        this.container.appendChild(svg);
    }

    setupControls() {
        const controls = document.createElement('div');
        controls.className = 'map-controls';
        
        // Zoom controls
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        
        const zoomIn = this.createButton('+', () => this.zoomIn());
        const zoomOut = this.createButton('-', () => this.zoomOut());
        const reset = this.createButton('↺', () => this.resetView());
        
        zoomControls.appendChild(zoomOut);
        zoomControls.appendChild(zoomIn);
        controls.appendChild(zoomControls);
        controls.appendChild(reset);
        
        this.container.insertBefore(controls, this.container.firstChild);
    }

    createButton(text, onClick) {
        const button = document.createElement('button');
        button.className = 'map-button';
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }

    getPriceLevelColor(level) {
        const colors = {
            1: 'var(--price-level-1)',
            2: 'var(--price-level-2)',
            3: 'var(--price-level-3)',
            4: 'var(--price-level-4)',
            5: 'var(--price-level-5)'
        };
        return colors[level] || colors[3];
    }

    handleSectionClick(section) {
        if (this.selectedSection) {
            const prevSection = this.sections.get(this.selectedSection);
            if (prevSection && prevSection.element) {
                prevSection.element.classList.remove('selected');
            }
        }
        
        const currentSection = this.sections.get(section.id);
        if (currentSection && currentSection.element) {
            currentSection.element.classList.add('selected');
            this.selectedSection = section.id;
            this.options.onSectionClick(section);
        }
    }

    handleSectionHover(section) {
        const sectionElement = this.sections.get(section.id)?.element;
        if (sectionElement) {
            sectionElement.style.opacity = '0.8';
            this.showTooltip(section);
            this.options.onSectionHover(section);
        }
    }

    handleSectionLeave(section) {
        const sectionElement = this.sections.get(section.id)?.element;
        if (sectionElement) {
            sectionElement.style.opacity = '1';
            this.hideTooltip();
        }
    }

    showTooltip(section) {
        this.hideTooltip(); // Remove any existing tooltip

        const tooltip = document.createElement('div');
        tooltip.className = 'map-tooltip';
        tooltip.innerHTML = `
            <strong>${section.name}</strong>
            <div>Available: ${section.available}</div>
            ${section.tickets.length > 0 
                ? `<div>Starting at: $${Math.min(...section.tickets.map(t => t.price.total)).toFixed(2)}</div>`
                : '<div>No tickets available</div>'
            }
        `;
        
        this.container.appendChild(tooltip);
    }

    hideTooltip() {
        const tooltip = this.container.querySelector('.map-tooltip');
        if (tooltip) tooltip.remove();
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 3);
        this.updateTransform();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.5);
        this.updateTransform();
    }

    resetView() {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.updateTransform();
    }

    updateTransform() {
        const svg = this.container.querySelector('svg');
        if (svg) {
            svg.style.transform = `scale(${this.zoom}) translate(${this.pan.x}px, ${this.pan.y}px)`;
        }
    }
}

// Export for use in other files
window.SeatingMap = SeatingMap;
