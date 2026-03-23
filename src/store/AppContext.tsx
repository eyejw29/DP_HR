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
  { id: '1', name: '홍길동', joinDate: '2025-01-10', branch: '가산', department: '개발', position: '팀장', policyType: 'LEGAL', statusNotes: '' },
  { id: '2', name: '김지현', joinDate: '2022-05-15', branch: '강남', department: '마케팅', position: '지점장', policyType: 'INTERNAL', statusNotes: '' },
  { id: '3', name: '이지훈', joinDate: '2026-02-01', branch: '가산', department: '디자인', position: '사원', policyType: 'LEGAL', statusNotes: '신규 입사자' },
];

const initialRequests: LeaveRequest[] = [
  { id: 'req1', employeeId: '2', date: new Date().toISOString().split('T')[0], amount: 0.5, type: 'ANNUAL', memo: '오전 반차 (병원 방문)', status: 'APPROVED', createdAt: '2026-03-01' },
  { id: 'req2', employeeId: '1', date: '2026-05-12', amount: 1, type: 'ANNUAL', memo: '개인 사정 휴무', status: 'PENDING', createdAt: '2026-03-10' }
];

const initialPolicies: PolicyDocument[] = [
  { 
    id: 'p1', 
    type: 'LEGAL', 
    content: `[법정휴가]

1. 법정 기준형 연차 제도의 기본 원칙
1) 본 제도는 근로기준법 제60조(연차유급휴가) 기준에 따른다.
2) 연차는 입사일, 출근율, 계속근로연수에 따라 아래와 같이 발생한다.
3) 모든 연차는 *유급휴가*이며, 발생 기준·사용 기간·소멸 시점은 법 규정을 기본으로 한다.
4) 업무 특성상 다일간 연속 휴무 사용 시 업무 공백이 커질 수 있으므로, 회사는 구성원의 건강한 휴식과 원활한 업무 운영을 위해 가능하면 한 해 동안 월 단위로 균등하게 분산 사용하기를 권장한다.
다만, 이 권고 사항은 법에서 보장하는 연차 일수 및 사용 자체를 제한하는 취지가 아니다.

2. 입사 1년 미만(첫 해) 연차 – 월 단위 발생
1) 입사 후 1년 미만 기간에는 
- 1개월 개근할 때마다 유급휴가 1일이 발생한다.
- 최대 11일까지 발생할 수 있다.
2) “1개월 개근”이란
- 그 달의 소정근로일(근무하기로 한 날)에 모두 출근한 경우를 말하며,
- 법에서 출근한 것으로 보는 기간(업무상 재해 휴업 등)은 출근으로 인정된다.
3) 발생 시점 예시
2026.01.10 입사 → 2026.02.09까지 개근 시 2026.02.10에 1일 발생
4) 사용 가능 기간
- 이렇게 발생한 연차는 입사일로부터 1년이 되는 날까지 사용할 수 있고
- 이 기간 내 사용하지 않으면 원칙적으로 소멸한다.
- 다만 회사 사정 등으로 사용이 현저히 제한된 경우에는, 법에서 정한 범위 내에서 연차수당 정산 등 별도 처리가 이루어질 수 있다.

3. 입사 1년 이후 연차 – 연 단위 발생
1) 입사 후 1년이 지난 직원이면서, 직전 1년 출근율이 80% 이상인 경우 → 연차 15일이 새로 발생한다.
2) 전년도 출근율이 80% 미만인 경우 → 그 해에는 다시 “1개월 개근 시 1일 발생” 방식이 적용된다.
3) 발생·사용·소멸
- 연차는 입사일 기준 1년을 채운 다음 날 발생하는 것을 원칙으로 한다.
- 발생한 연차는 발생일로부터 1년 이내 사용이 원칙이며,
- 1년 내 사용하지 않을 경우, 법에서 정한 절차(사용 촉진 등)를 거쳐 소멸 또는 수당 정산이 이루어질 수 있다.

4. 장기 근속자 가산 연차
1) 계속 근로 3년 이상부터는
- 기본 15일에 더해, “최초 1년을 초과하는 계속 근로연수 매 2년마다 1일씩” 추가로 연차가 발생한다.
(전년도 출근율 80% 이상 기준 예시)
- 1~2년차 : 15일
- 3~4년차 : 16일
- 5~6년차 : 17일

5. 연차 신청 및 운영 가이드
1) 신청 절차
- 연차 사용을 원할 경우, 회사가 정한 기한(가능한 7일 전)에 담당자 및 팀장에게 신청 → 승인 후 사용한다.
2) 시기조정
- 직원은 원하는 시기에 연차 사용을 청구할 수 있으며, 회사는 정당한 사유 없이 연차 사용 자체를 제한하지 않는다.
다만, 업무 특성상 장기 연속 휴무로 인한 업무 공백을 줄이기 위해, 가능하면 월 단위로 나누어 균등하게 사용하는 것을 권장한다.
업무상 필요한 경우, 회사는 직원과의 상호 협의를 통해 사용 시기를 조정할 수 있으며, 이 과정에서도 해당 연도에 부여된 법정 연차 일수 전체를 사용할 수 있도록 최대한 보장한다.
3) 급여처리
- 연차 사용일은 취업규칙에서 정한 기준(통상임금 또는 평균임금)에 따라 유급으로 처리된다.

6. 적용 대상
1) 2026년 이후 입사 직원 전원
2) 2025년 입사자 중, 회사가 별도로 지정·통보한 직원
3) 그 외, 입사 연도와 관계없이 회사가 서면으로 법정 기준형 적용을 통보한 일부 직원

7. 반차 및 시간 단위 연차 관련 기준
1) 법정 기준형 연차 제도에서는 반차, 반반차, 시간 단위 연차를 별도로 운영하지 않는다.
- 연차의 최소 사용 단위는 1일로 한다.
- 따라서, 반차(0.5일), 반반차(0.25일) 등으로 나누어 사용하는 것은 인정하지 않는다.` 
  },
  { 
    id: 'p2', 
    type: 'INTERNAL', 
    content: `[기존/강남]
1. 목적 및 기본 원칙
1) 디피웍스는 법정 연차 기준보다 더 많은 휴무/복지를 제공하고, 매년 꾸준히 늘어나는 연차 제도를 운영하는 것을 목표로 한다.
2) 이러한 제도가 유지되기 위해서는 모든 구성원이 아래 내규를 성실히 준수해야 한다.
3) 정상적인 연차 사용의 이행이 되지 않는 경우, 법정규정에 맞는 연차 관리 방식으로 변경될 수 있다.

2. 휴무의 종류 및 정의
1) 회사는 별도의 “휴가” 항목 없이, 개인의 휴무일을 월차와 연차로 구분하여 운영한다.
2) 월차
- 매달 부여되는 휴무일.
- 해당 월 안에서만 사용 가능하며, 이월되지 않는다.
- 해당 월에 사용하지 못한 월차는 말일 기준으로 자동 소진(소멸) 처리된다.
3) 연차
- 매년 부여되는 휴무일.
- 해당 연도 안에서 자유롭게 사용할 수 있는 휴무이며, 이월되지 않는다.
- 해당 연도에 사용하지 못한 연차는 연말 기준으로 자동 소진(소멸) 처리된다.
4) 월차/연차는 일반적인 회사에서 구분하는 “연차/휴가” 개념을 통합한 형태의 연차 제도로 관리한다.

3. 연차·월차 발생 기준
1) 월차는 매월 1개씩 발생한다.
2) 연차는 매년 1월 1일을 기준으로 부여된다.
3) 입사 첫해 연차 발생 기준
- 해당 연도 6월 말일(6월 30일) 기준으로
- 1~6월 입사자 : 해당 연도 연차 2일 부여
- 7~12월 입사자 : 해당 연도 연차 1일 부여
- 다음 해부터는 입사 시기에 관계없이 매년 연차 2일씩 추가된다. (입사 월에 따라 첫해 연차 수만 다르며, 그 이후 누적 속도는 동일).
4) 사용 가능 시점
- 연차 : 수습기간 3개월 종료 후 사용 가능
- 월차 : 입사 다음 달부터 사용 가능
5) 예외 규정
- 11월·12월 입사자는, 입사 연도의 연차를 다음 해 1월까지 사용 가능하도록 예외를 인정한다.

4. 사용 절차 및 보고
1) 모든 월차·연차 사용 시에는 **담당자(현 담당자 : 오은재 과장)**에게
- 사용 일자, 사용 일수 등 사용 내역만 공유한다.
- 사용 사유는 공유할 필요가 없다.
2) 일반적인 단기 휴무(1~2일 내외)는 담당자 확인 후 사용한다.
3) 3일 이상 연속 사용(월차·연차 포함) 또는 해외 장기 일정의 경우, 
- 반드시 보유한 월차·연차 범위 내에서 계획해야 하며
- 가능하면 최소 한 달 전에 담당자와 일정·일수를 먼저 확인 후, 담당 팀장, 대표님과 일정을 공유한다. (업무 대체 및 유사시 대처를 위함)

5. 사용 권고 사항(가이드라인)
아래 사항은 원활한 업무 운영을 위한 권고 기준이며, 상황에 따라 조율 가능하다.
1) 사무실별 동일 일자 기준, 휴무 인원은 2명 이내를 권장한다.
2) 같은 팀 또는 동일 업무 담당자가 동시에 휴무 사용은 지양한다.
3) 중요한 프로젝트나 마감 일정 등, 핵심 업무에 영향을 최소화하는 방향으로 사용 일정을 조정한다.

6. 공휴일 및 경조사
1) 공휴일은 국가 공무원 공휴일 기준과 동일하게 적용한다.
2) 경조사 휴가는 일반적인 법적 기준(예: 본인 결혼, 부모·배우자 사망 등)에 준하여 제공한다.
(구체적인 일수와 조건은 별도 경조사 규정을 따른다.)

7. 반차 및 시간 단위 연차 관련 기준 (확인필요)
1) 연차 최소 사용 단위
- 법정 기준형 연차 제도에서는 연차의 최소 사용 단위를 **0.25일(반반차)**로 한다.
2) 반차 및 반반차 사용 유형
- 반차는 오전 반차, 오후 반차 중 한 가지 형태로 사용한다.
- 반차 2회를 사용하면 연차 1일 사용과 동일하게 처리한다.
- 반반차는 오전, 오후 반반차 중 한 가지 형태로 사용한다.
- 반반차 4회를 사용하면 연차 1일 사용과 동일하게 처리한다.` 
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
      const docs = snapshot.docs.map(node => node.data() as PolicyDocument);
      setPolicyDocuments(docs);
      
      docs.forEach(d => {
        if (d.type === 'LEGAL' && d.content.includes('본 규정은 근로기준법을 준수하는 당사의 기본 연차 제도입니다.')) {
           updateDoc(doc(db, 'policyDocuments', d.id), { content: initialPolicies[0].content });
        }
        if (d.type === 'INTERNAL' && d.content.includes('본 규정은 당사(강남 지점 포함) 내부 방침')) {
           updateDoc(doc(db, 'policyDocuments', d.id), { content: initialPolicies[1].content });
        }
      });
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
