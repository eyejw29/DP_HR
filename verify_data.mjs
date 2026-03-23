import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";

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
  try {
    const empSnap = await getDocs(collection(db, 'employees'));
    const emps = empSnap.docs.map(d => Object.assign({id: d.id}, d.data()));
    
    const reqSnap = await getDocs(collection(db, 'leaveRequests'));
    const reqs = reqSnap.docs.map(d => Object.assign({id: d.id}, d.data()));

    const report = {};

    emps.forEach(emp => {
      const empReqs = reqs.filter(r => r.employeeId === emp.id && r.status === 'APPROVED')
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (empReqs.length > 0) {
        report[emp.name] = {
          policy: emp.policyType,
          branch: emp.branch,
          leaves: empReqs.map(r => r.date + " (" + r.amount + "d, " + r.type + ")")
        };
      }
    });

    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
