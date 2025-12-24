
import React, { useState, useEffect, useRef } from 'react';
import { fetchWordPressData } from './services/wordpressService';
import { GeminiService } from './services/geminiService';
import { WPPost, ChatMessage, WebsiteData, DisplayMode } from './types';

interface AppProps {
  initialMode: DisplayMode;
  autoUrl?: string;
}

const App: React.FC<AppProps> = ({ initialMode, autoUrl }) => {
  const [mode, setMode] = useState<DisplayMode>(initialMode);
  const [isOpen, setIsOpen] = useState(initialMode === 'inline');
  const [wpUrl, setWpUrl] = useState(autoUrl || '');
  const [siteData, setSiteData] = useState<WebsiteData>({ url: '', posts: [], isLoaded: false });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (autoUrl && !siteData.isLoaded) {
      handleConnectInternal(autoUrl);
    }
  }, [autoUrl]);

  const handleConnectInternal = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const posts = await fetchWordPressData(url);
      setSiteData({ url, posts, isLoaded: true });
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hello! I've indexed **${posts.length}** items from this site. How can I help you today?`,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      setError("Connect Failed: Make sure WordPress REST API is enabled.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (wpUrl) handleConnectInternal(wpUrl);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const gemini = new GeminiService();
      const result = await gemini.analyzeQuery(input, siteData.posts);
      const relevantPosts = siteData.posts.filter(p => result.recommendedPostIds.includes(p.id));

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        suggestions: relevantPosts
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'assistant',
        content: "Oops! I hit a snag. Check your API key or internet connection.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const ChatContent = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <i className="fab fa-wordpress text-xl"></i>
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">WP Assistant</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-[9px] opacity-80 uppercase font-bold tracking-wider">AI Live</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('settings')} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
            <i className="fas fa-cog text-xs"></i>
          </button>
          {mode === 'widget' && (
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {!siteData.isLoaded ? (
        <div className="flex-1 flex flex-col p-8 items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-robot text-2xl text-blue-500"></i>
          </div>
          <h4 className="font-bold text-gray-800 mb-2">Setup Required</h4>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">Enter your site URL to allow the AI to read your posts and pages.</p>
          <form onSubmit={handleConnect} className="w-full space-y-3">
            <input
              type="url"
              placeholder="https://example.com"
              className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              value={wpUrl}
              onChange={(e) => setWpUrl(e.target.value)}
            />
            <button className="w-full bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl shadow-lg hover:bg-blue-700 transition-all transform active:scale-95">
              {isLoading ? 'Connecting...' : 'Start Indexing'}
            </button>
          </form>
          {error && <p className="text-[10px] text-red-500 mt-4 bg-red-50 p-2 rounded border border-red-100">{error}</p>}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] shadow-sm ${
                  msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                }`}>
                  <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Top Matches</p>
                      {msg.suggestions.map(post => (
                        <a 
                          key={post.id} 
                          href={post.link} 
                          target="_blank" 
                          className="flex items-center gap-3 p-2.5 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-200 hover:border-blue-200 transition-all group"
                        >
                          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm border border-gray-100">
                             <i className="fas fa-file-alt text-[10px]"></i>
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 truncate flex-1" dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                          <i className="fas fa-arrow-right text-[9px] text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"></i>
                        </a>
                      ))}
                    </div>
                  )}
                  <span className={`block text-[8px] mt-2 font-medium uppercase tracking-tighter opacity-40 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-3.5 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              placeholder="Search site content..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 active:scale-90 transition-all shadow-lg shadow-blue-200">
              <i className="fas fa-paper-plane text-xs"></i>
            </button>
          </form>
        </>
      )}
    </div>
  );

  const SettingsContent = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => setActiveTab('chat')} className="text-gray-400 hover:text-gray-600 p-1">
          <i className="fas fa-chevron-left"></i>
        </button>
        <h3 className="font-bold text-sm text-gray-800">WordPress Integration</h3>
      </div>
      <div className="flex-1 p-6 overflow-y-auto space-y-8 custom-scrollbar">
        <section>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Shortcode Guide</label>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-700 mb-2">Inline Chatbot</p>
              <p className="text-[10px] text-gray-500 mb-3">Place inside any Page or Post content:</p>
              <code className="block bg-slate-900 text-blue-300 p-3 rounded-lg text-[11px] font-mono select-all">
                [ai_chatbot mode="inline"]
              </code>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-700 mb-2">Floating Widget</p>
              <p className="text-[10px] text-gray-500 mb-3">This appears automatically, but you can force it:</p>
              <code className="block bg-slate-900 text-blue-300 p-3 rounded-lg text-[11px] font-mono select-all">
                [ai_chatbot mode="widget"]
              </code>
            </div>
          </div>
        </section>

        <section>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Admin Actions</label>
          <div className="space-y-3">
            <button 
              onClick={() => { setSiteData({ url: '', posts: [], isLoaded: false }); setActiveTab('chat'); }}
              className="w-full text-xs text-blue-600 font-bold py-3 rounded-xl border-2 border-blue-50 bg-white hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-sync-alt"></i> Re-index Website Data
            </button>
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              Updating your site content? Re-index to help the AI learn about your new posts.
            </p>
          </div>
        </section>
      </div>
    </div>
  );

  if (mode === 'widget') {
    return (
      <div className="fixed inset-0 pointer-events-none z-[999999] font-sans">
        <div className={`fixed bottom-24 right-6 flex flex-col items-end pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'}`}>
          <div className="w-[380px] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-200/50 flex flex-col overflow-hidden">
            {activeTab === 'chat' ? <ChatContent /> : <SettingsContent />}
          </div>
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed bottom-6 right-6 w-16 h-16 rounded-[22px] shadow-2xl flex items-center justify-center transition-all duration-300 pointer-events-auto transform hover:scale-105 active:scale-90 ${isOpen ? 'bg-white text-gray-600 rotate-90 shadow-blue-500/20' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:shadow-blue-500/40'}`}
        >
          {isOpen ? <i className="fas fa-times text-2xl"></i> : <i className="fas fa-comment-dots text-3xl"></i>}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
            </span>
          )}
        </button>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border border-gray-200 rounded-3xl shadow-xl overflow-hidden flex flex-col font-sans bg-white">
      {activeTab === 'chat' ? <ChatContent /> : <SettingsContent />}
      <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;
