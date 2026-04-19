import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { booksApi } from '../api';
import { useNavigate } from 'react-router-dom';
import './BooksPage.css';

export default function BooksPage() {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [provider, setProvider] = useState('gemini');
  const fileRef = useRef(null);

  const fetchBooks = async () => {
    try {
      const data = await booksApi.list(token);
      setBooks(data || []);
    } catch (err) {
      toast.error('Không tải được danh sách sách: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, [token]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await booksApi.upload(token, file, provider);
      toast.success(`Upload thành công: ${res.book?.title || file.name}`);
      fetchBooks();
    } catch (err) {
      toast.error('Upload thất bại: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const getStatusBadge = (status) => {
    const map = { COMPLETED: 'badge-success', PROCESSING: 'badge-warning', FAILED: 'badge-error' };
    return <span className={`badge ${map[status] || 'badge-info'}`}>{status || 'UNKNOWN'}</span>;
  };

  return (
    <div className="page-container">
      <div className="books-header fade-in">
        <div>
          <h1 className="page-title">📚 Thư viện sách</h1>
          <p className="page-subtitle">Upload và quản lý sách PDF/EPUB của bạn</p>
        </div>
        <div className="books-actions">
          <select value={provider} onChange={e => setProvider(e.target.value)} className="provider-select" id="provider-select">
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
          </select>
          <label className={`btn btn-primary ${uploading ? 'btn-loading' : ''}`} id="upload-btn">
            {uploading ? <span className="spinner" /> : '⬆ Upload sách'}
            <input ref={fileRef} type="file" accept=".pdf,.epub" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : books.length === 0 ? (
        <div className="empty-state fade-in">
          <svg viewBox="0 0 64 64" fill="none"><rect x="8" y="12" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2"/><path d="M20 24h24M20 32h16M20 40h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <h3>Chưa có sách nào</h3>
          <p>Upload file PDF hoặc EPUB để bắt đầu hành trình đọc sâu với AI</p>
        </div>
      ) : (
        <div className="books-grid">
          {books.map((book, i) => (
            <div key={book.id} className="card book-card fade-in" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => navigate(`/books/${book.id}`)} id={`book-${book.id}`}>
              <div className="book-card-cover">
                <span className="book-format">{book.format || 'PDF'}</span>
              </div>
              <div className="book-card-info">
                <h3 className="book-title">{book.title}</h3>
                <div className="book-meta">
                  {getStatusBadge(book.status)}
                  {book.totalChapters > 0 && <span className="book-chapters">{book.totalChapters} chương</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
