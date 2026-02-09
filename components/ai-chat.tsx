'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { ScreenCaptureTool } from '@/components/screen-capture-tool';
import { X, Send, Sparkles, MessageCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';


export function AiChat() {
  const { isChatOpen, toggleChat, messages, isLoading, sendMessage } = useChatStore();
  const [input, setInput] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatOpen]);

  const handleSend = async () => {
    if (!input.trim() && !capturedImage) return;

    await sendMessage(input, capturedImage || undefined);
    setInput('');
    setCapturedImage(null);
  };

  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50 group"
        aria-label="Open AI Chat"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-in slide-in-from-bottom-5 fade-in duration-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">AI Coach</h3>

          </div>
        </div>
        <button
          onClick={toggleChat}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">How can I help you?</h3>
            <p className="text-sm text-gray-500 max-w-[200px]">
              Ask me about the music, technique, or select a part of the score to analyze.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex flex-col max-w-[85%] space-y-1',
              message.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            )}
          >
            <div
              className={cn(
                'px-4 py-3 text-sm shadow-sm',
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm'
              )}
            >
              {message.image && (
                <img
                  src={message.image}
                  alt="Captured context"
                  className="rounded-lg mb-3 max-w-full border border-white/20"
                />
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
            <span className="text-[10px] text-gray-400 px-1 opacity-70">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 z-20">
        {capturedImage && (
          <div className="mb-4 relative inline-block group">
            <img
              src={capturedImage}
              alt="Capture preview"
              className="h-20 rounded-lg border border-gray-200 shadow-sm"
            />
            <button
              onClick={() => setCapturedImage(null)}
              className="absolute -top-2 -right-2 p-1 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
          <div className="shrink-0 pb-1">
             <ScreenCaptureTool onCapture={handleCapture} disabled={isLoading} />
          </div>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 bg-transparent border-none focus:ring-0 p-2 min-h-[40px] max-h-[120px] resize-none text-sm placeholder:text-gray-400"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />

          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !capturedImage)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
