import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, setDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsO8I5JnFTvKMkGgqchxHv4NR8jxsTz9c",
  authDomain: "dpworks-hr.firebaseapp.com",
  projectId: "dpworks-hr",
  storageBucket: "dpworks-hr.firebasestorage.app",
  messagingSenderId: "728442274837",
  appId: "1:728442274837:web:f3351badbc5491a3027a1c",
  measurementId: "G-C6CV49ZCN1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, 'employees'));
  const emps = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
  
  const addReq = async (name, date, amount, memo) => {
    const emp = emps.find(e => e.name === name);
    if (!emp) {
      console.log("NOT FOUND:", name);
      return;
    }
    const reqId = 'req_' + Date.now() + Math.random().toString(36).substring(7);
    await setDoc(doc(db, 'leaveRequests', reqId), {
      id: reqId,
      employeeId: emp.id,
      date,
      amount,
      type: 'ANNUAL',
      memo,
      status: 'APPROVED',
      createdAt: new Date().toISOString()
    });
    console.log("Added", name, date, amount);
  };

  await addReq('임세은', '2026-01-12', 0.5, '오후반차');
  await addReq('류지승', '2026-01-19', 1.0, '연차');
  await addReq('임세은', '2026-01-30', 0.5, '오후반차');
  await addReq('임세은', '2026-02-27', 1.0, '월차');
  await addReq('김지호', '2026-03-11', 1.0, '월차');
  await addReq('류지승', '2026-03-13', 1.0, '연차');
  await addReq('임세은', '2026-03-20', 1.0, '월차');

  console.log("DONE");
  process.exit(0);
}
run();
