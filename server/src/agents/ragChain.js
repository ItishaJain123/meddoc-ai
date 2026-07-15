const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { similaritySearch } = require("./embeddingService");
const { retryWithBackoff } = require("../utils/retryWithBackoff");

const SYSTEM_PROMPT = `You are MedDoc AI, a helpful medical document assistant.
You have memory of this conversation. Use the conversation history to understand follow-up questions like "what does that mean?", "is that normal?", or "tell me more about it."
Your job is to help patients understand their own medical reports, lab results, prescriptions, X-rays, and other medical documents in simple, easy-to-understand language.

STRICT RULES:
1. Answer ONLY based on the context provided from the patient's uploaded documents.
2. If the answer is not found in the context, say: "I couldn't find information about that in your uploaded documents."
3. NEVER provide generic medical advice or information not from the documents.
4. Use simple, plain language — avoid medical jargon. If you must use a medical term, explain it.
5. When referencing specific values or findings, quote them directly from the documents.
6. CITATION REQUIRED: Every specific number, test result, or finding you mention MUST be followed by its source in parentheses. Format: (Source: filename). Example: "Your RBC is 5.0 g/dL (Source: blood_test_march.pdf)". Never state a medical value without citing which document it came from.
7. CONFLICTING VALUES: If the same metric appears in multiple documents with different values, always state ALL values with their sources. Example: "Your RBC was 15.0 g/dL (Source: report_jan.pdf) and later 5.0 g/dL (Source: report_mar.pdf). The most recent value is 5.0 g/dL." Never silently pick one value when multiple exist.

TONE — talk like a knowledgeable friend, not a lab machine:
- Lead with the answer in one plain sentence, then give the details. Don't open with preamble like "Based on the context provided..." or "According to your documents...".
- Be warm and human. Good news deserves a genuinely positive note ("Great news — your glucose is back in the normal range"). Concerning values deserve calm, steady framing — never alarming, never dismissive.
- Keep answers SHORT. Two or three short paragraphs or a few bullets beat a wall of text. Stop when the question is answered.
- Vary your phrasing between answers; never repeat the same stock sentences every time.
- Suggest talking to their doctor ONLY when it genuinely matters: abnormal or critical values, medication questions, or decisions. Phrase it naturally ("worth mentioning to your doctor at your next visit") — do NOT tack a doctor disclaimer onto every single answer, and never use the same canned reminder twice in a conversation.

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
  ["system", SYSTEM_PROMPT],
  ["human", "{question}"],
]);

const llm = new ChatGoogleGenerativeAI({
  apiKey: process.env.MEDDOC_GOOGLE_API_KEY,
  model: process.env.MEDDOC_GEMINI_MODEL,
  apiVersion: 'v1beta',
  temperature: 0.3,
  maxOutputTokens: 1024,
});

const outputParser = new StringOutputParser();

/**
 * Retrieve relevant chunks and format the prompt inputs + deduped sources.
 * Returns null when the user has no documents.
 */
async function prepareRun(userId, question, history) {
  const relevantChunks = await similaritySearch(userId, question, 5);
  if (relevantChunks.length === 0) return null;

  const context = relevantChunks
    .map(
      (chunk, i) =>
        `[Document: ${chunk.metadata?.fileName || "Unknown"}, Chunk ${i + 1}]\n${chunk.content}`,
    )
    .join("\n\n---\n\n");

  const historyText =
    history.length === 0
      ? "No previous messages."
      : history
          .map(
            (m) =>
              `${m.role === "USER" ? "Patient" : "MedDoc AI"}: ${m.content}`,
          )
          .join("\n");

  // Deduplicate sources; keep the highest-ranked chunk text as a snippet so
  // the client can highlight the cited passage in the document viewer.
  const sourceMap = new Map();
  for (const chunk of relevantChunks) {
    const id = chunk.metadata?.documentId;
    if (id && !sourceMap.has(id)) {
      sourceMap.set(id, {
        documentId: id,
        fileName: chunk.metadata?.fileName || "Unknown",
        fileType: chunk.metadata?.fileType || "",
        snippet: (chunk.content || "").slice(0, 300),
      });
    }
  }

  return { context, historyText, sources: Array.from(sourceMap.values()) };
}

const NO_DOCS_ANSWER =
  "I couldn't find any uploaded documents to answer your question. Please upload your medical reports first.";

/**
 * Run RAG chain: retrieve relevant chunks → generate answer
 * Returns { answer, sources }
 */
async function askQuestion(userId, question, history = []) {
  const run = await prepareRun(userId, question, history);
  if (!run) return { answer: NO_DOCS_ANSWER, sources: [] };

  const chain = prompt.pipe(llm).pipe(outputParser);
  const answer = await retryWithBackoff(() =>
    chain.invoke({ context: run.context, question, history: run.historyText }),
  );

  return { answer, sources: run.sources };
}

/**
 * Streaming variant: calls onToken(text) for each generated chunk.
 * Returns the full { answer, sources } once the stream completes.
 */
async function askQuestionStream(userId, question, history = [], onToken = () => {}) {
  const run = await prepareRun(userId, question, history);
  if (!run) {
    onToken(NO_DOCS_ANSWER);
    return { answer: NO_DOCS_ANSWER, sources: [] };
  }

  const chain = prompt.pipe(llm).pipe(outputParser);
  const stream = await retryWithBackoff(() =>
    chain.stream({ context: run.context, question, history: run.historyText }),
  );

  let answer = "";
  for await (const token of stream) {
    if (token) {
      answer += token;
      onToken(token);
    }
  }

  return { answer, sources: run.sources };
}

module.exports = { askQuestion, askQuestionStream };
