import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import type { User, Employee, Branch, Department } from '../types';
import { ChevronLeft, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isBefore } from 'date-fns';
import { calculateLeaveBalance } from '../utils/leaveCalculations';
import { useNavigate } from 'react-router-dom';

const CalendarView = () => {
  const { currentUser, employees, leaveRequests, addLeaveRequest, processLeaveRequest } = useAppContext();
  const navigate = useNavigate();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterPolicy, setFilterPolicy] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');

  const [adminAddModalOpen, setAdminAddModalOpen] = useState(false);
  const [adminAddData, setAdminAddData] = useState<{date: string, employeeId: string, amount: number, type: 'ANNUAL' | 'MONTHLY', memo: string}>({ date: '', employeeId: '', amount: 1, type: 'ANNUAL', memo: '' });

  const isAdmin = currentUser?.role === 'ADMIN';
  const currentEmployee = employees.find(e => e.id === currentUser?.employeeId);
  const userBranch = currentEmployee?.branch || '강남';

  const depts = Array.from(new Set(employees.map(e => e.department)));
  const branches = Array.from(new Set(employees.map(e => e.branch)));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "yyyy-MM-dd";
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  // Filter requests (APPROVED ONLY for common calendar)
  const approvedRequests = leaveRequests.filter(r => r.status === 'APPROVED');
  
  // Filter by policy/dept
  const viewableEmployees = employees.filter(emp => {
    // Branch Isolation Logic
    if (!isAdmin && emp.branch !== userBranch) return false;

    const pMatch = filterPolicy === 'ALL' || emp.policyType === filterPolicy;
    const dMatch = filterDept === 'ALL' || emp.department === filterDept;
    const bMatch = filterBranch === 'ALL' || emp.branch === filterBranch;
    return pMatch && dMatch && bMatch;
  });
  const viewableEmpIds = new Set(viewableEmployees.map(e => e.id));

  const filteredRequests = approvedRequests.filter(req => viewableEmpIds.has(req.employeeId));

  const handleDateClick = (calendarDate: Date) => {
    const formattedDate = format(calendarDate, 'yyyy-MM-dd');
    if (isAdmin) {
      setAdminAddData({ date: formattedDate, employeeId: employees[0]?.id || '', amount: 1, type: 'ANNUAL', memo: '관리자 직권 등록' });
      setAdminAddModalOpen(true);
    } else {
      if (window.confirm(`해당 일자(${formattedDate})에 연차를 신청하시겠습니까?`)) {
        navigate('/my/dashboard');
      }
    }
  };

  const handleAdminAddSubmit = () => {
    if (!adminAddData.employeeId) return;
    const emp = employees.find(e => e.id === adminAddData.employeeId);
    if (!emp) return;

    // Create and immediately approve
    const reqId = 'req_admin_' + Date.now();
    addLeaveRequest({
      employeeId: adminAddData.employeeId,
      date: adminAddData.date,
      amount: Number(adminAddData.amount),
      type: adminAddData.type,
      memo: adminAddData.memo
    });

    // Wait for context to update technically takes a cycle, but we can process it by matching the exact fields or just using the generated ID logic.
    // Actually, since addLeaveRequest generates ID internally, we can't instantly approve it in one step cleanly without modifying context.
    // For V2 MVP Admin direct add, just alert they need to approve it, or add a special context function. We'll tell them to approve it in requests.
    alert("요청이 생성되었습니다. [결재/대기 관리] 메뉴에서 승인해주세요!");
    setAdminAddModalOpen(false);
  };

  // Unused this month panel
  const unusedThisMonth = viewableEmployees.filter(emp => {
    const bal = calculateLeaveBalance(emp, leaveRequests, currentDate);
    return bal.currentMonthUsage === 0;
  });

  return (
    <div className="flex-mobile-column" style={{ padding: 24, maxWidth: 1400, margin: '0 auto', width: '100%', gap: 24, height: '100%' }}>
      
      {/* Calendar Side */}
      <div style={{ flex: 3, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, overflow: 'hidden' }}>
        
        {/* Header & Controls */}
        <div className="mobile-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="mobile-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: 24, margin: 0, fontWeight: 700, width: 140, whiteSpace: 'nowrap' }}>
              {format(currentDate, 'yyyy년 M월')}
            </h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={prevMonth} style={{ padding: 8 }}><ChevronLeft size={16} /></button>
              <button className="btn" onClick={today} style={{ padding: '6px 12px' }}>오늘</button>
              <button className="btn" onClick={nextMonth} style={{ padding: 8 }}><ChevronRight size={16} /></button>
            </div>
            {!isAdmin && (
              <span className="badge internal" style={{ marginLeft: 8 }}>{userBranch} 지점 (전용 읽기)</span>
            )}
          </div>
          
          {isAdmin && (
            <div className="action-buttons" style={{ display: 'flex', gap: 12 }}>
              <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ padding: '6px 12px' }}>
                <option value="ALL">전체 지점</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '6px 12px' }}>
                <option value="ALL">전체 부서</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterPolicy} onChange={e => setFilterPolicy(e.target.value)} style={{ padding: '6px 12px' }}>
                <option value="ALL">전체 규정</option>
                <option value="LEGAL">법정 기준형</option>
                <option value="INTERNAL">내규형</option>
              </select>
              <button 
                className="btn btn-primary" 
                onClick={() => setAdminAddModalOpen(true)}
              >
                <Plus size={16} /> 일정 추가
              </button>
            </div>
          )}
        </div>

        {/* Calendar Grid Container for Mobile Scroll */}
        <div style={{ overflowX: 'auto', width: '100%', flex: 1 }}>
          <div style={{ minWidth: 700, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Grid Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, backgroundColor: 'var(--border-color)', border: '1px solid var(--border-color)', borderBottom: 'none' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div key={day} style={{ 
              padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: 13,
              backgroundColor: 'var(--bg-secondary)', color: idx === 0 ? 'var(--danger)' : idx === 6 ? '#60a5fa' : 'var(--text-secondary)'
            }}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, backgroundColor: 'var(--border-color)', border: '1px solid var(--border-color)', flex: 1 }}>
          {calendarDays.map((day, i) => {
            const formattedDate = format(day, dateFormat);
            const events = filteredRequests.filter(req => req.date === formattedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayOfWeek = day.getDay();
            
            return (
              <div key={day.toString()} 
                   onClick={() => handleDateClick(day)}
                   style={{ 
                     backgroundColor: isCurrentMonth ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                     padding: 8, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 100, cursor: 'pointer',
                     opacity: isCurrentMonth ? 1 : 0.4
                   }}
                   className="calendar-cell">
                <div style={{ 
                  textAlign: 'right', fontSize: 13, fontWeight: 500,
                  color: dayOfWeek === 0 ? 'var(--danger)' : dayOfWeek === 6 ? '#60a5fa' : 'var(--text-primary)',
                  marginBottom: 8
                }}>
                  {format(day, 'd')}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
                  {events.map((evt, idx) => {
                    const emp = employees.find(e => e.id === evt.employeeId);
                    if (!emp) return null;
                    return (
                      <div key={idx} style={{ 
                        fontSize: 11, padding: '4px 6px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        backgroundColor: emp.policyType === 'LEGAL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: emp.policyType === 'LEGAL' ? '#93c5fd' : '#6ee7b7',
                        borderLeft: `2px solid ${emp.policyType === 'LEGAL' ? '#3b82f6' : '#10b981'}`
                      }}>
                        <strong style={{ fontWeight: 600 }}>{emp.name}</strong> <span style={{ opacity: 0.8, fontSize: 10 }}>({emp.branch})</span> ({evt.amount}일)
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
      </div>

      {/* Right Panel (Admin Only) */}
      {isAdmin && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} color="var(--warning)" />
              이번 달 연차 미사용자
            </h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              당월({format(currentDate, 'M')}월) 승인된 연차 내역이 없는 직원 목록입니다. 현재 필터 조건이 적용되어 있습니다.
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unusedThisMonth.map(emp => (
                <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{emp.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{emp.branch} / {emp.department}</div>
                  </div>
                  <span className={`badge ${emp.policyType === 'LEGAL' ? 'legal' : 'internal'}`}>
                    {emp.policyType === 'LEGAL' ? '법정' : '내규'}
                  </span>
                </div>
              ))}
              {unusedThisMonth.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  모든 직원이 연차를 사용했습니다! 🎉
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Add Modal */}
      {isAdmin && adminAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: 400 }}>
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>관리자 직권 연차 등록</h2>
            
            <div className="form-group">
              <label>신청 일자</label>
              <input type="date" value={adminAddData.date} onChange={e => setAdminAddData({...adminAddData, date: e.target.value})} />
            </div>

            <div className="form-group">
              <label>대상 직원</label>
              <select value={adminAddData.employeeId} onChange={e => setAdminAddData({...adminAddData, employeeId: e.target.value})}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>일수</label>
                <input type="number" step="0.25" inputMode="decimal" value={adminAddData.amount} onChange={e => setAdminAddData({...adminAddData, amount: Number(e.target.value)})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>휴무 유형</label>
                <select value={adminAddData.type} onChange={e => setAdminAddData({...adminAddData, type: e.target.value as 'ANNUAL'|'MONTHLY'})}>
                  <option value="ANNUAL">연차</option>
                  <option value="MONTHLY">월차</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>메모</label>
              <input type="text" value={adminAddData.memo} onChange={e => setAdminAddData({...adminAddData, memo: e.target.value})} />
            </div>

            <div className="modal-actions" style={{ marginTop: 24, justifyContent: 'flex-end', display: 'flex', gap: 12 }}>
              <button className="btn" onClick={() => setAdminAddModalOpen(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleAdminAddSubmit}><Plus size={16}/> 등록 및 결재 생성</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CalendarView;
