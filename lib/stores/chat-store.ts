import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatStoreState, ChatMessage } from '@/lib/types';

export const useChatStore = create<ChatStoreState>()(
  devtools(
    (set, get) => ({
      // Initial State
      isChatOpen: false,
      messages: [],
      isLoading: false,

      // Actions
      toggleChat: () => {
        set((state) => ({ isChatOpen: !state.isChatOpen }));
      },

      addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        const newMessage: ChatMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      sendMessage: async (content: string, image?: string) => {
        const { addMessage } = get();
        
        // Add user message
        addMessage({
          role: 'user',
          content,
          image,
        });

        // Set loading state
        set({ isLoading: true });

        try {
          // Call API
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: get().messages,
              currentMessage: content,
              image,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to get AI response');
          }

          const data = await response.json();

          // Add AI response
          addMessage({
            role: 'assistant',
            content: data.message,
          });
        } catch (error) {
          console.error('Chat error:', error);
          addMessage({
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
          });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    { name: 'ChatStore' }
  )
);
