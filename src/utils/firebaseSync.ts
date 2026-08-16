import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, deleteDoc, where } from 'firebase/firestore';
import { Observation, TripRecord, EnclosureRecord } from '../types';

export const syncObservationsToFirestore = async (userId: string, observations: Observation[]) => {
  const obsRef = collection(db, 'observations');
  // First, get all existing docs for this user
  const q = query(obsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  // We'll just overwrite/add documents that exist in the local state.
  // Note: For a true bidirectional sync, we'd want to handle deletions gracefully,
  // but since local state is the source of truth in this architecture, we'll sync it up.
  // To avoid hitting quota, only doing basic setDocs.
  
  // Create a map of existing cloud docs
  const cloudDocs = new Set(snapshot.docs.map(d => d.id));
  
  const batch = [];
  for (const obs of observations) {
    if (!obs.userId) obs.userId = userId;
    const cleanObs = JSON.parse(JSON.stringify(obs));
    batch.push(setDoc(doc(obsRef, obs.id), cleanObs));
    cloudDocs.delete(obs.id);
  }
  
  // Delete any cloud docs that are no longer in local state
  for (const idToDelete of cloudDocs) {
    batch.push(deleteDoc(doc(obsRef, idToDelete)));
  }
  
  await Promise.all(batch);
};

export const syncTripsToFirestore = async (userId: string, trips: TripRecord[]) => {
  const tripsRef = collection(db, 'trips');
  const snapshot = await getDocs(query(tripsRef, where('userId', '==', userId)));
  const cloudDocs = new Set(snapshot.docs.map(d => d.id));
  
  const batch = [];
  for (const trip of trips) {
    if (!trip.userId) trip.userId = userId;
    const cleanTrip = JSON.parse(JSON.stringify(trip));
    batch.push(setDoc(doc(tripsRef, trip.id), cleanTrip));
    cloudDocs.delete(trip.id);
  }
  
  for (const idToDelete of cloudDocs) {
    batch.push(deleteDoc(doc(tripsRef, idToDelete)));
  }
  
  await Promise.all(batch);
};

export const syncEnclosuresToFirestore = async (userId: string, enclosures: EnclosureRecord[]) => {
  const encRef = collection(db, 'enclosures');
  const snapshot = await getDocs(query(encRef, where('userId', '==', userId)));
  const cloudDocs = new Set(snapshot.docs.map(d => d.id));
  
  const batch = [];
  for (const enc of enclosures) {
    if (!enc.userId) enc.userId = userId;
    const cleanEnc = JSON.parse(JSON.stringify(enc));
    batch.push(setDoc(doc(encRef, enc.id), cleanEnc));
    cloudDocs.delete(enc.id);
  }
  
  for (const idToDelete of cloudDocs) {
    batch.push(deleteDoc(doc(encRef, idToDelete)));
  }
  
  await Promise.all(batch);
};

export const loadFromFirestore = async (userId: string) => {
  const obsRef = collection(db, 'observations');
  const tripsRef = collection(db, 'trips');
  const encRef = collection(db, 'enclosures');

  // Since rules restrict reading to the user's own docs, getDocs(query(obsRef)) will just fetch their docs
  const [obsSnap, tripsSnap, encSnap] = await Promise.all([
    getDocs(query(obsRef, where('userId', '==', userId))),
    getDocs(query(tripsRef, where('userId', '==', userId))),
    getDocs(query(encRef, where('userId', '==', userId)))
  ]);

  const observations = obsSnap.docs.map(d => d.data() as Observation);
  const trips = tripsSnap.docs.map(d => d.data() as TripRecord);
  const enclosures = encSnap.docs.map(d => d.data() as EnclosureRecord);

  return { observations, trips, enclosures };
};
