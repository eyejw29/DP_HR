import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateLeaveBalance } from '../utils/leaveCalculations';
import { Check, X, AlertCircle } from 'lucide-react';
import { differenceInMonths } from 'date-fns';

const AdminRequests = () => {
  const { currentUser, employees, leaveRequests, approvalLogs, processLeaveRequest } = useAppContext();
  
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingRequests = (leaveRequests || []).filter(r => r.status === 'PENDING').sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  // Recent 10 logs
  const recentLogs = [...(approvalLogs || [])].sort((a,b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()).slice(0, 10);

  const handleApprove = (reqId: string) => {
    if (window.confirm('해당 연차 신청을 승인하시겠습니까? 승인 시 잔여 연차가 차감됩니다.')) {
      processLeaveRequest(reqId, currentUser?.id || 'admin', 'APPROVED', '');
    }
  };

  const handleRejectInit = (reqId: string) => {
    setRejectId(reqId);
    setRejectReason('');
  };

  const submitReject = () => {
    if (!rejectReason.trim()) {
      alert('반려 사유를 반드시 입력해야 합니다.');
      return;
    }
    if (rejectId) {
      processLeaveRequest(rejectId, currentUser?.id || 'admin', 'REJECTED', rejectReason);
      setRejectId(null);
    }
  };

  return (
    <div className="flex-mobile-column" style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%', gap: 24, alignItems: 'flex-start' }}>
      
      {/* Left Panel: Pending Requests */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>결재 대기 중인 요청 현황</h1>
        
        {pendingRequests.map(req => {
          const emp = employees.find(e => e.id === req.employeeId);
          if (!emp) return null;
          
          const bal = calculateLeaveBalance(emp, leaveRequests);
          const svcs = differenceInMonths(new Date(), new Date(emp.joinDate));
          
          return (
            <div key={req.id} style={{ 
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24 
            }}>
              <div className="mobile-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div className="mobile-wrap" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</span>
                    <span className="badge internal">{emp.branch} / {emp.department}</span>
                    <span className={`badge ${emp.policyType === 'LEGAL' ? 'legal' : 'internal'}`}>
                      {emp.policyType === 'LEGAL' ? '법정' : '내규'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    신청일시: {new Date(req.createdAt).toLocaleString('ko-KR')} | 입사: {emp.joinDate} ({svcs}개월)
                  </div>
                </div>
                
                <div style={{ textAlign: 'left', background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', flex: 1, minWidth: 200, maxWidth: 300 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>해당 요청 승인 시 잔여</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: bal.remainingLeave - req.amount < 0 ? 'var(--danger)' : '#60a5fa' }}>
                    {bal.remainingLeave}일 ➔ {bal.remainingLeave - req.amount}일
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 8, borderLeft: '3px solid var(--warning)', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>요청 일자</span>
                    <strong style={{ fontSize: 15 }}>{req.date}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>신청 일수 / 구분</span>
                    <strong style={{ fontSize: 15, color: '#f59e0b' }}>{req.amount}일 ({req.type === 'MONTHLY' ? '월차' : '연차'})</strong>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'block', marginBottom: 2 }}>비고 및 사유</span>
                  <div style={{ color: 'var(--text-primary)' }}>{req.memo}</div>
                </div>
              </div>

              {rejectId === req.id ? (
                <div style={{ display: 'flex', gap: 12, background: 'rgba(239, 68, 68, 0.05)', padding: 16, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <input 
                    type="text" 
                    placeholder="반려 사유를 입력하세요 (필수)" 
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button className="btn" onClick={() => setRejectId(null)}>취소</button>
                  <button className="btn" style={{ background: 'var(--danger)', color: 'white' }} onClick={submitReject}>
                    반려 확정
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="btn" style={{ color: 'var(--danger)' }} onClick={() => handleRejectInit(req.id)}>
                    <X size={16} /> 반려
                  </button>
                  <button className="btn btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleApprove(req.id)}>
                    <Check size={16} /> 승인 처리
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {pendingRequests.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px dashed var(--border-color)', color: 'var(--text-tertiary)' }}>
            <Check size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div>모든 결재 대기가 처리되었습니다.</div>
          </div>
        )}
      </div>

      {/* Right Panel: Recent Logs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid var(--border-color)', paddingLeft: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          최근 처리 이력 (승인/반려)
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recentLogs.map(log => {
            const req = (leaveRequests || []).find(r => r.id === log.requestId);
            const emp = employees.find(e => e.id === req?.employeeId);
            if (!req || !emp) return null;

            return (
              <div key={log.id} style={{ 
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 12,
                borderLeft: `3px solid ${log.action === 'APPROVED' ? 'var(--success)' : 'var(--danger)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{emp.name} ({req.amount}일)</span>
                  <span style={{ fontSize: 11, color: log.action === 'APPROVED' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {log.action === 'APPROVED' ? '승인됨' : '반려됨'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>적용일: {req.date}</div>
                {log.action === 'REJECTED' && (
                  <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: 4 }}>
                    반려 사유: {log.reason}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, textAlign: 'right' }}>
                  처리일시: {new Date(log.processedAt).toLocaleString('ko-KR')}
                </div>
              </div>
            )
          })}
          {recentLogs.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: 20 }}>이력이 없습니다.</div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AdminRequests;
