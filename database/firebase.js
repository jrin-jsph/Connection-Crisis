import fs from 'fs';
import path from 'path';

let firestoreInstance = null;
let isInitialized = false;
let initError = null;
let adminModule = null;

// Dynamically resolve and import firebase-admin safely
async function getAdminModule() {
  if (adminModule) return adminModule;
  try {
    const mod = await import('firebase-admin');
    adminModule = mod.default || mod;
    return adminModule;
  } catch {
    try {
      // Try resolving from server/node_modules
      const serverAdminPath = path.resolve(process.cwd(), 'server', 'node_modules', 'firebase-admin', 'lib', 'index.js');
      if (fs.existsSync(serverAdminPath)) {
        const mod = await import(`file://${serverAdminPath}`);
        adminModule = mod.default || mod;
        return adminModule;
      }
    } catch {
      // Not installed or unavailable
    }
  }
  return null;
}

export async function initializeFirebase() {
  if (isInitialized) {
    return { success: true, db: firestoreInstance };
  }

  const admin = await getAdminModule();
  if (!admin) {
    initError = 'firebase-admin module not loaded. Using In-Memory repository fallback.';
    return { success: false, reason: initError };
  }

  try {
    // 1. Check for Service Account JSON path in env or disk
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
      path.resolve(process.cwd(), 'firebase-service-account.json') ||
      path.resolve(process.cwd(), 'server', 'firebase-service-account.json');

    // 2. Check for Service Account raw JSON string in env
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    let credential = null;

    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        credential = admin.credential.cert(parsed);
      } catch (err) {
        console.warn('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
      }
    } else if (fs.existsSync(serviceAccountPath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = admin.credential.cert(fileContent);
        console.log(`[Firebase] Loaded service account credentials from ${serviceAccountPath}`);
      } catch (err) {
        console.warn('[Firebase] Failed to load service account file:', err.message);
      }
    }

    if (credential) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential,
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }
      firestoreInstance = admin.firestore();
      isInitialized = true;
      console.log('🔥 [Firebase] Firestore successfully initialized and connected.');
      return { success: true, db: firestoreInstance };
    } else {
      initError = 'No valid Firebase credentials provided. Running in In-Memory fallback mode.';
      return { success: false, reason: initError };
    }
  } catch (error) {
    initError = error.message;
    console.warn(`⚠️ [Firebase] Initialization failed (${error.message}). Falling back to In-Memory repository.`);
    return { success: false, reason: error.message };
  }
}

export class FirestoreRepository {
  constructor(db) {
    this.db = db;
    this.name = 'FirestoreRepository';
  }

  async savePlayer(player) {
    const docRef = this.db.collection('players').doc(player.playerId);
    const data = {
      ...player,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(data, { merge: true });
    return player;
  }

  async getPlayer(playerId) {
    const doc = await this.db.collection('players').doc(playerId).get();
    return doc.exists ? doc.data() : null;
  }

  async getAllPlayers() {
    const snapshot = await this.db.collection('players').orderBy('joinedAt', 'desc').limit(100).get();
    return snapshot.docs.map(doc => doc.data());
  }

  async saveMatch(match) {
    const matchId = match.matchId || `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = this.db.collection('completed_matches').doc(matchId);
    const data = {
      ...match,
      matchId,
      recordedAt: new Date().toISOString()
    };
    await docRef.set(data);
    return data;
  }

  async getMatchHistory(limit = 50) {
    const snapshot = await this.db.collection('completed_matches').orderBy('recordedAt', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => doc.data());
  }

  async saveChallenge(challenge) {
    const docRef = this.db.collection('challenges').doc(challenge.challengeId);
    const data = {
      ...challenge,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(data, { merge: true });
    return data;
  }

  async getChallenges(limit = 50) {
    const snapshot = await this.db.collection('challenges').orderBy('createdAt', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => doc.data());
  }

  async saveRoyaleResult(royaleResult) {
    const royaleId = royaleResult.royaleId || `royale_${Date.now()}`;
    const docRef = this.db.collection('royale_results').doc(royaleId);
    const data = {
      ...royaleResult,
      royaleId,
      recordedAt: new Date().toISOString()
    };
    await docRef.set(data);
    return data;
  }

  async getRoyaleResults(limit = 20) {
    const snapshot = await this.db.collection('royale_results').orderBy('recordedAt', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => doc.data());
  }

  async saveStatistics(stats) {
    const docRef = this.db.collection('statistics').doc('global_summary');
    await docRef.set({
      ...stats,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return stats;
  }

  async getStatistics() {
    const doc = await this.db.collection('statistics').doc('global_summary').get();
    return doc.exists ? doc.data() : null;
  }

  getStatus() {
    return {
      type: 'Firestore',
      isAvailable: true,
      connected: true,
      details: 'Connected to Firebase Firestore Cloud Database'
    };
  }
}
