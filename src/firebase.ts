import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);
