class MovieDetails extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.apiKey = 'efb26373'; // <--- REPLACE THIS
  }

  connectedCallback() {
    this.render();
    this.setupGlobalListener();
  }

  setupGlobalListener() {
    // Listen for clicks on the parent document
    document.addEventListener('click', async (e) => {
      const row = e.target.closest('.row');
      if (row) {
        const title = row.querySelector('.title').firstChild.textContent.trim();
        this.open(title);
      }
    });
    
    document.addEventListener('click', async (e) => {
      const widget = e.target.closest('.widget-container');
      if (widget) {
        const title = widget.shadowRoot.querySelector('.movie-title').textContent.trim();
        this.open(title);
      }
    });
  }

  async open(title) {
    const modal = this.shadowRoot.querySelector('.modal-overlay');
    const content = this.shadowRoot.querySelector('.modal-content');
    
    // Show loading state
    modal.classList.add('active');
    content.innerHTML = `<div class="loading">Searching archives for "${title}"...</div>`;

    try {
      const resp = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${this.apiKey}`);
      const data = await resp.json();

      if (data.Response === "True") {
        this.renderDetails(data);
      } else {
        content.innerHTML = `<div class="error">Could not find details for "${title}".</div>`;
      }
    } catch (err) {
      content.innerHTML = `<div class="error">Network error. Please try again.</div>`;
    }
  }

  renderDetails(d) {
    const content = this.shadowRoot.querySelector('.modal-content');
    content.innerHTML = `
      <button class="close-btn">&times;</button>
      <div class="detail-grid" overflow="scroll">
        <img class="poster" src="${d.Poster !== 'N/A' ? d.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'}" alt="${d.Title}">
        <div class="info">
          <div class="badge">${d.Genre}</div>
          <h2 class="m-title">${d.Title} <span class="year">(${d.Year})</span></h2>
          <div class="meta">
            <span>⭐ ${d.imdbRating}</span>
            <span>🕒 ${d.Runtime}</span>
            <span>🔞 ${d.Rated}</span>
          </div>
          <p class="plot">${d.Plot}</p>
          <div class="cast"><strong>Cast:</strong> ${d.Actors}</div>
          <div class="director"><strong>Director:</strong> ${d.Director}</div>
        </div>
      </div>
    `;
    
    content.querySelector('.close-btn').onclick = () => this.close();
  }

  close() {
    this.shadowRoot.querySelector('.modal-overlay').classList.remove('active');
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          display: grid;
          place-items: center;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 2000;
          padding: 20px;
        }
        .modal-overlay.active { opacity: 1; visibility: visible; }
        
        /* 1. Ensure the overlay handles overflow */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 2000;
  padding: 20px;
  /* Custom scrollbar styling to match your theme */
  scrollbar-width: hidden;;
  scrollbar-color: var(--primary) transparent;
  overflow: hidden; /* Allows scrolling if the modal is taller than the screen */
}

/* 2. Set a maximum height and internal scrolling for the content */
.modal-content {
  background: #12141b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh; /* Limits height to 90% of the viewport */
  overflow-y: scroll; /* Enables internal scrolling */
  position: relative;
  padding: 30px;
  color: #e9eef8;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  transform: scale(0.9);
  transition: transform 0.3s ease;
  
  /* Custom scrollbar styling to match your theme */
  scrollbar-width: hidden;;
  scrollbar-color: var(--primary) transparent;
}

/* Scrollbar styling for Chrome/Safari/Edge */
.modal-content::-webkit-scrollbar {
  width: 6px;
}
.modal-content::-webkit-scrollbar-thumb {
  background-color: rgba(91, 138, 255, 0.5); /* var(--primary) with opacity */
  border-radius: 10px;
}
        .modal-overlay.active .modal-content { transform: scale(1); }

        .detail-grid { display: grid; grid-template-columns: 200px 1fr; gap: 24px; }
        @media (max-width: 600px) { .detail-grid { grid-template-columns: 1fr; text-align: center; } }

        .poster { width: 80%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); justify-self: center; }
        
        .close-btn {
          position: absolute; top: 15px; right: 20px;
          background: none; border: none; color: #a9b0be;
          font-size: 28px; cursor: pointer;
        }

        .badge { display: inline-block; background: #5b8aff; color: white; padding: 4px 10px; border-radius: 8px; font-size: 11px; margin-bottom: 10px; font-weight: bold; }
        .m-title { margin: 0; font-size: 24px; }
        .year { color: #a9b0be; font-weight: normal; }
        .meta { display: flex; gap: 15px; margin: 12px 0; color: #7cf8d2; font-weight: 600; font-size: 13px; }
        .plot { line-height: 1.6; color: #a9b0be; margin-bottom: 20px; }
        .cast, .director { font-size: 13px; margin-top: 8px; color: #e9eef8; }
        .loading, .error { padding: 40px; text-align: center; color: #a9b0be; font-style: italic; }
      </style>
      <div class="modal-overlay">
        <div class="modal-content"></div>
      </div>
    `;

    // Close when clicking overlay
    this.shadowRoot.querySelector('.modal-overlay').onclick = (e) => {
      if(e.target.classList.contains('modal-overlay')) this.close();
    };
  }
}
customElements.define('movie-details', MovieDetails);