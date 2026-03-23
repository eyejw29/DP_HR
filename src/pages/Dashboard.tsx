import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { calculateLeaveBalance } from '../utils/leaveCalculations';
import type { EmployeeWithBalance } from '../types';
import { ChevronLeft, ChevronRight, Search, Plus, AlertCircle, FileText, Calendar, CheckSquare, Users } from 'lucide-react';
import EmployeeDrawer from '../components/EmployeeDrawer';
import PolicyModal from '../components/PolicyModal';
import { differenceInMonths, format, subMonths, addMonths } from 'date-fns';

const Dashboard = () => {
  const { employees, leaveRequests } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPolicy, setFilterPolicy] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyTypeForModal, setPolicyTypeForModal] = useState<'LEGAL' | 'INTERNAL'>('LEGAL');

  const [viewMonth, setViewMonth] = useState(new Date());
  
  const employeesWithBalance: EmployeeWithBalance[] = useMemo(() => {
    return (employees || []).map(emp => ({
      ...emp,
      balance: calculateLeaveBalance(emp, leaveRequests, viewMonth)
    }));
  }, [employees, leaveRequests, viewMonth]);

  const filteredEmployees = employeesWithBalance.filter(emp => {
    const pMatch = filterPolicy === 'ALL' || emp.policyType === filterPolicy;
    const bMatch = filterBranch === 'ALL' || emp.branch === filterBranch;
    const dMatch = filterDept === 'ALL' || emp.department === filterDept;
    const sMatch = !searchTerm || 
      emp.name.includes(searchTerm) || 
      emp.department.includes(searchTerm) ||
      emp.branch.includes(searchTerm);
    return pMatch && bMatch && dMatch && sMatch;
  });

  const branches = Array.from(new Set((employees || []).map(e => e.branch)));
  const depts = Array.from(new Set((employees || []).map(e => e.department)));
  
  // Stats
  const totalEmployees = employees?.length || 0;
  const pendingCount = (leaveRequests || []).filter(r => r.status === 'PENDING').length;
  const formattedMonth = format(viewMonth, 'yyyy-MM');
  const approvedCountThisMonth = (leaveRequests || []).filter(r => r.status === 'APPROVED' && r.date.startsWith(formattedMonth)).length;
  
  const unusedThisMonthEmployees = employeesWithBalance.filter(e => e.balance.currentMonthUsage === 0);
  const unusedThisMonthCount = unusedThisMonthEmployees.length;
  const unusedNamesText = unusedThisMonthEmployees.map(e => e.name).join(', ');

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* V3 Summary Widgets */}
      <div className="stats-grid">
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>총 임직원 현황</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{totalEmployees}명</div>
          </div>
        </div>
        
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>결재 대기 중인 요청</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{pendingCount}건</div>
          </div>
        </div>
        
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>당월 승인된 휴무</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{approvedCountThisMonth}건</div>
          </div>
        </div>
        
        <div 
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}
          title={unusedNamesText}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} />
          </div>
          <div style={{ cursor: 'help' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>당월 미사용자 위기 지표</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{unusedThisMonthCount}명</div>
          </div>
        </div>
      </div>

      <div className="section-header mobile-wrap" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="mobile-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 20, margin: 0, whiteSpace: 'nowrap' }}>전사 임직원 관리</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <button className="btn" style={{ padding: 4 }} onClick={() => setViewMonth(m => subMonths(m, 1))}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 13, fontWeight: 600, width: 80, textAlign: 'center' }}>{format(viewMonth, 'yyyy년 M월')}</span>
            <button className="btn" style={{ padding: 4 }} onClick={() => setViewMonth(m => addMonths(m, 1))}><ChevronRight size={16} /></button>
            <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setViewMonth(new Date())}>현재</button>
          </div>
        </div>
        <div className="action-buttons" style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={() => { setPolicyTypeForModal('LEGAL'); setPolicyModalOpen(true); }}><FileText size={16} /> 법정 규정 열람/수정</button>
          <button className="btn" onClick={() => { setPolicyTypeForModal('INTERNAL'); setPolicyModalOpen(true); }}><FileText size={16} /> 강남 내규 열람/수정</button>
          <button className="btn btn-primary" onClick={() => { setSelectedEmployeeId(null); setDrawerOpen(true); }}><Plus size={16} /> 직원 추가</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="직원 이름, 부서, 지점 검색..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 34, width: 220 }}
            />
          </div>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ padding: '8px 12px' }}>
            <option value="ALL">전체 지점</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '8px 12px' }}>
            <option value="ALL">전체 부서</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterPolicy} onChange={e => setFilterPolicy(e.target.value)} style={{ padding: '8px 12px' }}>
            <option value="ALL">전체 규정</option>
            <option value="LEGAL">법정 기준형</option>
            <option value="INTERNAL">내규/강남형</option>
          </select>
        </div>
      </div>

      {/* Main Table V3 */}
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 1400 }}>
          <thead>
            <tr>
              <th>이름</th>
              <th>입사일 (근속)</th>
              <th>지점 / 부서</th>
              <th>적용 규정</th>
              <th>총 부여 휴무</th>
              <th>휴무 구성 (산정 근거)</th>
              <th>사용 휴무</th>
              <th>남은 휴무</th>
              <th>결재 대기</th>
              <th>다음 갱신/발생일</th>
              <th>비고</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {(filteredEmployees || []).map(emp => {
              const monthsOfSvc = differenceInMonths(new Date(), new Date(emp.joinDate));
              const svcText = monthsOfSvc >= 12 ? `${Math.floor(monthsOfSvc/12)}년 ${monthsOfSvc%12}개월` : `${monthsOfSvc}개월`;
              return (
                <tr key={emp.id} className="row-hover">
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</td>
                  <td style={{ fontSize: 13 }}>{emp.joinDate} <span style={{ color: 'var(--text-tertiary)', fontSize: 11, marginLeft: 6 }}>({svcText})</span></td>
                  <td>
                    <span className="badge internal">{emp.branch}</span> <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{emp.department}</span>
                  </td>
                  <td>
                    <span className={`badge ${emp.policyType === 'LEGAL' ? 'legal' : 'internal'}`}>
                      {emp.policyType === 'LEGAL' ? '법정 기준형' : '내규형'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {emp.balance.generatedLeave}일
                    {emp.policyType === 'INTERNAL' && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginTop: 2 }}>연차 {emp.balance.generatedAnnual} / 월차 {emp.balance.generatedMonthly}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '4px 8px', borderRadius: 4, display: 'inline-block', fontSize: 11, color: '#60a5fa', borderLeft: '2px solid #3b82f6' }}>
                      {emp.balance.breakdownText}
                    </div>
                  </td>
                  <td style={{ color: 'var(--danger)' }}>
                    {emp.balance.usedLeave}일
                    {emp.policyType === 'INTERNAL' && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginTop: 2 }}>연 {emp.balance.usedAnnual} / 월 {emp.balance.usedMonthly}</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 700, color: '#60a5fa', fontSize: 15 }}>
                    {emp.balance.remainingLeave}일
                    {emp.policyType === 'INTERNAL' && (
                      <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500, marginTop: 2 }}>연 {Math.max(0, (emp.balance.generatedAnnual||0) - (emp.balance.usedAnnual||0))} / 월 {Math.max(0, (emp.balance.generatedMonthly||0) - (emp.balance.usedMonthly||0))}</div>
                    )}
                  </td>
                  <td>
                    {emp.balance.pendingRequestsCount > 0 
                      ? <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 13 }}>{emp.balance.pendingRequestsCount}건 대기</span>
                      : <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                    }
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{emp.balance.nextAccrualDate || '-'}</td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{emp.statusNotes}</td>
                  <td>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { setSelectedEmployeeId(emp.id); setDrawerOpen(true); }}>상세/수정</button>
                  </td>
                </tr>
              )
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>조건에 맞는 직원이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <EmployeeDrawer 
          employeeId={selectedEmployeeId} 
          onClose={() => setDrawerOpen(false)} 
        />
      )}

      {policyModalOpen && (
        <PolicyModal 
          type={policyTypeForModal}
          onClose={() => setPolicyModalOpen(false)}
          readOnly={false}
        />
      )}
    </div>
  );
};

export default Dashboard;
