import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyWD_KLFAVDOFW7FyHPHYGG1gge2go2AY",
  authDomain: "morrow-industries.firebaseapp.com",
  projectId: "morrow-industries",
  storageBucket: "morrow-industries.appspot.com",
  messagingSenderId: "75190213345",
  appId: "1:75190213345:web:a521b54a1c8e00b68d75a0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class RequestWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.initListener();
  }

  initListener() {
    // Listen specifically for the "Next Up" request
    const q = query(collection(db, "requests"), where("nextUp", "==", true));
    
    onSnapshot(q, (snapshot) => {
      const nextRequest = snapshot.docs[0]?.data();
      this.updateWidget(nextRequest);
    });
  }

  updateWidget(data) {
    const container = this.shadowRoot.querySelector('.widget-container');
    const titleEl = this.shadowRoot.querySelector('.movie-title');
    const seasonEl = this.shadowRoot.querySelector('.season-info');
    
    if (data) {
      titleEl.textContent = data.title;
      // Show the season if it exists, otherwise hide the season span
      if (data.season) {
        seasonEl.textContent = ` • ${data.season}`;
        seasonEl.style.display = 'inline';
      } else {
        seasonEl.style.display = 'none';
      }
      container.classList.add('visible');
    } else {
      container.classList.remove('visible');
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary: #5b8aff;
          --accent: #7cf8d2;
          --surface: #12141b;
          --text: #e9eef8;
        }

        .widget-container {
          margin: 16px;
          background: var(--surface);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px 18px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          transform: translateX(150%);
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 9999;
          backdrop-filter: blur(8px);
        }

        .widget-container.visible {
          transform: translateX(0);
        }

        .pulse {
          width: 50px;
          height: 50px;
          background: var(--accent);
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(124, 248, 210, 0.7);
          animation: pulse 2s infinite;
        }
        
        .pulse-divider {
          width: 0.05px;
          height: 49px;
          background: var(--accent);
        }

        .label {
          font-size: 18px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--accent);
          font-weight: 700;
          justify-self: center;
          margin-bottom: 2px;
        }
        
        .movie-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          max-width: 280px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-left: 10px;
        }

        .season-info {
          color: var(--accent);
          font-weight: 700;
          font-size: 14px;
          text-transform: uppercase;
          color: var(--accent);
          font-weight: 700;
          font-size: 18px;  
          animation: glowText 2s ease-in-out infinite alternate;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(124, 248, 210, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(124, 248, 210, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(124, 248, 210, 0); }
        }
        @keyframes glowText {
          from { text-shadow: 0 0 2px rgba(124, 248, 210, 0.4); }
          to { text-shadow: 0 0 8px rgba(124, 248, 210, 0.8); }
        }

        .content-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      </style>
      <div class="widget-container">
        <div class="pulse"></div>
        <div class="pulse-divider"></div>
        <div class="content">
          <div class="label">In Progress</div>
          <div class="content-row">
            <span class="movie-title">Loading...</span>
            <span class="season-info"></span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('request-widget', RequestWidget);