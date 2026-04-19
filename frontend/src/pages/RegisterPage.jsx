import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    setLoading(true);
    try {
      await register(email, password);
      toast.success('Đăng ký thành công!');
      navigate('/books');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />
      <form className="auth-card fade-in" onSubmit={handleSubmit}>
        <div className="auth-header">
          <h1>Tạo tài khoản</h1>
          <p>Bắt đầu hành trình đọc sâu với AI</p>
        </div>
        <div className="input-group">
          <label htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="input-group">
          <label htmlFor="reg-password">Mật khẩu</label>
          <input id="reg-password" type="password" placeholder="Tối thiểu 8 ký tự" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="input-group">
          <label htmlFor="reg-confirm">Xác nhận mật khẩu</label>
          <input id="reg-confirm" type="password" placeholder="Nhập lại mật khẩu" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading} id="register-submit">
          {loading ? <span className="spinner" /> : 'Đăng ký'}
        </button>
        <p className="auth-footer">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
      </form>
    </div>
  );
}
