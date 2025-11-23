// =======================================================
// Morrow Industries — Android WebView → Firebase Bridge
// Robust auto-sign-in module for ALL webpages
// =======================================================

console.log("%c[AndroidAuth] Module loaded", "color:#D4AF37");

// =======================================================
// 1. Wait for firebase to exist before using it
// =======================================================
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebase && firebase.auth) {
            resolve();
            return;
        }

        console.log("[AndroidAuth] Waiting for Firebase to load...");

        const interval = setInterval(() => {
            if (window.firebase && firebase.auth) {
                clearInterval(interval);
                console.log("%c[AndroidAuth] Firebase is ready", "color:lightgreen");
                resolve();
            }
        }, 100);
    });
}

// =======================================================
// 2. Handle Android Token
// =======================================================
async function handleAndroidToken(token) {
    console.log("%c[AndroidAuth] Token received:", "color:#D4AF37", token);

    await waitForFirebase();

    firebase.auth().signInWithCustomToken(token)
        .then((cred) => {
            console.log("%c[AndroidAuth] Firebase login success:", "color:lightgreen", cred.user.uid);
        })
        .catch((err) => {
            console.error("[AndroidAuth] Firebase login FAILED:", err);
        });
}

// =======================================================
// 3. Global callback — Android WebView calls this
// =======================================================
window.receiveAndroidToken = function (token) {
    console.log("%c[AndroidAuth] receiveAndroidToken() triggered", "color:#D4AF37");

    handleAndroidToken(token);
};
