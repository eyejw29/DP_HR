import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, updateDoc, doc, deleteDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsO8I5JnFTvKMkGgqchxHv4NR8jxsTz9c",
  authDomain: "dpworks-hr.firebaseapp.com",
  projectId: "dpworks-hr",
  storageBucket: "dpworks-hr.firebasestorage.app",
  messagingSenderId: "728442274837",
  appId: "1:728442274837:web:f3351badbc5491a3027a1c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const empSnap = await getDocs(collection(db, 'employees'));
  const emps = empSnap.docs.map(d => Object.assign({id: d.id}, d.data()));
  const internalEmpIds = new Set(emps.filter(e => e.policyType === 'INTERNAL').map(e => e.id));

  const reqSnap = await getDocs(collection(db, 'leaveRequests'));
  const reqs = reqSnap.docs.map(d => Object.assign({id: d.id}, d.data()));

  const empReqs = {};
  for (const r of reqs) {
    if (!internalEmpIds.has(r.employeeId)) continue;
    if (r.status !== 'APPROVED') continue;
    
    if (!empReqs[r.employeeId]) empReqs[r.employeeId] = [];
    empReqs[r.employeeId].push(r);
  }

  for (const empId of Object.keys(empReqs)) {
    const list = empReqs[empId];
    list.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const monthlyUsed = {}; 
    for (const r of list) {
       const monthStr = r.date.substring(0, 7);
       if (!monthlyUsed[monthStr]) monthlyUsed[monthStr] = 0;
       
       const availableMonthly = Math.max(0, 1 - monthlyUsed[monthStr]);
       
       if (availableMonthly <= 0) {
          // No monthly left, all must be ANNUAL
          if (r.type !== 'ANNUAL') {
             await updateDoc(doc(db, 'leaveRequests', r.id), { type: 'ANNUAL' });
             console.log(`[ANNUAL-ONLY] ${emps.find(e=>e.id===empId).name} on ${r.date}`);
          }
       } else if (r.amount <= availableMonthly) {
          // Fits in MONTHLY
          if (r.type !== 'MONTHLY') {
             await updateDoc(doc(db, 'leaveRequests', r.id), { type: 'MONTHLY' });
             console.log(`[MONTHLY] ${emps.find(e=>e.id===empId).name} on ${r.date}`);
          }
          monthlyUsed[monthStr] += r.amount;
       } else {
          // SPLIT NEEDED
          console.log(`[SPLIT] ${emps.find(e=>e.id===empId).name} on ${r.date} ${r.amount} (Available: ${availableMonthly})`);
          
          // Delete old
          await deleteDoc(doc(db, 'leaveRequests', r.id));
          
          // New Monthly part
          const mId = r.id + '_m';
          await setDoc(doc(db, 'leaveRequests', mId), Object.assign({}, r, {
             id: mId,
             amount: availableMonthly,
             type: 'MONTHLY'
          }));
          
          // New Annual part
          const aId = r.id + '_a';
          await setDoc(doc(db, 'leaveRequests', aId), Object.assign({}, r, {
             id: aId,
             amount: r.amount - availableMonthly,
             type: 'ANNUAL'
          }));
          
          monthlyUsed[monthStr] += availableMonthly;
       }
    }
  }

  console.log("ALL DONE!");
  process.exit(0);
}
run();
