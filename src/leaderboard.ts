import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3xJsRS7dsa4p2Pt9wq2y-JUIR-sIY4AM",
  authDomain: "my-kiwi-games.firebaseapp.com",
  projectId: "my-kiwi-games",
  storageBucket: "my-kiwi-games.firebasestorage.app",
  messagingSenderId: "152877228068",
  appId: "1:152877228068:web:1c231f08386318537ff8b1",
  measurementId: "G-XGZZ8MXJJQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const docPath = 'flap-scores';

let firebaseUid: string | null = null;

signInAnonymously(auth)
  .then((userCredential) => {
    firebaseUid = userCredential.user.uid;
    console.log('Player signed in with UID:', firebaseUid);
  })
  .catch((error) => {
    console.error('Anonymous sign-in failed:', error.code, error.message);
  });

export type LeaderboardEntry = {
  id: string;
  userId?: string;
  name: string;
  score: number;
  updatedAt?: any;
};

export function getLeaderboardUid() {
  const storedUid = localStorage.getItem('fallbackUid');
  if (firebaseUid) {
    return firebaseUid;
  }
  if (storedUid) {
    return storedUid;
  }
  const newUid = crypto.randomUUID();
  localStorage.setItem('fallbackUid', newUid);
  return newUid;
}

export async function savePlayerScore(uid: string, name: string, scoreValue: number) {
  try {
    const document: Omit<LeaderboardEntry, 'id'> = {
      userId: uid,
      name: name,
      score: scoreValue,
      updatedAt: serverTimestamp(),
    }
    await setDoc(doc(db, docPath, uid), document);
    console.log('Score saved successfully!');
  } catch (error) {
    console.error('Error saving score:', error);
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const leaderboardQuery = query(
      collection(db, docPath),
      orderBy('score', 'desc'),
      limit(10)
    );
    const querySnapshot = await getDocs(leaderboardQuery);
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      name: docSnap.data().name as string,
      score: docSnap.data().score as number,
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export function clearOverlay() {
  const existing = document.getElementById('ui-overlay');
  if (existing) {
    existing.remove();
  }
}

export function showLeaderboardOverlay(scores: Array<LeaderboardEntry>, onRetry: () => void) {
  clearOverlay();
  const overlay = document.createElement('div');
  overlay.id = 'ui-overlay';
  overlay.innerHTML = `
    <div class="ui-card">
      <h2>Leaderboard</h2>
      <div class="leaderboard-list">
        ${scores
      .map(
        (entry, index) =>
          `<div class="leaderboard-row">
                <span class="leaderboard-rank">${index + 1}.</span>
                <span class="leaderboard-name">${entry.name}</span><
                span class="leaderboard-score">${entry.score}</span>
              </div>`
      )
      .join('')}
      </div>
      <button id="retry-button">Retry</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const retryButton = document.getElementById('retry-button');
  retryButton?.addEventListener('click', () => {
    clearOverlay();
    onRetry();
  });
}

export function showNameEntryOverlay(scoreValue: number, onSubmit: (name: string) => Promise<void>) {
  clearOverlay();
  const overlay = document.createElement('div');
  overlay.id = 'ui-overlay';
  overlay.innerHTML = `
    <div class="ui-card">
      <h2>New Personal Best!</h2>
      <p>Your score: <strong>${scoreValue}</strong></p>
      <label for="player-name-input">Enter your name</label>
      <input id="player-name-input" type="text" maxlength="20" placeholder="Your name" />
      <button id="submit-name-button">Submit</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const submitButton = document.getElementById('submit-name-button');
  const nameInput = document.getElementById('player-name-input') as HTMLInputElement | null;
  submitButton?.addEventListener('click', async () => {
    const name = nameInput?.value.trim() || '';
    if (!name) {
      nameInput?.focus();
      return;
    }
    await onSubmit(name);
  });
}
