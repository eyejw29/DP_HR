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
    let searchName = name;
    if (name === '성기웅') searchName = '성기용';
    
    let emp = emps.find(e => e.name === searchName);
    if (!emp) {
      console.log("NOT FOUND:", name);
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
    ['유혜영', '2026-01-02', 1.0, '월차'],
    ['이정현', '2026-01-02', 0.5, '오후반차'],
    ['송민', '2026-01-08', 1.0, '월차'],
    ['오은재', '2026-01-08', 0.5, '오전반차'],
    ['유혜영', '2026-01-08', 0.5, '오후반차'],
    ['송민', '2026-01-09', 1.0, '연차'],
    ['오은재', '2026-01-09', 0.5, '오후반차'],
    ['오은재', '2026-01-14', 1.0, '월차'],
    ['이동필', '2026-01-14', 1.0, '월차'],
    ['이정현', '2026-01-16', 1.0, '월차'],
    ['성기웅', '2026-01-16', 0.5, '오후반차'],
    ['오은재', '2026-01-26', 1.0, '연차'],
    ['이수연', '2026-01-26', 1.0, '연차'],
    ['이정현', '2026-01-27', 1.0, '연차'],
    ['성기웅', '2026-01-30', 0.5, '오후반차'],
    ['이정현', '2026-02-05', 0.5, '오후반차'],
    ['성기웅', '2026-02-06', 1.0, '연차'],
    ['유혜영', '2026-02-06', 1.0, '월차'],
    ['유혜영', '2026-02-13', 0.5, '오후반차'],
    ['이정현', '2026-02-19', 1.0, '연차'],
    ['이정현', '2026-02-20', 1.0, '월차'],
    ['이수연', '2026-02-24', 1.0, '월차'],
    ['성기웅', '2026-02-27', 0.5, '오후반차'],
    ['송민', '2026-02-27', 1.0, '월차'],
    ['이동필', '2026-02-27', 1.0, '월차'],
    ['유혜영', '2026-03-03', 0.5, '오후반차'],
    ['이정현', '2026-03-03', 0.5, '오전반차'],
    ['조민지', '2026-03-04', 0.5, '오후반차'],
    ['오은재', '2026-03-09', 0.5, '오전반차'],
    ['이동필', '2026-03-13', 1.0, '월차'],
    ['이정현', '2026-03-13', 0.25, '오전 반반차'],
    ['성기웅', '2026-03-13', 0.5, '오후반차'],
    ['송민', '2026-03-18', 1.0, '월차'],
    ['오은재', '2026-03-18', 0.5, '오후반차'],
    ['이동필', '2026-03-19', 1.0, '연차'],
    ['이정현', '2026-03-26', 0.5, '오후반차'],
    ['이수연', '2026-03-27', 1.0, '월차'],
    ['이수연', '2026-04-01', 1.0, '월차']
  ];

  for (const r of requests) {
    await addReq(r[0], r[1], r[2], r[3]);
  }
  console.log("ALL DONE!");
  process.exit(0);
}
run();
