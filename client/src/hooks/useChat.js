import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { askQuestionStream, fetchConversation, deleteConversation } from '../services/chatService';

export function useChat() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(
    async (question) => {
      // Optimistically add user message with a stable id we can remove later
      const userMsgId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: 'USER', content: question },
      ]);
      setLoading(true);
      setError(null);

      const streamId = `stream-${Date.now()}`;
      let gotFirstToken = false;

      try {
        await askQuestionStream(question, conversationId, getToken, {
          onMeta: ({ conversationId: id }) => setConversationId(id),
          onToken: (text) => {
            if (!gotFirstToken) {
              gotFirstToken = true;
              setMessages((prev) => [
                ...prev,
                { id: streamId, role: 'ASSISTANT', content: text, streaming: true },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) => (m.id === streamId ? { ...m, content: m.content + text } : m))
              );
            }
          },
          onDone: ({ conversationId: id, message, sources }) => {
            setConversationId(id);
            setMessages((prev) => {
              const final = {
                id: message.id,
                role: 'ASSISTANT',
                content: message.content,
                sources,
              };
              return gotFirstToken
                ? prev.map((m) => (m.id === streamId ? final : m))
                : [...prev, final];
            });
          },
        });
      } catch (err) {
        setError(err.message);
        // Remove exactly the two messages we added (the optimistic user message
        // and any partial streamed answer) — never a positional slice, which
        // could delete an unrelated message.
        setMessages((prev) => prev.filter((m) => m.id !== streamId && m.id !== userMsgId));
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
