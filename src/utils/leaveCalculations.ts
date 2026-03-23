import { differenceInMonths, differenceInYears, addYears, isValid, parseISO, isBefore, isAfter, startOfMonth, endOfMonth, getMonth, addMonths, isSameMonth } from 'date-fns';
import type { Employee, LeaveRequest, LeaveBalance } from '../types';

export function calculateLeaveBalance(
  employee: Employee,
  requests: LeaveRequest[] | undefined,
  currentDate: Date = new Date()
): LeaveBalance {
  try {
    const safeRequests = requests || [];
    const joinDate = parseISO(employee.joinDate);
    if (!isValid(joinDate)) throw new Error("Invalid join date");

    const employeeRequests = safeRequests.filter(r => r?.employeeId === employee.id);
    const approvedRequests = employeeRequests.filter(r => r?.status === 'APPROVED');
    const pendingRequestsCount = employeeRequests.filter(r => r?.status === 'PENDING').length;

    let generated = 0;
    let used = 0;
    let generatedAnnual = 0;
    let generatedMonthly = 0;
    let usedAnnual = 0;
    let usedMonthly = 0;
    let nextAccrualDate: Date | null = null;
    let currentMonthUsage = 0;
    let breakdownText = "";

    // Common: Current month usage (from APPROVED requests)
    approvedRequests.forEach(r => {
      const usageDate = parseISO(r.date);
      if (isValid(usageDate) && isSameMonth(usageDate, currentDate)) {
        currentMonthUsage += r.amount;
      }
    });

    if (employee.policyType === 'LEGAL') {
      const yearsOfService = differenceInYears(currentDate, joinDate);
      const firstAnniversary = addYears(joinDate, 1);

      if (isBefore(currentDate, firstAnniversary)) {
        // Year < 1: 1 day per full month (max 11)
        const fullMonths = differenceInMonths(currentDate, joinDate);
        generated = Math.min(11, fullMonths);
        breakdownText = `입사 1년 미만: 월 개근 발생 (${generated}일 지원)`;
        
        if (fullMonths < 11) {
          nextAccrualDate = addMonths(joinDate, fullMonths + 1);
        } else {
          nextAccrualDate = firstAnniversary;
        }

        used = approvedRequests.filter(r => isBefore(parseISO(r.date), firstAnniversary)).reduce((acc, r) => acc + r.amount, 0);

      } else {
        // Year >= 1
        const base = 15;
        const longevityBonus = yearsOfService >= 3 ? Math.floor((yearsOfService - 1) / 2) : 0;
        generated = base + longevityBonus;
        breakdownText = `법정 기본 ${base}일` + (longevityBonus > 0 ? ` + 장기근속 가산 ${longevityBonus}일` : ``);

        const currentAnniversary = addYears(joinDate, yearsOfService);
        const nextAnniversary = addYears(joinDate, yearsOfService + 1);
        nextAccrualDate = nextAnniversary;

        used = approvedRequests.filter(r => {
          const ud = parseISO(r.date);
          return (isAfter(ud, currentAnniversary) || ud.getTime() === currentAnniversary.getTime()) && isBefore(ud, nextAnniversary);
        }).reduce((acc, r) => acc + r.amount, 0);
      }
      
      generatedAnnual = generated;
      usedAnnual = used;

    } else if (employee.policyType === 'INTERNAL') {
      // Monthly + Annual logic
      
      const isPastFirstMonth = isAfter(currentDate, endOfMonth(joinDate));
      const activeMonthly = isPastFirstMonth ? 1 : 0;
      
      const monthlyUsedThisMonth = approvedRequests.filter(r => 
        r.type === 'MONTHLY' && isValid(parseISO(r.date)) && isSameMonth(parseISO(r.date), currentDate)
      ).reduce((acc, r) => acc + r.amount, 0);

      const joinYear = joinDate.getFullYear();
      const currentYear = currentDate.getFullYear();
      let activeAnnual = 0;
      let annualDesc = "";
      let carryOver = 0;

      if (currentYear === joinYear) {
        const joinMonth = getMonth(joinDate); // 0-indexed
        activeAnnual = joinMonth < 6 ? 2 : 1; 
        annualDesc = `상/하반기 입사 기준 ${activeAnnual}일`;
      } else {
        const yearDiff = currentYear - joinYear;
        activeAnnual = 2 + (yearDiff * 2);

        const joinMonth = getMonth(joinDate);
        if ((joinMonth === 10 || joinMonth === 11) && currentYear === joinYear + 1 && getMonth(currentDate) === 0) {
          const firstYearUsed = approvedRequests.filter(r => {
            const ud = parseISO(r.date);
            return r.type === 'ANNUAL' && isValid(ud) && ud.getFullYear() === joinYear;
          }).reduce((acc, r) => acc + r.amount, 0);
          
          carryOver = Math.max(0, 1 - firstYearUsed);
          activeAnnual += carryOver;
        }
        annualDesc = `올해 정기 발생 ${activeAnnual}일` + (carryOver > 0 ? ` (이월 ${carryOver}일 포함)` : '');
      }

      const probationEnd = addMonths(joinDate, 3);
      if (isBefore(currentDate, probationEnd)) {
        if (carryOver > 0) {
          activeAnnual = carryOver;
          annualDesc = `수습 중이나 전년도 이월분 ${carryOver}일에 한해 사용 가능`;
        } else {
          activeAnnual = 0; 
          annualDesc = `수습 기간 미달 (0일)`;
        }
      }

      generated = activeMonthly + activeAnnual;
      generatedAnnual = activeAnnual;
      generatedMonthly = activeMonthly;
      
      breakdownText = `연차(${annualDesc}) + 월차(${activeMonthly > 0 ? '당월 1일 지급' : '미지급'})`;

      const annualUsedThisYear = approvedRequests.filter(r => {
        const ud = parseISO(r.date);
        return r.type === 'ANNUAL' && isValid(ud) && ud.getFullYear() === currentYear;
      }).reduce((acc, r) => acc + r.amount, 0);

      usedAnnual = annualUsedThisYear;
      usedMonthly = monthlyUsedThisMonth;
      used = usedMonthly + usedAnnual;
      
      const nextMonthFirst = startOfMonth(addMonths(currentDate, 1));
      nextAccrualDate = nextMonthFirst; 
    }

    return {
      generatedLeave: generated,
      usedLeave: used,
      remainingLeave: Math.max(0, generated - used),
      currentMonthUsage,
      pendingRequestsCount,
      nextAccrualDate: nextAccrualDate ? nextAccrualDate.toISOString().split('T')[0] : null,
      breakdownText,
      generatedAnnual,
      generatedMonthly,
      usedAnnual,
      usedMonthly
    };
  } catch (err) {
    console.error("Error calculating leave for", employee?.name, err);
    return {
      generatedLeave: 0,
      usedLeave: 0,
      remainingLeave: 0,
      currentMonthUsage: 0,
      pendingRequestsCount: 0,
      nextAccrualDate: null,
      breakdownText: '계산 오류',
      generatedAnnual: 0,
      generatedMonthly: 0,
      usedAnnual: 0,
      usedMonthly: 0
    };
  }
}
