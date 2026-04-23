const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

const VECTOR_STORE_DIR = process.env.VECTOR_STORE_DIR || path.join(__dirname, '../../vector_store');

if (!fs.existsSync(VECTOR_STORE_DIR)) {
  fs.mkdirSync(VECTOR_STORE_DIR, { recursive: true });
}

function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  });
}

function getStorePath(userId) {
  return path.join(VECTOR_STORE_DIR, `${userId}.json`);
}

function loadStore(userId) {
  const p = getStorePath(userId);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveStore(userId, vectors) {
  fs.writeFileSync(getStorePath(userId), JSON.stringify(vectors));
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embed and store document chunks for a user
 * Each chunk: { pageContent, metadata }
 */
async function addDocumentToVectorStore(userId, chunks) {
  const embeddings = getEmbeddings();
  const texts = chunks.map((c) => c.pageContent);
  const vectors = await embeddings.embedDocuments(texts);

  const existing = loadStore(userId);

  const newEntries = chunks.map((chunk, i) => ({
    content: chunk.pageContent,
    embedding: vectors[i],
    metadata: chunk.metadata,
  }));

  saveStore(userId, [...existing, ...newEntries]);
}

/**
 * Remove all vectors for a specific document
 */
async function removeDocumentFromVectorStore(userId, documentId) {
  const existing = loadStore(userId);
  const remaining = existing.filter((v) => v.metadata?.documentId !== documentId);

  if (remaining.length === 0) {
    const p = getStorePath(userId);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return;
  }

  saveStore(userId, remaining);
}

/**
 * Retrieve top-k relevant chunks for a query
 */
async function similaritySearch(userId, query, k = 5) {
  const store = loadStore(userId);
  if (store.length === 0) return [];

  const embeddings = getEmbeddings();
  const [queryVector] = await embeddings.embedDocuments([query]);

  const scored = store.map((entry) => ({
    content: entry.content,
    metadata: entry.metadata,
    score: cosineSimilarity(queryVector, entry.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

module.exports = {
  addDocumentToVectorStore,
  removeDocumentFromVectorStore,
  similaritySearch,
};
