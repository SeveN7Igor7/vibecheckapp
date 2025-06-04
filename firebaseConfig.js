// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBz9dnqEGCQfvkBc6dn880GvXSxRk3hOYY",
  authDomain: "dbdevelopment.firebaseapp.com",
  databaseURL: "https://dbdevelopment-default-rtdb.firebaseio.com",
  projectId: "dbdevelopment",
  storageBucket: "dbdevelopment.firebasestorage.app",
  messagingSenderId: "549830181060",
  appId: "1:549830181060:web:49e24dcbf32a83d1818991"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
const database = getDatabase(app);

export { app, database };
