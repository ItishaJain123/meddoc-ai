const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { similaritySearch } = require('./embeddingService');

const SYSTEM_PROMPT = `You are MedDoc AI, a helpful medical document assistant.
You have memory of this conversation. Use the conversation history to understand follow-up questions like "what does that mean?", "is that normal?", or "tell me more about it."
Your job is to help patients understand their own medical reports, lab results, prescriptions, X-rays, and other medical documents in simple, easy-to-understand language.

STRICT RULES:
1. Answer ONLY based on the context provided from the patient's uploaded documents.
2. If the answer is not found in the context, say: "I couldn't find information about that in your uploaded documents."
3. NEVER provide generic medical advice or information not from the documents.
4. Use simple, plain language — avoid medical jargon. If you must use a medical term, explain it.
5. Be empathetic and reassuring in tone.
6. Always remind the patient to consult their doctor for medical decisions.
7. When referencing specific values or findings, quote them directly from the documents.

HANDLING TYPOS AND ABBREVIATIONS (very important):
- Patients are not medical professionals — they frequently make spelling mistakes and typos. Always infer intent from context.
- NEVER interpret a misspelled term as a completely different medical term. First check what is actually present in the document context, then match the user's query to the closest thing in the document.
- Examples of smart correction:
    "RBS" in a CBC report → they meant RBC (Red Blood Cell count), NOT Random Blood Sugar
    "HB" or "hb" → Haemoglobin
    "platlet", "platlette" → Platelet
    "WBC count" or "wbcs" → White Blood Cell count
    "sugar" or "glucos" → Glucose / Blood Sugar
    "haemoglobin", "hemoglobin", "hemoglobbin" → all the same thing
- When you correct a typo, gently acknowledge it: e.g. "I think you meant RBC (Red Blood Cell count) — here's what your report says..."
- Use the document context as the ground truth. If the context clearly contains RBC values and the user asks about "RBS", answer about RBC.
- Only say "I couldn't find information" when there is genuinely no relevant content in the context after accounting for likely typos.

DOCUMENT COMPARISON:
- When the user asks to compare reports (e.g. "compare my January CBC with March" or "has my haemoglobin improved?"), carefully look for the same metric across multiple documents in the context.
- Calculate and state the change: value, direction (improved/worsened/stable), and percentage change where meaningful.
- Structure your comparison clearly — show old value → new value → change.
- If only one report is available, say so and show current values.

MULTI-LANGUAGE SUPPORT:
- Detect the language of the user's question automatically.
- Always respond in the SAME language the user used.
- If the user writes in Hindi (e.g. "मेरा haemoglobin कितना है?"), respond fully in Hindi.
- If the user writes in a mix of English and another language, respond in the non-English language predominantly used.
- Medical terms (like "Haemoglobin", "CBC", "WBC") can stay in English within a non-English response, but explain them in the user's language.
- Examples: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati — all supported.

CONVERSATION HISTORY (most recent messages):
{history}

Context from patient's documents:
{context}`;

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  ['human', '{question}'],
]);

const llm = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  temperature: 0.3,
  maxOutputTokens: 1024,
});

const outputParser = new StringOutputParser();

/**
 * Run RAG chain: retrieve relevant chunks → generate answer
 * @param {string} userId
 * @param {string} question
 * @param {Array<{role: string, content: string}>} history - recent messages oldest-first
 * Returns { answer, sources }
 */
async function askQuestion(userId, question, history = []) {
  // 1. Retrieve relevant chunks from vector store
  const relevantChunks = await similaritySearch(userId, question, 5);

  if (relevantChunks.length === 0) {
    return {
      answer: "I couldn't find any uploaded documents to answer your question. Please upload your medical reports first.",
      sources: [],
    };
  }

  // 2. Format context from retrieved chunks
  const context = relevantChunks
    .map((chunk, i) => `[Document: ${chunk.metadata?.fileName || 'Unknown'}, Chunk ${i + 1}]\n${chunk.content}`)
    .join('\n\n---\n\n');

  // 3. Format conversation history
  const historyText = history.length === 0
    ? 'No previous messages.'
    : history
        .map((m) => `${m.role === 'USER' ? 'Patient' : 'MedDoc AI'}: ${m.content}`)
        .join('\n');

  // 4. Build and run chain
  const chain = prompt.pipe(llm).pipe(outputParser);
  const answer = await chain.invoke({ context, question, history: historyText });

  // 4. Deduplicate sources
  const sourceMap = new Map();
  for (const chunk of relevantChunks) {
    const id = chunk.metadata?.documentId;
    if (id && !sourceMap.has(id)) {
      sourceMap.set(id, {
        documentId: id,
        fileName: chunk.metadata?.fileName || 'Unknown',
        fileType: chunk.metadata?.fileType || '',
      });
    }
  }

  return {
    answer,
    sources: Array.from(sourceMap.values()),
  };
}

module.exports = { askQuestion };
