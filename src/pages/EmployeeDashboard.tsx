import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateLeaveBalance } from '../utils/leaveCalculations';
import { AlertCircle, Calendar, Plus, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { differenceInMonths, differenceInYears } from 'date-fns';
import PolicyModal from '../components/PolicyModal';

const EmployeeDashboard = () => {
  const { currentUser, employees, leaveRequests, addLeaveRequest, policyDocuments } = useAppContext();
  
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  
  const targetDate = viewYear === new Date().getFullYear() ? new Date() : new Date(viewYear, 11, 31);
  const employee = employees.find(e => e.id === currentUser?.employeeId);
  const balance = employee ? calculateLeaveBalance(employee, leaveRequests, targetDate) : null;
  const myRequests = leaveRequests
    .filter(r => r.employeeId === employee?.id && r.date.startsWith(viewYear.toString()))
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // V3 Default Memo
  const [reqData, setReqData] = useState<{ date: string, amount: number, type: 'ANNUAL' | 'MONTHLY', memo: string }>({
    date: '', amount: 1, type: 'ANNUAL', memo: '각 부서 팀장 확인 완료했습니다.'
  });
  const [reqError, setReqError] = useState('');

  const [policyTypeForModal, setPolicyTypeForModal] = useState<'LEGAL' | 'INTERNAL'>('LEGAL');
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  if (!employee || !balance) {
    return <div style={{ padding: 40, textAlign: 'center' }}>직원 정보를 찾을 수 없습니다.</div>;
  }

  const monthsOfService = differenceInMonths(new Date(), new Date(employee.joinDate));
  const serviceText = monthsOfService >= 12 
    ? `${Math.floor(monthsOfService / 12)}년 ${monthsOfService % 12}개월` 
    : `${monthsOfService}개월`;

  const handleAddRequest = () => {
    setReqError('');
    if (!reqData.date) { setReqError('신청 일자를 선택하세요.'); return; }
    if (employee.policyType === 'LEGAL' && reqData.amount !== 1) {
      setReqError('법정 기준형은 1일 단위로만 신청 가능합니다.'); return;
    }
    if (employee.policyType === 'INTERNAL' && reqData.amount % 0.25 !== 0) {
      setReqError('내규/강남형은 0.25일 단위로 신청 가능합니다.'); return;
    }

    addLeaveRequest({
      employeeId: employee.id,
      date: reqData.date,
      amount: Number(reqData.amount),
      type: employee.policyType === 'INTERNAL' ? reqData.type : 'ANNUAL',
      memo: reqData.memo
    });

    setReqData({ date: '', amount: 1, type: 'ANNUAL', memo: '각 부서 팀장 확인 완료했습니다.' });
    alert("우선 결재 대기(Pending) 상태로 신청되었습니다.");
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      <div className="mobile-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="mobile-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>나의 연차 현황</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <button className="btn" style={{ padding: 4 }} onClick={() => setViewYear(y => y - 1)}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 15, fontWeight: 700, width: 70, textAlign: 'center', color: 'var(--accent-primary)' }}>{viewYear}년</span>
            <button className="btn" style={{ padding: 4 }} onClick={() => setViewYear(y => y + 1)}><ChevronRight size={16} /></button>
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setViewYear(new Date().getFullYear())}>올해</button>
          </div>
        </div>
        <button className="btn" onClick={() => { setPolicyTypeForModal(employee.policyType); setPolicyModalOpen(true); }}>
          <FileText size={16} /> 적용 내부 규정 보기
        </button>
      </div>

      <div className="profile-grid" style={{ gap: 24 }}>
        
        {/* Profile / Balance V3 Display */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>지점 / 소속</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{employee.branch} / {employee.department}</div>
            
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>적용 규정</div>
            <div className={`badge ${employee.policyType === 'LEGAL' ? 'legal' : 'internal'}`} style={{ display: 'inline-block' }}>
              {employee.policyType === 'LEGAL' ? '법정 기준형' : '내규/강남형'}
            </div>
            
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>입사일 (근속)</div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{employee.joinDate} ({serviceText})</div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: 'var(--text-secondary)' }}>총 부여 휴무</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{balance.generatedLeave}일</span>
                {employee.policyType === 'INTERNAL' && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    (연차 {balance.generatedAnnual}일 + 월차 {balance.generatedMonthly}일)
                  </div>
                )}
              </div>
            </div>
            
            {/* V3 Breakdown Display */}
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid #3b82f6', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>산정 근거 / 구성</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#60a5fa' }}>{balance.breakdownText}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: 'var(--text-secondary)' }}>사용 (승인 완료)</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>-{balance.usedLeave}일</span>
                {employee.policyType === 'INTERNAL' && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    (연차 {balance.usedAnnual}일, 월차 {balance.usedMonthly}일)
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>사용 가능 (잔여)</span>
                {employee.policyType === 'INTERNAL' && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    연차 {Math.max(0, (balance.generatedAnnual||0) - (balance.usedAnnual||0))}일 / 월차 {Math.max(0, (balance.generatedMonthly||0) - (balance.usedMonthly||0))}일
                  </div>
                )}
              </div>
              <span style={{ fontWeight: 700, fontSize: 20, color: '#60a5fa' }}>{balance.remainingLeave}일</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>승인 대기 중</span>
              <span style={{ color: 'var(--warning)', fontWeight: 500 }}>{balance.pendingRequestsCount}건</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* New Request Form */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>신규 연차 신청</h2>
            
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                <label>신청 일자</label>
                <input type="date" value={reqData.date} onChange={e => setReqData({...reqData, date: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                <label>일수</label>
                <input 
                  type="number" 
                  step={employee.policyType === 'INTERNAL' ? "0.25" : "1"} 
                  min="0"
                  inputMode="decimal"
                  value={reqData.amount} 
                  onChange={e => setReqData({...reqData, amount: Number(e.target.value)})} 
                />
              </div>
              {employee.policyType === 'INTERNAL' && (
                <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                  <label>유무 유형</label>
                  <select value={reqData.type} onChange={e => setReqData({...reqData, type: e.target.value as 'ANNUAL'|'MONTHLY'})}>
                    <option value="ANNUAL">연차</option>
                    <option value="MONTHLY">월차 (발생 시)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>사유 / 메모 (각 부서 팀장 사전 합의 필수)</label>
              <input type="text" value={reqData.memo} onChange={e => setReqData({...reqData, memo: e.target.value})} />
            </div>

            {reqError && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {reqError}
              </div>
            )}

            <button className="btn btn-primary" onClick={handleAddRequest} style={{ padding: '10px 24px' }}>
              <Plus size={16} /> 승인 요청하기
            </button>
          </div>

          {/* Request History */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, flex: 1 }}>
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>나의 신청 이력</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myRequests.map(req => (
                <div key={req.id} style={{ 
                  backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16,
                  borderLeft: `4px solid ${req.status === 'APPROVED' ? 'var(--success)' : req.status === 'REJECTED' ? 'var(--danger)' : 'var(--warning)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>
                      {req.date} <span style={{ color: 'var(--text-tertiary)', fontSize: 12, marginLeft: 8, fontWeight: 400 }}>{req.type === 'MONTHLY' ? '월차' : '연차'} {req.amount}일</span>
                    </div>
                    <div>
                      {req.status === 'PENDING' && <span style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 600 }}>대기 중</span>}
                      {req.status === 'APPROVED' && <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>승인됨</span>}
                      {req.status === 'REJECTED' && <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>반려됨</span>}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{req.memo}</div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 8 }}>신청일시: {new Date(req.createdAt).toLocaleString('ko-KR')}</div>
                </div>
              ))}
              {myRequests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', border: '1px dashed var(--border-color)', borderRadius: 8 }}>
                  신청 이력이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {policyModalOpen && (
        <PolicyModal 
          type={policyTypeForModal}
          onClose={() => setPolicyModalOpen(false)}
          readOnly={true}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
