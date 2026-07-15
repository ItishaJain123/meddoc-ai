const {
  sendMessage,
  sendMessageStream,
  getConversationMessages,
  listConversations,
  deleteConversation,
} = require('../services/chatService');

// POST /api/chat/ask
async function ask(req, res) {
  const { question, conversationId } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const result = await sendMessage(req.user.id, question.trim(), conversationId);
  res.json(result);
}

// POST /api/chat/ask/stream — Server-Sent Events token stream
async function askStream(req, res) {
  const { question, conversationId } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const emit = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await sendMessageStream(req.user.id, question.trim(), conversationId, emit);
  } catch (err) {
    console.error('Chat stream error:', err);
    emit('error', { error: 'Failed to generate an answer. Please try again.' });
  } finally {
    res.end();
  }
}

// GET /api/chat/conversations
async function getConversations(req, res) {
  const conversations = await listConversations(req.user.id);
  res.json(conversations);
}

// GET /api/chat/conversations/:id
async function getConversation(req, res) {
  try {
    const conversation = await getConversationMessages(req.user.id, req.params.id);
    res.json(conversation);
  } catch (err) {
    if (err.message === 'Conversation not found') {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
}

// DELETE /api/chat/conversations/:id
async function removeConversation(req, res) {
  try {
    await deleteConversation(req.user.id, req.params.id);
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    if (err.message === 'Conversation not found') {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
}

module.exports = { ask, askStream, getConversations, getConversation, removeConversation };
