/**
 * Retries an async fn on 429 rate-limit errors using exponential backoff.
 * All other errors are re-thrown immediately.
 */
async function retryWithBackoff(fn, { maxRetries = 3, baseDelayMs = 5000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.message?.includes('429') || err?.status === 429;
      if (!is429 || attempt === maxRetries) throw err;

      // Parse retry delay from the error message if available, else use backoff
      const retryMatch = err.message?.match(/retry in (\d+(?:\.\d+)?)s/i);
      const waitMs = retryMatch
        ? Math.ceil(parseFloat(retryMatch[1])) * 1000
        : baseDelayMs * Math.pow(2, attempt);

      console.warn(`[retryWithBackoff] 429 rate limit, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitMs));
      lastErr = err;
    }
  }
  throw lastErr;
}

module.exports = { retryWithBackoff };
