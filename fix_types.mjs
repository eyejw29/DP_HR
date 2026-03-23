import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, updateDoc, doc } from "firebase/firestore";

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
  const emps = empSnap.docs.map(d => ({id: d.id, ...d.data()}));
  const internalEmpIds = new Set(emps.filter(e => e.policyType === 'INTERNAL').map(e => e.id));

  const reqSnap = await getDocs(collection(db, 'leaveRequests'));
  const reqs = reqSnap.docs.map(d => ({id: d.id, ...d.data()}));

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
       
       let newType = 'ANNUAL';
       if (monthlyUsed[monthStr] < 1) {
          if (monthlyUsed[monthStr] + r.amount <= 1) {
             newType = 'MONTHLY';
             monthlyUsed[monthStr] += r.amount;
          } else {
             console.log(`Split needed for ${emps.find(e=>e.id===empId)?.name} on ${r.date} ${r.amount}`);
             // If split needed, just keep it ANNUAL for now
          }
       } else {
          newType = 'ANNUAL';
       }

       if (r.type !== newType) {
          await updateDoc(doc(db, 'leaveRequests', r.id), { type: newType });
          console.log(`Updated ${emps.find(e=>e.id===empId).name} request on ${r.date} from ${r.type} to ${newType}`);
       }
    }
  }

  console.log("ALL DONE!");
  process.exit(0);
}
run();
