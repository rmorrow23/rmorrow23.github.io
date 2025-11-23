// ================================
// Morrow Industries — Android Token Bridge
// Drop-in module for any webpage
// ================================

// Make sure Firebase is loaded before this script
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"></script>

const AndroidAuth = (() => {
    let pendingToken = null;
    let isSigningIn = false;

    const debug = (...msg) => console.log("%c[AndroidAuth]", "color: #D4AF37", ...msg);

    // ---------------------------
    // 🔥 Process token from Android app
    // ---------------------------
    async function handleTokenFromAndroid(token) {
        debug("Token received:", token);

        pendingToken = token;

        // Avoid double-sign-ins
        if (isSigningIn) {
            debug("Already signing in, ignoring token...");
            return;
        }

        try {
            isSigningIn = true;

            const userCred = await firebase.auth().signInWithCustomToken(token);

            debug("Firebase Web Auth Complete:", userCred.user.uid);

        } catch (e) {
            console.error("[AndroidAuth] Sign-in failed:", e);
        } finally {
            isSigningIn = false;
        }
    }

    // ---------------------------
    // 🔥 Auto-reauth if Firebase token expires
    // ---------------------------
    firebase.auth().onIdTokenChanged(async (user) => {
        if (!user) {
            debug("User signed out on web");
            return;
        }

        debug("Web Firebase user detected:", user.uid);

        // If we still have the original Android token, reuse it
        if (pendingToken && !isSigningIn) {
            debug("Re-validating Android token after token refresh...");
            handleTokenFromAndroid(pendingToken);
        }
    });

    // ---------------------------
    // 🔥 Expose global callback used by Android WebView
    // ---------------------------
    window.receiveAndroidToken = function (token) {
        debug("receiveAndroidToken() called from Android WebView");
        handleTokenFromAndroid(token);
    };

    return {
        receiveAndroidToken,
    };
})();

export default AndroidAuth;
