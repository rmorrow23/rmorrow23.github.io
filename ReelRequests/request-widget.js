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
    
    if (data) {
      titleEl.textContent = data.title;
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
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: var(--surface);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 18px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          transform: translateY(150%);
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 9999;
          backdrop-filter: blur(8px);
        }

        .widget-container.visible {
          transform: translateY(0);
        }

        .pulse {
          width: 10px;
          height: 10px;
          background: var(--accent);
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(124, 248, 210, 0.7);
          animation: pulse 2s infinite;
        }

        .label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--accent);
          font-weight: 700;
          margin-bottom: 2px;
        }

        .movie-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(124, 248, 210, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(124, 248, 210, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(124, 248, 210, 0); }
        }
      </style>
      <div class="widget-container">
        <div class="pulse"></div>
        <div class="content">
          <div class="label">Now Processing</div>
          <div class="movie-title">Loading...</div>
        </div>
      </div>
    `;
  }
}

customElements.define('request-widget', RequestWidget);