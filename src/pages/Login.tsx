import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { ShieldCheck } from 'lucide-react';

const Login = () => {
  const { login, users } = useAppContext();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError('ID와 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    if (login(loginId, password)) {
      const user = users.find(u => u.loginId === loginId);
      if (user?.role === 'ADMIN' || loginId === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/my/dashboard');
      }
    } else {
      setError('일치하는 계정 정보가 없습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 40, borderRadius: 12, border: '1px solid var(--border-color)', width: 400, textAlign: 'center' }}>
        <ShieldCheck size={48} color="var(--accent-primary)" style={{ marginBottom: 20 }} />
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>D.P Works HR System</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>테스트 계정으로 로그인해주세요.</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input 
            type="text" 
            placeholder="아이디를 입력해주세요 (예: admin, hong, 마케팅홍길동)" 
            value={loginId} 
            onChange={e => setLoginId(e.target.value)} 
            style={{ padding: '12px 16px', fontSize: 15 }}
          />
          <input 
            type="password" 
            placeholder="비밀번호" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{ padding: '12px 16px', fontSize: 15 }}
          />
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'left' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ padding: 12, justifyContent: 'center', fontSize: 15 }}>
            로그인
          </button>
        </form>

        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'left', background: 'var(--bg-tertiary)', padding: 16, borderRadius: 8 }}>
          <strong>테스트 계정 목록:</strong><br/>
          (초기 비밀번호: <code>1234</code>, 관리자는 <code>admin</code>)<br/>
          - [ADMIN] ID: <code>admin</code><br/>
          - [EMPLOYEE - 개발] ID: <code>hong</code><br/>
          - [EMPLOYEE - 마케팅] ID: <code>kim</code><br/>
          - [EMPLOYEE - 디자인] ID: <code>lee</code>
        </div>
      </div>
    </div>
  );
};

export default Login;
