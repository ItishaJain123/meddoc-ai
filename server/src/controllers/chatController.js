const {
  sendMessage,
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

module.exports = { ask, getConversations, getConversation, removeConversation };
