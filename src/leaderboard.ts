import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { escapeHtml } from './tools';

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

export const authReady = signInAnonymously(auth)
  .then((userCredential) => {
    firebaseUid = userCredential.user.uid;
    console.log('Player signed in with UID:', firebaseUid);
  })
  .catch((error) => {
    console.error('Anonymous sign-in failed:', error.code, error.message);
    return Promise.reject(error);
  });

export type LeaderboardEntry = {
  id: string;
  userId?: string;
  name: string;
  score: number;
  deaths?: number | any;
  updatedAt?: any;
};

export async function getLeaderboardUid() {
  if (firebaseUid) {
    return firebaseUid;
  }

  try {
    await authReady;
  } catch {
    // Ignore auth failure and fall back to generated uid.
  }

  if (firebaseUid) {
    return firebaseUid;
  }

  return crypto.randomUUID();
}

export async function savePlayerScore(uid: string, name: string, scoreValue: number) {
  try {
    const docRef = doc(db, docPath, uid);
    const existingDoc = await getDoc(docRef);
  
    if (existingDoc.exists()) {
      const updateDocData: Partial<LeaderboardEntry> = {
        name,
        score: scoreValue,
        deaths: increment(1),
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, updateDocData, { merge: true });
    } else {
      const createDoc: Omit<LeaderboardEntry, 'id'> = {
        userId: uid,
        name,
        score: scoreValue,
        deaths: 1,
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, createDoc);
    }

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
      limit(100)
    );
    const querySnapshot = await getDocs(leaderboardQuery);
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      userId: docSnap.data().userId as string | undefined,
      name: docSnap.data().name as string,
      score: docSnap.data().score as number,
      deaths: (docSnap.data().deaths as number | undefined) ?? 0,
    }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export async function fetchUserRecord(uid: string): Promise<LeaderboardEntry | null> {
  try {
    const userDoc = await getDoc(doc(db, docPath, uid));
    if (!userDoc.exists()) {
      return null;
    }
    const data = userDoc.data();
    return {
      id: userDoc.id,
      userId: data.userId as string | undefined,
      name: data.name as string,
      score: data.score as number,
      deaths: (data.deaths as number | undefined) ?? 0,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching user record:', error);
    return null;
  }
}

export async function fetchUserBestScore(uid: string): Promise<number> {
  const record = await fetchUserRecord(uid);
  return record?.score ?? 0;
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
                <span class="leaderboard-name">${escapeHtml(entry.name ?? '')}</span>
                <span class="leaderboard-score">Score: ${entry.score}</span>
                <span class="leaderboard-deaths">Deaths: ${entry.deaths ?? 0}</span>
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
