import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateLeaveBalance } from '../utils/leaveCalculations';
import type { Employee, Branch, Department } from '../types';
import { X, Save, Trash2, Calendar, FileText } from 'lucide-react';

interface EmployeeDrawerProps {
  employeeId: string | null;
  onClose: () => void;
}

const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({ employeeId, onClose }) => {
  const { employees, leaveRequests, approvalLogs, addEmployee, updateEmployee, deleteEmployee, users, resetUserPassword } = useAppContext();
  
  const isEditing = !!employeeId;
  const existingEmp = isEditing ? (employees || []).find(e => e.id === employeeId) : null;
  const existingUser = existingEmp ? (users || []).find(u => u.employeeId === employeeId) : null;
  
  const [loginId, setLoginId] = useState('');
  
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    name: '',
    joinDate: new Date().toISOString().split('T')[0],
    branch: '가산',
    department: '개발',
    policyType: 'LEGAL',
    statusNotes: ''
  });

  useEffect(() => {
    if (existingEmp) {
      setFormData({
        name: existingEmp.name,
        joinDate: existingEmp.joinDate,
        branch: existingEmp.branch,
        department: existingEmp.department,
        policyType: existingEmp.policyType,
        statusNotes: existingEmp.statusNotes
      });
      if (existingUser) setLoginId(existingUser.loginId);
    }
  }, [existingEmp, existingUser]);

  const balance = existingEmp ? calculateLeaveBalance(existingEmp, leaveRequests) : null;
  
  // Safe filtering preventing "reading filter of undefined" runtime crashes
  const empRequests = employeeId ? (leaveRequests || []).filter(r => r.employeeId === employeeId) : [];
  const empApproved = empRequests.filter(r => r.status === 'APPROVED');
  const recentLogs = employeeId ? (approvalLogs || []).filter(l => 
    empRequests.some(req => req.id === l.requestId)
  ).sort((a,b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()).slice(0, 5) : [];

  const handleSave = () => {
    if (!formData.name) return alert('이름을 입력해주세요.');
    if (!isEditing && !loginId) return alert('신규 직원의 로그인 ID를 지정해주세요.');
    
    if (isEditing && existingEmp) {
      updateEmployee({ ...formData, id: existingEmp.id });
    } else {
      addEmployee(formData, loginId);
    }
    onClose();
  };

  const handleResetPassword = () => {
    if (window.confirm(`${existingEmp?.name} 직원의 비밀번호를 초기화(1234) 하시겠습니까?`)) {
      if (employeeId) {
        resetUserPassword(employeeId);
        alert('이 직원의 비밀번호가 1234 로 초기화되었습니다.');
      }
    }
  };

  const handleDelete = () => {
    if (window.confirm('정말 삭제하시겠습니까? 관련 연차 내역도 모두 삭제됩니다.')) {
      if (employeeId) {
        deleteEmployee(employeeId);
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" style={{ right: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>

        
        <div style={{ padding: 24, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{isEditing ? '직원 상세 / 수정' : '신규 직원 등록'}</h2>
          <button className="btn" onClick={onClose} style={{ padding: 8 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="profile-grid" style={{ gap: 16 }}>
            <div className="form-group">
              <label>이름</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="이름 입력" />
            </div>
            
            <div className="form-group">
              <label>로그인 ID</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  value={loginId} 
                  onChange={e => setLoginId(e.target.value.replace(/[^a-zA-Z0-9_가-힣]/g, ''))} 
                  placeholder="예: hong123, 마케팅홍길동" 
                  disabled={isEditing} 
                  style={{ flex: 1, backgroundColor: isEditing ? 'var(--bg-primary)' : undefined, color: isEditing ? 'var(--text-tertiary)' : undefined }}
                />
                {isEditing && existingUser && (
                  <button className="btn" onClick={handleResetPassword} style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                    PW 초기화
                  </button>
                )}
              </div>
              {!isEditing && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>초기 비밀번호는 <code>1234</code>로 자동 지정됩니다.</span>}
            </div>

            <div className="form-group">
              <label>입사일</label>
              <input type="date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label>지점</label>
              <select value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value as Branch})}>
                <option value="가산">가산 (기본 Gasan Branch)</option>
                <option value="강남">강남 (Gangnam Branch)</option>
              </select>
            </div>
            <div className="form-group">
              <label>부서</label>
              <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value as Department})}>
                <option value="개발">개발 (Development)</option>
                <option value="마케팅">마케팅 (Marketing)</option>
                <option value="디자인">디자인 (Design)</option>
              </select>
            </div>

            <div className="form-group">
              <label>적용 규정</label>
              <select value={formData.policyType} onChange={e => setFormData({...formData, policyType: e.target.value as 'LEGAL' | 'INTERNAL'})}>
                <option value="LEGAL">법정 기준형 (1년 단위)</option>
                <option value="INTERNAL">내규/강남형 (월 단위 포함)</option>
              </select>
            </div>
            <div className="form-group">
              <label>상태 / 비고</label>
              <input type="text" value={formData.statusNotes} onChange={e => setFormData({...formData, statusNotes: e.target.value})} placeholder="예: 팀장, 계약직 등" />
            </div>
          </div>

          {isEditing && balance && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={16} /> 연차 사용 요약</h3>
              <div className="stats-grid" style={{ marginBottom: 16, gap: 12 }}>
                <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>초기 발생</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{balance.generatedLeave}일</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>사용 완료</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)' }}>{balance.usedLeave}일</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>잔여 연차</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa' }}>{balance.remainingLeave}일</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>승인 대기</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--warning)' }}>{balance.pendingRequestsCount}건</div>
                </div>
              </div>
              <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderLeft: '3px solid #3b82f6', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="#3b82f6" />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  <strong>산정 근거:</strong> {balance.breakdownText}
                </span>
              </div>
            </div>
          )}

          {isEditing && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 16 }}>최근 확정된 일정 (승인)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {empApproved.slice(0, 5).map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px dashed var(--border-color)', paddingBottom: 8 }}>
                    <span>{req.date} ({req.type === 'MONTHLY' ? '월차' : '연차'})</span>
                    <strong style={{ color: 'var(--success)' }}>{req.amount}일</strong>
                  </div>
                ))}
                {empApproved.length === 0 && <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>내역 없음</div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 24, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)' }}>
          {isEditing ? (
             <button className="btn" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={handleDelete}>
               <Trash2 size={16} /> 직원 삭제
             </button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> 저장</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDrawer;
