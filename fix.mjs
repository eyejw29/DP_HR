import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, setDoc, doc } from "firebase/firestore";

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
  const snapshot = await getDocs(collection(db, 'employees'));
  const emps = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
  
  const addReq = async (name, date, amount, memo) => {
    let emp = emps.find(e => e.name.trim() === '성기용');
    if (!emp) {
      console.log("Still NOT FOUND 성기용. Found names:", emps.map(e => e.name).join(', '));
      return;
    }
    const type = memo.includes('월차') ? 'MONTHLY' : 'ANNUAL';
    const reqId = 'req_' + Date.now() + Math.random().toString(36).substring(7);
    await setDoc(doc(db, 'leaveRequests', reqId), {
      id: reqId,
      employeeId: emp.id,
      date,
      amount,
      type,
      memo,
      status: 'APPROVED',
      createdAt: new Date().toISOString()
    });
    console.log("Added", name, date, amount, memo);
  };

  const requests = [
    ['성기웅', '2026-01-16', 0.5, '오후반차'],
    ['성기웅', '2026-01-30', 0.5, '오후반차'],
    ['성기웅', '2026-02-06', 1.0, '연차'],
    ['성기웅', '2026-02-27', 0.5, '오후반차'],
    ['성기웅', '2026-03-13', 0.5, '오후반차']
  ];

  for (const r of requests) {
    await addReq(r[0], r[1], r[2], r[3]);
  }
  console.log("ALL DONE!");
  process.exit(0);
}
run();
