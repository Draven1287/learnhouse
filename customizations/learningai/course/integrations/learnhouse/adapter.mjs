/** OFFLINE CONTRACT SCAFFOLD. No authentication, fetch, persistence or live sync. */
import { Model } from 'survey-core';
export const FIRST_LESSON = 'lai.ai-you-can-use.l01';
const own = (x,k) => Object.hasOwn(x,k);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = message => { throw new Error(message); };
const positive = n => Number.isSafeInteger(n) && n > 0;
const uuid = (s,prefix='') => typeof s === 'string' && new RegExp(`^${prefix}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`,'i').test(s);
const keys = (o,allowed) => object(o) && Object.keys(o).every(k=>allowed.includes(k));
export function validateMapping(mapping, course) {
 if(!object(mapping)||mapping.schemaVersion!==1||!['unmapped','fixture'].includes(mapping.mode)) fail('Unsupported mapping schema/mode; live mapping is intentionally disabled');
 if(mapping.courseId!==course.courseId||mapping.contentVersion!==course.contentVersion) fail('Course/version mismatch');
 if(mapping.upstream?.repository!=='learnhouse/learnhouse'||mapping.upstream?.commit!=='c8515a6f1021a34ddfc34cb3d384e478e32f905e') fail('Unreviewed upstream commit');
 if(!Array.isArray(mapping.lessons)||mapping.lessons.length!==course.lessons.length) fail('Mapping must enumerate every course lesson');
 if(mapping.externalCourse?.status!=='UNMAPPED'||!Array.isArray(mapping.externalCourse.verifiedLessonIds)||mapping.externalCourse.verifiedLessonIds.length) fail('External IDs must remain UNMAPPED pending inventory review');
 const seen=new Set(),targets=new Set();
 for(const row of mapping.lessons){
  const lesson=course.lessons.find(l=>l.id===row.lessonId);
  if(!lesson||seen.has(row.lessonId)||row.lessonVersion!==lesson.version||row.title!==lesson.title||row.sourceFile!==`lessons/course-${String(lesson.number).padStart(2,'0')}.json`) fail('Unknown, duplicate, stale or reordered lesson mapping');
  seen.add(row.lessonId);
  if(!Array.isArray(row.externalLessonIds)||row.externalLessonIds.length) fail('External lesson IDs are unresolved');
  const fields=['chapterId','chapterUuid','activityId','activityUuid'];
  if(row.status==='UNMAPPED') { if(fields.some(k=>row[k]!==null)||row.evidence!==null) fail('Unmapped target fields must be null'); }
  else if(row.status==='FIXTURE_ONLY'&&mapping.mode==='fixture'&&row.lessonId===FIRST_LESSON){
   if(!positive(row.chapterId)||!positive(row.activityId)||!uuid(row.chapterUuid,'chapter_')||!uuid(row.activityUuid,'activity_')||typeof row.evidence!=='string'||!row.evidence.includes('Synthetic fixture')) fail('Invalid fixture mapping');
   if(targets.has(row.activityUuid)) fail('Duplicate target'); targets.add(row.activityUuid);
  } else fail('Live or unsupported lesson target prohibited');
 }
 const lh=mapping.learnhouse;
 if(!object(lh)) fail('Missing LearnHouse target');
 if(mapping.mode==='unmapped') { if(['orgId','courseId','courseUuid'].some(k=>lh[k]!==null)) fail('Unmapped course fields must be null'); }
 else if(!positive(lh.orgId)||!positive(lh.courseId)||!uuid(lh.courseUuid,'course_')) fail('Invalid fixture course target');
 return true;
}
/** Validate untrusted answer snapshots against the actual SurveyJS definition.
 * Only first-lesson integration is enabled. Correctness is recalculated, not trusted.
 */
export function validateSnapshot(snapshot,lesson,course) {
 if(lesson.id!==FIRST_LESSON) fail('Only first-lesson adapter is implemented');
 if(!keys(snapshot,['schemaVersion','courseId','contentVersion','lessonId','lessonVersion','attemptId','page','answers','revision'])) fail('Unexpected snapshot fields');
 if(snapshot.schemaVersion!==1||snapshot.courseId!==course.courseId||snapshot.contentVersion!==course.contentVersion||snapshot.lessonId!==lesson.id||snapshot.lessonVersion!==lesson.version) fail('Snapshot identity/version mismatch');
 if(!uuid(snapshot.attemptId)||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||!object(snapshot.answers)) fail('Invalid snapshot shape');
 const model=new Model(lesson.survey);
 for(const [id,value] of Object.entries(snapshot.answers)){
  if(!lesson.activityIds.includes(id)) fail('Unknown answer ID');
  const q=model.getQuestionByName(id);
  if(q.getType()==='comment') { if(typeof value!=='string'||value.length>(q.maxLength>0?q.maxLength:2000)) fail('Invalid text answer'); }
  else if(!q.choices.some(c=>c.value===value)) fail('Invalid choice answer');
 }
 model.data=structuredClone(snapshot.answers);
 if(!model.pages.some(p=>p.name===snapshot.page&&p.isVisible)) fail('Unknown or hidden resume page');
 const complete=model.getAllQuestions().filter(q=>q.isRequired&&q.isVisible&&q.page.isVisible).every(q=>{
  if(q.isEmpty())return false;
  if(q.getType()==='comment')return typeof q.value==='string'&&q.value.trim().length>=Math.max(1,...q.validators.map(v=>v.minLength||0));
  return q.choices.some(c=>c.value===q.value);
 });
 return {complete,score:lesson.coreActivityIds.filter(id=>model.getQuestionByName(id).isAnswerCorrect()).length,maxScore:lesson.coreActivityIds.length,answers:structuredClone(model.data)};
}
export function validateEvent(event,lesson){
 if(!keys(event,['schemaVersion','eventId','lessonId','lessonVersion','activityId','attemptId','type','timestamp','payload'])||event.schemaVersion!==1||event.lessonId!==lesson.id||event.lessonVersion!==lesson.version||!uuid(event.eventId)||!uuid(event.attemptId)||typeof event.timestamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.timestamp)||(!Number.isFinite(Date.parse(event.timestamp))||new Date(event.timestamp).toISOString()!==event.timestamp)) fail('Invalid progress event');
 const p=event.payload;
 if(['started','resumed'].includes(event.type)){if(event.activityId!==null||!keys(p,[]) )fail('Invalid lifecycle event');}
 else if(event.type==='page_changed'){if(event.activityId!==null||!keys(p,['page'])||typeof p.page!=='string'||!lesson.survey.pages.some(x=>x.name===p.page))fail('Invalid page event');}
 else if(event.type==='answered'){if(!lesson.activityIds.includes(event.activityId)||!keys(p,['answered','correct'])||typeof p.answered!=='boolean'||(own(p,'correct')&&typeof p.correct!=='boolean'))fail('Invalid answer event');}
 else if(event.type==='completed'){if(event.activityId!==null||!keys(p,['score','maxScore','reflectionSubmitted'])||!Number.isInteger(p.score)||p.score<0||p.maxScore!==lesson.coreActivityIds.length||p.score>p.maxScore||typeof p.reflectionSubmitted!=='boolean')fail('Invalid completion event');}
 else fail('Unknown event type');
 return true;
}
/** A fixture principal is NOT authentication. Never expose this planner as a route.
 * Real server middleware must derive actor/org from a verified session, authorize
 * the mapped course, and load saved answers itself before calling an equivalent planner.
 */
export function planEvent({mapping,course,lesson,event,snapshot,principal}) {
 validateMapping(mapping,course); validateEvent(event,lesson);
 if(!keys(principal,['fixtureOnly','subject','orgId','authKind','fixtureUserId'])||principal.fixtureOnly!==true||principal.authKind!=='learner-session'||typeof principal.subject!=='string'||!principal.subject.startsWith('fixture:')||principal.subject.length>100||!positive(principal.fixtureUserId)) fail('Requires explicit synthetic learner-session fixture');
 if(mapping.mode!=='fixture')fail('UNMAPPED: no requests may be planned');
 if(principal.orgId!==mapping.learnhouse.orgId)fail('Organization mismatch');
 const row=mapping.lessons.find(r=>r.lessonId===lesson.id);
 if(row?.status!=='FIXTURE_ONLY')fail('Lesson target is UNMAPPED');
 const checked=validateSnapshot(snapshot,lesson,course);
 if(event.attemptId!==snapshot.attemptId) fail('Attempt mismatch');
 const scope=[principal.orgId,principal.subject,course.courseId,course.contentVersion,lesson.id,lesson.version,snapshot.attemptId];
 if(event.type!=='completed') return {fixtureOnly:true,kind:'partial-state-only',scope,learnhouseRequest:null};
 if(!checked.complete)fail('Incomplete answers cannot become LearnHouse completion');
 return {fixtureOnly:true,kind:'completion-intent',scope,idempotencyKey:JSON.stringify([...scope,event.eventId]),recomputed:{score:checked.score,maxScore:checked.maxScore},learnhouseRequest:{method:'POST',path:`/api/v1/trail/add_activity/${row.activityUuid}`,body:null},status:'NOT_SENT'};
}
/** Parse only the scoped coarse completion result; never reconstruct answers from it. */
export function readCompletionFixture(trail,mapping,principal){
 if(mapping.mode!=='fixture'||principal.fixtureOnly!==true||principal.orgId!==mapping.learnhouse.orgId)fail('Fixture scope required');
 if(!object(trail)||trail.org_id!==principal.orgId||trail.user_id!==principal.fixtureUserId||!Array.isArray(trail.runs))fail('Wrong or malformed fixture trail');
 const row=mapping.lessons.find(r=>r.lessonId===FIRST_LESSON);
 if(!positive(principal.fixtureUserId))fail('Fixture user ID required');
 const run=trail.runs.find(r=>r.course_id===mapping.learnhouse.courseId&&r.user_id===principal.fixtureUserId);
 if(run&&!Array.isArray(run.steps))fail('Malformed fixture steps');
 return {fixtureOnly:true,complete:!!run?.steps?.some(s=>s.activity_id===row.activityId&&s.course_id===mapping.learnhouse.courseId&&s.org_id===principal.orgId&&s.user_id===principal.fixtureUserId&&s.complete===true),partialAnswers:null};
}
