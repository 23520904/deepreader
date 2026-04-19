import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { booksApi } from '../api';
import './BookDetail.css';

export default function BookDetailPage() {
  const { bookId } = useParams();
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('chat');
  const [provider, setProvider] = useState('gemini');
  const [loading, setLoading] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const chatEndRef = useRef(null);

  // Summary state
  const [summary, setSummary] = useState('');
  const [summaries, setSummaries] = useState([]);

  // Flashcard state
  const [flashcards, setFlashcards] = useState([]);
  const [fcCount, setFcCount] = useState(10);
  const [revealedIdx, setRevealedIdx] = useState(new Set());

  useEffect(() => {
    booksApi.getSummaries(token, bookId).then(setSummaries).catch(() => {});
    booksApi.getFlashcards(token, bookId).then(setFlashcards).catch(() => {});
    booksApi.getChats(token, bookId).then(data => {
      if (data?.length) setChatMessages(data.map(c => ({ role: c.role, content: c.content })));
    }).catch(() => {});
  }, [bookId, token]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await booksApi.chat(token, bookId, q, 5, provider);
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.answer, sources: res.sources }]);
    } catch (err) {
      toast.error(err.message);
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Lỗi: ' + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummary = async () => {
    setLoading(true);
    try {
      const res = await booksApi.summary(token, bookId, provider);
      setSummary(res.summary);
      toast.success('Tóm tắt thành công!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFlashcards = async () => {
    setLoading(true);
    try {
      const res = await booksApi.flashcards(token, bookId, provider, fcCount);
      if (res.flashcards?.length) {
        setFlashcards(res.flashcards);
        setRevealedIdx(new Set());
        toast.success(`Tạo ${res.flashcards.length} flashcard!`);
      } else {
        toast.info('Không tạo được flashcard từ nội dung này');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleReveal = (i) => {
    setRevealedIdx(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const tabs = [
    { id: 'chat', label: '💬 Hỏi đáp', icon: '💬' },
    { id: 'summary', label: '📝 Tóm tắt', icon: '📝' },
    { id: 'flashcards', label: '🃏 Flashcards', icon: '🃏' },
  ];

  return (
    <div className="page-container">
      <div className="detail-header fade-in">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/books')}>← Quay lại</button>
        <select value={provider} onChange={e => setProvider(e.target.value)} className="provider-select">
          <option value="gemini">Gemini</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div className="detail-tabs fade-in">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} id={`tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div className="chat-container fade-in">
          <div className="chat-messages" id="chat-messages">
            {chatMessages.length === 0 && (
              <div className="empty-state">
                <h3>Bắt đầu hỏi đáp về cuốn sách</h3>
                <p>AI sẽ trả lời dựa trên nội dung sách đã phân tích</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
                <div className="chat-msg-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
                <div className="chat-msg-body">
                  <div className="chat-msg-content">{msg.content}</div>
                  {msg.sources?.length > 0 && (
                    <div className="chat-sources">
                      <span className="sources-label">Nguồn tham khảo:</span>
                      {msg.sources.map((s, j) => (
                        <span key={j} className="source-chip">{s.title || s.sectionId}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="chat-msg chat-msg-assistant"><div className="chat-msg-avatar">🤖</div><div className="chat-msg-body"><div className="typing-indicator"><span/><span/><span/></div></div></div>}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-bar" onSubmit={handleChat} id="chat-form">
            <input type="text" placeholder="Đặt câu hỏi về cuốn sách..." value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={loading} id="chat-input" />
            <button type="submit" className="btn btn-primary" disabled={loading || !chatInput.trim()} id="chat-send">Gửi</button>
          </form>
        </div>
      )}

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div className="summary-container fade-in">
          <button className="btn btn-primary" onClick={handleSummary} disabled={loading} id="gen-summary-btn">
            {loading ? <span className="spinner" /> : '✨ Tạo tóm tắt mới'}
          </button>
          {summary && (
            <div className="card summary-card">
              <h3>Tóm tắt từ {provider.toUpperCase()}</h3>
              <p className="summary-text">{summary}</p>
            </div>
          )}
          {summaries.length > 0 && (
            <div className="saved-summaries">
              <h3>Tóm tắt đã lưu</h3>
              {summaries.map((s, i) => (
                <div key={s.id || i} className="card summary-card">
                  <span className="badge badge-info">{s.model}</span>
                  <p className="summary-text">{s.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flashcards Tab */}
      {tab === 'flashcards' && (
        <div className="fc-container fade-in">
          <div className="fc-controls">
            <div className="input-group" style={{ width: 120 }}>
              <label>Số lượng</label>
              <input type="number" min={1} max={25} value={fcCount} onChange={e => setFcCount(Number(e.target.value))} />
            </div>
            <button className="btn btn-primary" onClick={handleFlashcards} disabled={loading} id="gen-fc-btn">
              {loading ? <span className="spinner" /> : '🃏 Tạo flashcards'}
            </button>
          </div>
          {flashcards.length > 0 && (
            <div className="fc-grid">
              {flashcards.map((fc, i) => (
                <div key={i} className={`card fc-card ${revealedIdx.has(i) ? 'revealed' : ''}`} onClick={() => toggleReveal(i)} id={`fc-${i}`}>
                  <div className="fc-question"><span className="fc-label">Q</span>{fc.question}</div>
                  {revealedIdx.has(i) && <div className="fc-answer"><span className="fc-label fc-label-a">A</span>{fc.answer}</div>}
                  {!revealedIdx.has(i) && <p className="fc-hint">Nhấn để xem đáp án</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
