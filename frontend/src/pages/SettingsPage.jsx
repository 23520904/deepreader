import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { userApi } from '../api';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, token } = useAuth();
  const toast = useToast();
  const [llmToken, setLlmToken] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!llmToken.trim()) { toast.error('Vui lòng nhập API token'); return; }
    setSaving(true);
    try {
      await userApi.updateLlmToken(token, llmToken);
      toast.success('Cập nhật LLM API Token thành công!');
      setLlmToken('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="fade-in">
        <h1 className="page-title">⚙️ Cài đặt</h1>
        <p className="page-subtitle">Quản lý tài khoản và cấu hình AI</p>
      </div>

      <div className="settings-grid fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="card settings-section">
          <h2 className="section-title">Thông tin tài khoản</h2>
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Vai trò</span>
            <span className={`badge ${user?.role === 'ADMIN' ? 'badge-warning' : 'badge-info'}`}>{user?.role}</span>
          </div>
          <div className="info-row">
            <span className="info-label">User ID</span>
            <span className="info-value info-mono">{user?.userId}</span>
          </div>
        </div>

        <form className="card settings-section" onSubmit={handleSave}>
          <h2 className="section-title">🔑 LLM API Token</h2>
          <p className="section-desc">Nhập API token của Gemini hoặc OpenAI để sử dụng key riêng. Nếu không nhập, hệ thống sẽ dùng key mặc định.</p>
          <div className="input-group">
            <label htmlFor="llm-token">API Token</label>
            <input id="llm-token" type="password" placeholder="sk-... hoặc AIza..." value={llmToken} onChange={e => setLlmToken(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} id="save-token-btn">
            {saving ? <span className="spinner" /> : 'Lưu Token'}
          </button>
        </form>
      </div>
    </div>
  );
}
