import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { adminApi } from '../api';
import './AdminPage.css';

export default function AdminPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('audit');
  const [auditLogs, setAuditLogs] = useState([]);
  const [deadLetters, setDeadLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [logs, dls] = await Promise.all([
          adminApi.auditLogs(token, 50),
          adminApi.deadLetters(token, 48),
        ]);
        setAuditLogs(logs || []);
        setDeadLetters(dls || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <div className="page-container">
      <div className="fade-in">
        <h1 className="page-title">🛡️ Admin Dashboard</h1>
        <p className="page-subtitle">Giám sát hoạt động hệ thống</p>
      </div>

      <div className="detail-tabs fade-in" style={{ marginTop: 24 }}>
        <button className={`tab-btn ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>📋 Audit Logs</button>
        <button className={`tab-btn ${tab === 'dead' ? 'active' : ''}`} onClick={() => setTab('dead')}>⚠️ Dead Letters</button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : tab === 'audit' ? (
        <div className="admin-table-wrap fade-in">
          {auditLogs.length === 0 ? (
            <div className="empty-state"><h3>Chưa có log nào</h3></div>
          ) : (
            <table className="admin-table" id="audit-table">
              <thead>
                <tr><th>Thời gian</th><th>User ID</th><th>Action</th><th>Chi tiết</th></tr>
              </thead>
              <tbody>
                {auditLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="mono">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                    <td className="mono">{log.user_id?.substring(0, 8)}...</td>
                    <td><span className="badge badge-info">{log.action}</span></td>
                    <td className="text-muted">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="admin-table-wrap fade-in">
          {deadLetters.length === 0 ? (
            <div className="empty-state"><h3>Không có dead letter nào</h3><p>Hệ thống hoạt động ổn định 🎉</p></div>
          ) : (
            <table className="admin-table" id="dead-letter-table">
              <thead>
                <tr><th>Job ID</th><th>File</th><th>Lỗi</th><th>Attempts</th><th>Thời gian</th></tr>
              </thead>
              <tbody>
                {deadLetters.map((dl, i) => (
                  <tr key={i}>
                    <td className="mono">{dl.job_id?.substring(0, 8)}...</td>
                    <td>{dl.file_name}</td>
                    <td className="text-error">{dl.error_message}</td>
                    <td>{dl.attempts}</td>
                    <td className="mono">{new Date(dl.created_at).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
