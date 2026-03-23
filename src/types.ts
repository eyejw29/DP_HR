export type PolicyType = 'LEGAL' | 'INTERNAL';
export type UsageType = 'ANNUAL' | 'MONTHLY';
export type Role = 'ADMIN' | 'EMPLOYEE' | 'MANAGER';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type Branch = '가산' | '강남';
export type Department = '마케팅' | '디자인' | '개발';

export interface User {
  id: string;
  loginId: string;
  password?: string;
  name: string;
  role: Role;
  employeeId?: string; // Optional if Admin has no specific employee profile, or can be linked
}

export interface Employee {
  id: string;
  name: string;
  joinDate: string; // YYYY-MM-DD
  branch: Branch;
  department: Department;
  position?: string;
  policyType: PolicyType;
  statusNotes: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD (Single day or start day for now)
  amount: number;
  type: UsageType;
  memo: string;
  status: RequestStatus;
  createdAt: string;
}

export interface ApprovalLog {
  id: string;
  requestId: string;
  processorId: string; // User ID of admin/manager
  processedAt: string;
  action: 'APPROVED' | 'REJECTED';
  reason: string;
}

export interface PolicyDocument {
  id: string;
  type: PolicyType;
  content: string;
}

export interface LeaveBalance {
  generatedLeave: number;
  usedLeave: number;
  remainingLeave: number;
  currentMonthUsage: number;
  pendingRequestsCount: number;
  nextAccrualDate: string | null;
  breakdownText: string;
  generatedAnnual?: number;
  generatedMonthly?: number;
  usedAnnual?: number;
  usedMonthly?: number;
}


export interface EmployeeWithBalance extends Employee {
  balance: LeaveBalance;
}
