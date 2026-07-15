// Login gate: Clerk sign-in with the SAME MedDoc account, then verify the token
// against the MedDoc server before unlocking the app.
const statusEl = document.getElementById('status');

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

async function main() {
  const config = await fetch('/config').then((r) => r.json());
  if (!config.clerkPublishableKey || config.clerkPublishableKey.startsWith('pk_test_xxxxx')) {
    return setStatus('Missing CLERK_PUBLISHABLE_KEY in companion/.env — copy it from client/.env', true);
  }

  // Load Clerk's browser SDK from CDN
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
    s.setAttribute('data-clerk-publishable-key', config.clerkPublishableKey);
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Clerk (check internet connection)'));
    document.head.appendChild(s);
  });

  const clerk = window.Clerk;
  await clerk.load();

  if (clerk.user) {
    // already signed in from a previous session — verify silently
    return verifyAndEnter(clerk, config);
  }

  setStatus('');
  clerk.mountSignIn(document.getElementById('clerk-signin'), {
    appearance: { variables: { colorPrimary: '#0f766e' } },
  });

  // Clerk doesn't navigate in our app — poll for the session appearing
  const poll = setInterval(async () => {
    if (clerk.user) {
      clearInterval(poll);
      await verifyAndEnter(clerk, config);
    }
  }, 800);
}

async function verifyAndEnter(clerk, config) {
  try {
    setStatus('Verifying with MedDoc server…');
    const token = await clerk.session.getToken();
    // Verify via the main process (Node) to avoid the browser's CORS block
    const result = await window.companion.verifyMedDoc(token);
    if (!result.ok) {
      if (result.status === 0) throw new Error(result.error || 'Cannot reach the MedDoc server');
      throw new Error(`Server rejected the session (${result.status})`);
    }

    const email = clerk.user.primaryEmailAddress?.emailAddress || '';
    setStatus(`Welcome, ${email}! Starting your companion…`);
    await window.companion.authSuccess({ email });
  } catch (err) {
    setStatus(`Could not verify: ${err.message}. Is the MedDoc server running?`, true);
  }
}

main().catch((err) => setStatus(err.message, true));
