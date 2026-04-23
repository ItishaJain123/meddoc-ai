import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { askQuestion, fetchConversation, deleteConversation } from '../services/chatService';

export function useChat() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(
    async (question) => {
      // Optimistically add user message
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'USER', content: question },
      ]);
      setLoading(true);
      setError(null);

      try {
        const result = await askQuestion(question, conversationId, getToken);

        setConversationId(result.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: result.message.id,
            role: 'ASSISTANT',
            content: result.message.content,
            sources: result.sources,
          },
        ]);
      } catch (err) {
        setError(err.message);
        // Remove the optimistic user message on failure
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [conversationId, getToken]
  );

  const loadConversation = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const data = await fetchConversation(id, getToken);
        setConversationId(data.id);
        setMessages(data.messages);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  const removeConversation = useCallback(
    async (id) => {
      await deleteConversation(id, getToken);
      if (id === conversationId) startNewChat();
    },
    [conversationId, getToken, startNewChat]
  );

  return {
    messages,
    conversationId,
    loading,
    error,
    sendMessage,
    loadConversation,
    startNewChat,
    removeConversation,
  };
}
