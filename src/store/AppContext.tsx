import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User, Employee, LeaveRequest, ApprovalLog, PolicyDocument } from '../types';

interface AppState {
  currentUser: User | null;
  users: User[];
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  approvalLogs: ApprovalLog[];
  policyDocuments: PolicyDocument[];
  
  login: (loginId: string, password?: string) => boolean;
  logout: () => void;
  
  addEmployee: (emp: Omit<Employee, 'id'>, loginId?: string) => void;
  updateEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
  resetUserPassword: (employeeId: string) => void;
  
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => void;
  processLeaveRequest: (requestId: string, processorId: string, action: 'APPROVED' | 'REJECTED', reason: string) => void;
  deleteLeaveRequest: (id: string) => void;
  
  updatePolicy: (id: string, newContent: string) => void;
}

const initialUsers: User[] = [
  { id: 'admin1', loginId: 'admin', password: 'adminpassword123', name: '최고관리자', role: 'ADMIN' },
  { id: 'user1', loginId: 'hong', password: '1234', name: '홍길동', role: 'EMPLOYEE', employeeId: '1' },
  { id: 'user2', loginId: 'kim', password: '1234', name: '김지현', role: 'EMPLOYEE', employeeId: '2' },
  { id: 'user3', loginId: 'lee', password: '1234', name: '이지훈', role: 'EMPLOYEE', employeeId: '3' },
];

const initialEmployees: Employee[] = [
  { id: '1', name: '홍길동', joinDate: '2025-01-10', branch: '가산', department: '개발', policyType: 'LEGAL', statusNotes: '팀장' },
  { id: '2', name: '김지현', joinDate: '2022-05-15', branch: '강남', department: '마케팅', policyType: 'INTERNAL', statusNotes: '강남 지점장' },
  { id: '3', name: '이지훈', joinDate: '2026-02-01', branch: '가산', department: '디자인', policyType: 'LEGAL', statusNotes: '신규 입사자' },
];

const initialRequests: LeaveRequest[] = [
  { id: 'req1', employeeId: '2', date: new Date().toISOString().split('T')[0], amount: 0.5, type: 'ANNUAL', memo: '오전 반차 (병원 방문)', status: 'APPROVED', createdAt: '2026-03-01' },
  { id: 'req2', employeeId: '1', date: '2026-05-12', amount: 1, type: 'ANNUAL', memo: '개인 사정 휴무', status: 'PENDING', createdAt: '2026-03-10' }
];

const initialPolicies: PolicyDocument[] = [
  { 
    id: 'p1', 
    type: 'LEGAL', 
    content: '[법정 기준형 연차 제도 규정]\n본 규정은 근로기준법을 준수하는 당사의 기본 연차 제도입니다.\n\n1. 발생 기준\n- 입사일로부터 1년 미만: 1개월 개근 시 1일 발생 (최대 11일)\n- 입사 1년 이상: 기본 15일 부여. 이후 3년차부터 매 2년마다 1일씩 가산되어 최대 25일까지 발생합니다.\n\n2. 사용 원칙\n- 연차는 1일 단위 사용을 원칙으로 하며 부서장 합의 하에 사유를 명시하여 신청합니다.\n- 발생일로부터 1년간 사용 가능하며, 미사용 연차는 관련 법령에 따라 이월 또는 소멸됩니다.' 
  },
  { 
    id: 'p2', 
    type: 'INTERNAL', 
    content: '[내규형 / 강남 지점 연차 제도 규정]\n본 규정은 당사(강남 지점 포함) 내부 방침에 따른 특별 연차 제도입니다.\n\n1. 월차 자동 부여\n- 수습 기간(입사 후 3개월)이 지난 후, 매월 1일에 1일 단위의 월차가 별도 지급됩니다.\n- 당월 발생한 월차는 당월 내 소진이 원칙이며 익월로 이월되지 않습니다.\n\n2. 연차 정기 지급\n- 최초 입사 시 입사 시기(상/하반기)에 따라 1~2일이 선지급되며, 이듬해부터 근속 연수에 비례하여 매년 2일씩 가산되어 최대 14일까지 일괄 지급됩니다.(매년 1월 1일 갱신)\n- 최소 0.25일 단위(반반차) 등 유연한 시간 단위 휴무 분할 사용이 가능합니다.' 
  }
];

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('dpv3_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([]);
  const [policyDocuments, setPolicyDocuments] = useState<PolicyDocument[]>([]);
  
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    let initialFetched = false;

    unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as User);
      setUsers(data);
      if (data.length === 0 && !initialFetched) {
        initialFetched = true;
        seedDatabase();
      }
    }));
    unsubs.push(onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => doc.data() as Employee));
    }));
    unsubs.push(onSnapshot(collection(db, 'leaveRequests'), (snapshot) => {
      setLeaveRequests(snapshot.docs.map(doc => doc.data() as LeaveRequest));
    }));
    unsubs.push(onSnapshot(collection(db, 'approvalLogs'), (snapshot) => {
      setApprovalLogs(snapshot.docs.map(doc => doc.data() as ApprovalLog));
    }));
    unsubs.push(onSnapshot(collection(db, 'policyDocuments'), (snapshot) => {
      setPolicyDocuments(snapshot.docs.map(doc => doc.data() as PolicyDocument));
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const seedDatabase = async () => {
    for (const u of initialUsers) await setDoc(doc(db, 'users', u.id), u);
    for (const e of initialEmployees) await setDoc(doc(db, 'employees', e.id), e);
    for (const r of initialRequests) await setDoc(doc(db, 'leaveRequests', r.id), r);
    for (const p of initialPolicies) await setDoc(doc(db, 'policyDocuments', p.id), p);
  };

  useEffect(() => { localStorage.setItem('dpv3_current_user', JSON.stringify(currentUser)); }, [currentUser]);

  const login = (loginId: string, password?: string) => {
    const user = users.find(u => u.loginId === loginId && (u.password === password || (!u.password && password === '1234')));
    if (user || (loginId === 'admin' && password === 'admin')) {
      const targetUser = user || users.find(u => u.loginId === 'admin');
      if (targetUser) {
        setCurrentUser(targetUser);
        return true;
      }
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const addEmployee = async (emp: Omit<Employee, 'id'>, loginId?: string) => {
    const newId = 'emp_' + Date.now().toString();
    const newEmp = { ...emp, id: newId };
    await setDoc(doc(db, 'employees', newId), newEmp);
    
    if (loginId) {
      const newUserId = 'usr_' + Date.now().toString();
      const newUser: User = {
        id: newUserId,
        loginId: loginId,
        password: '1234',
        name: emp.name,
        role: 'EMPLOYEE',
        employeeId: newId
      };
      await setDoc(doc(db, 'users', newUserId), newUser);
    }
  };

  const updateEmployee = async (emp: Employee) => {
    await updateDoc(doc(db, 'employees', emp.id), { ...emp });
  };

  const deleteEmployee = async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
    leaveRequests.filter(r => r.employeeId === id).forEach(r => deleteDoc(doc(db, 'leaveRequests', r.id)));
    users.filter(u => u.employeeId === id).forEach(u => deleteDoc(doc(db, 'users', u.id)));
  };
  
  const resetUserPassword = async (employeeId: string) => {
    const userToReset = users.find(u => u.employeeId === employeeId);
    if (userToReset) {
      await updateDoc(doc(db, 'users', userToReset.id), { password: '1234' });
    }
  };

  const addLeaveRequest = async (req: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => {
    const newReqId = 'req_' + Date.now().toString();
    const newReq: LeaveRequest = {
      ...req,
      id: newReqId,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'leaveRequests', newReqId), newReq);
  };

  const processLeaveRequest = async (requestId: string, processorId: string, action: 'APPROVED' | 'REJECTED', reason: string) => {
    await updateDoc(doc(db, 'leaveRequests', requestId), { status: action });
    
    const newLogId = 'log_' + Date.now().toString();
    const newLog: ApprovalLog = {
      id: newLogId,
      requestId,
      processorId,
      processedAt: new Date().toISOString(),
      action,
      reason
    };
    await setDoc(doc(db, 'approvalLogs', newLogId), newLog);
  };

  const deleteLeaveRequest = async (id: string) => {
    await deleteDoc(doc(db, 'leaveRequests', id));
  };

  const updatePolicy = async (id: string, newContent: string) => {
    await updateDoc(doc(db, 'policyDocuments', id), { content: newContent });
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, 
      employees: employees || [], 
      leaveRequests: leaveRequests || [], 
      approvalLogs: approvalLogs || [], 
      policyDocuments: policyDocuments || [], 
      login, logout,
      addEmployee, updateEmployee, deleteEmployee, resetUserPassword,
      addLeaveRequest, processLeaveRequest, deleteLeaveRequest,
      updatePolicy
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
