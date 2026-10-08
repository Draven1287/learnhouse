/** Deliberately volatile, synthetic-only repository contract. NOT a database or login. */
import {validateSnapshot} from './adapter.mjs';
export function createFixtureStore({course,lesson}){
 const states=new Map(),events=new Map();
 function key(actor,snapshot){
  if(actor?.fixtureOnly!==true||actor.authKind!=='learner-session'||!actor.subject?.startsWith('fixture:')||!Number.isSafeInteger(actor.orgId)||actor.orgId<1)throw Error('Synthetic actor required');
  validateSnapshot(snapshot,lesson,course);
  return JSON.stringify([actor.orgId,actor.subject,snapshot.courseId,snapshot.contentVersion,snapshot.lessonId,snapshot.lessonVersion,snapshot.attemptId]);
 }
 return {
  save(actor,snapshot,expectedRevision){
   const k=key(actor,snapshot),old=states.get(k);
   if((old?.revision??null)!==expectedRevision||snapshot.revision!==(old?old.revision+1:0))throw Error('Revision conflict');
   states.set(k,structuredClone(snapshot));return structuredClone(snapshot);
  },
  resume(actor,identity){const value=states.get(key(actor,identity));return value?structuredClone(value):null;},
  recordIntent(actor,snapshot,eventId,intent){
   const k=key(actor,snapshot),eventKey=JSON.stringify([k,eventId]);
   if(intent?.fixtureOnly!==true||intent.status!=='NOT_SENT')throw Error('Only unsent fixture intents accepted');
   const canonical=JSON.stringify(intent),old=events.get(eventKey);
   if(old&&old!==canonical)throw Error('Idempotency conflict');
   events.set(eventKey,canonical);return {fixtureOnly:true,duplicate:!!old,status:'NOT_SENT'};
  }
 };
}
