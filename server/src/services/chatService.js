const prisma = require('../config/db');
const { askQuestion } = require('../agents/ragChain');

/**
 * Get or create a conversation for a user
 */
async function getOrCreateConversation(userId, conversationId) {
  if (conversationId) {
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (existing) return existing;
  }

  return prisma.conversation.create({
    data: { userId, title: 'New Conversation' },
  });
}

/**
 * Auto-generate a conversation title from the first question
 */
function generateTitle(question) {
  return question.length > 60 ? question.slice(0, 57) + '...' : question;
}

/**
 * Send a message and get an AI answer
 */
async function sendMessage(userId, question, conversationId) {
  // 1. Get or create conversation
  const conversation = await getOrCreateConversation(userId, conversationId);

  // 2. Update title on first message
  const messageCount = await prisma.message.count({
    where: { conversationId: conversation.id },
  });
  if (messageCount === 0) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: generateTitle(question) },
    });
  }

  // 3. Save user message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'USER',
      content: question,
    },
  });

  // 4. Fetch last 8 messages as memory (4 exchanges)
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: 8,
    select: { role: true, content: true },
  });

  // 5. Run RAG chain with history
  const { answer, sources } = await askQuestion(userId, question, recentMessages);

  // 6. Save assistant message
  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: answer,
      sources: sources,
    },
  });

  return {
    conversationId: conversation.id,
    message: assistantMessage,
    sources,
  };
}

/**
 * Get all messages in a conversation
 */
async function getConversationMessages(userId, conversationId) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conversation) throw new Error('Conversation not found');
  return conversation;
}

/**
 * List all conversations for a user
 */
async function listConversations(userId) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, role: true },
      },
    },
  });
}

/**
 * Delete a conversation and all its messages
 */
async function deleteConversation(userId, conversationId) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) throw new Error('Conversation not found');

  await prisma.conversation.delete({ where: { id: conversationId } });
}

module.exports = {
  sendMessage,
  getConversationMessages,
  listConversations,
  deleteConversation,
};
