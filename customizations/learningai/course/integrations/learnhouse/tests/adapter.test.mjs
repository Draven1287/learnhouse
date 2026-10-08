import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateMapping,validateSnapshot,validateEvent,planEvent,readCompletionFixture} from '../adapter.mjs';
import {createFixtureStore} from '../fixture-store.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const course=read('../../../curriculum/course-manifest.json'),lesson=read('../../../lessons/course-01.json');
const source=read('../lesson-mapping.json'),fixture=read('../fixtures/mapping.synthetic.json');
const clone=x=>structuredClone(x);
const principal={fixtureOnly:true,subject:'fixture:learner-a',orgId:900001,authKind:'learner-session',fixtureUserId:900005};
const snapshot={schemaVersion:1,courseId:course.courseId,contentVersion:course.contentVersion,lessonId:lesson.id,lessonVersion:1,attemptId:'00000000-0000-4000-8000-000000000010',page:'transfer',revision:0,answers:{[lesson.coreActivityIds[0]]:'paper',[lesson.coreActivityIds[1]]:'fit',[lesson.reflectionId]:'Use a ten-minute paper game and ask the club if everyone can join.'}};
const event={schemaVersion:1,eventId:'00000000-0000-4000-8000-000000000011',lessonId:lesson.id,lessonVersion:1,activityId:null,attemptId:snapshot.attemptId,type:'completed',timestamp:'2026-10-05T00:00:00.000Z',payload:{score:2,maxScore:2,reflectionSubmitted:true}};
const plan=(extra={})=>planEvent({mapping:fixture,course,lesson,event,snapshot,principal,...extra});
test('all 15 versioned lessons explicitly UNMAPPED and external IDs not guessed',()=>{assert.equal(validateMapping(source,course),true);assert.equal(source.lessons.length,15);assert.ok(source.lessons.every(l=>l.status==='UNMAPPED'&&l.activityUuid===null));assert.deepEqual(source.externalCourse.reportedLessonCounts,[12,14]);});
test('fixture mapping is separately labeled and validates',()=>assert.equal(validateMapping(fixture,course),true));
for(const [label,mutate] of [
 ['missing lesson',m=>m.lessons.pop()],['duplicate lesson',m=>m.lessons[1]=m.lessons[0]],['course version',m=>m.contentVersion='old'],['lesson version',m=>m.lessons[0].lessonVersion=2],['fabricated external ID',m=>m.lessons[0].externalLessonIds=['chapter-1']],['invented target in real manifest',m=>m.lessons[0].activityUuid='invented'],['live mode',m=>m.mode='live'],['unreviewed upstream',m=>m.upstream.commit='0'.repeat(40)]
])test(`mapping rejects ${label}`,()=>{const m=clone(source);mutate(m);assert.throws(()=>validateMapping(m,course));});
test('real unmapped manifest cannot produce a request',()=>assert.throws(()=>plan({mapping:source}),/UNMAPPED/));
test('completion creates only a dry request, no answer text',()=>{const p=plan();assert.equal(p.status,'NOT_SENT');assert.equal(p.learnhouseRequest.method,'POST');assert.equal(p.learnhouseRequest.path,'/api/v1/trail/add_activity/activity_00000000-0000-4000-8000-000000000004');assert.equal(p.learnhouseRequest.body,null);assert.ok(!JSON.stringify(p).includes(snapshot.answers[lesson.reflectionId]));});
for(const type of ['started','resumed','answered','page_changed'])test(`${type} never plans LearnHouse completion`,()=>{const e={...event,type,payload:type==='answered'?{answered:true,correct:true}:type==='page_changed'?{page:'transfer'}:{},activityId:type==='answered'?lesson.coreActivityIds[0]:null};assert.equal(plan({event:e}).learnhouseRequest,null);});
for(const [label,mutate] of [
 ['unknown activity',s=>s.answers.unknown='x'],['invalid choice',s=>s.answers[lesson.coreActivityIds[0]]='fabricated'],['extra identity field',s=>s.userId=1],['wrong version',s=>s.lessonVersion=2],['unknown page',s=>s.page='unknown'],['oversized text',s=>s.answers[lesson.reflectionId]='x'.repeat(3000)],['nontext reflection',s=>s.answers[lesson.reflectionId]={x:1}],['invalid attempt',s=>s.attemptId='x'],['negative revision',s=>s.revision=-1]
])test(`snapshot rejects ${label}`,()=>{const s=clone(snapshot);mutate(s);assert.throws(()=>validateSnapshot(s,lesson,course));});
test('partial answers accepted as partial, completion blocked',()=>{const s={...snapshot,answers:{}};assert.equal(validateSnapshot(s,lesson,course).complete,false);assert.throws(()=>plan({snapshot:s}),/Incomplete/);});
test('whitespace does not satisfy reflection',()=>{const s=clone(snapshot);s.answers[lesson.reflectionId]=' '.repeat(100);assert.throws(()=>plan({snapshot:s}),/Incomplete/);});
test('wrong core answer triggers required branch, still permits formative completion after branch',()=>{const s=clone(snapshot);s.answers[lesson.coreActivityIds[0]]='paid';assert.throws(()=>plan({snapshot:s}),/Incomplete/);s.answers['lai.ai-you-can-use.l01.constraint_check']='limits';assert.equal(plan({snapshot:s}).recomputed.score,1);});
test('client score is not trusted',()=>assert.equal(plan({event:{...event,payload:{...event.payload,score:0}}}).recomputed.score,2));
for(const principalOverride of [{...principal,authKind:'api-token'},{...principal,fixtureOnly:false},{...principal,orgId:44},{...principal,subject:'real-user'}])test(`rejects unsafe principal ${JSON.stringify(principalOverride)}`,()=>assert.throws(()=>plan({principal:principalOverride})));
test('event attempt must equal saved snapshot',()=>assert.throws(()=>plan({event:{...event,attemptId:'00000000-0000-4000-8000-000000000099'}}),/Attempt mismatch/));
test('event payload rejects answer leakage',()=>assert.throws(()=>validateEvent({...event,payload:{...event.payload,answers:snapshot.answers}},lesson)));
test('unknown event rejected',()=>assert.throws(()=>validateEvent({...event,type:'reset'},lesson)));
test('invalid time rejected',()=>assert.throws(()=>validateEvent({...event,timestamp:'yesterday'},lesson)));
test('unsupported second lesson rejected',()=>assert.throws(()=>validateSnapshot({...snapshot,lessonId:'lai.ai-you-can-use.l02'},read('../../../lessons/course-02.json'),course),/first-lesson/));
test('fixture save/resume preserves partial answers and isolates two learners',()=>{const db=createFixtureStore({course,lesson});const partial={...snapshot,answers:{[lesson.coreActivityIds[0]]:'paper'}};db.save(principal,partial,null);assert.deepEqual(db.resume(principal,partial).answers,partial.answers);assert.equal(db.resume({...principal,subject:'fixture:learner-b'},partial),null);const out=db.resume(principal,partial);out.answers={};assert.deepEqual(db.resume(principal,partial).answers,partial.answers);});
test('stale revision cannot overwrite newer answer state',()=>{const db=createFixtureStore({course,lesson});db.save(principal,snapshot,null);db.save(principal,{...snapshot,revision:1},0);assert.throws(()=>db.save(principal,{...snapshot,revision:1},0),/Revision conflict/);});
test('fixture duplicate event is deduped, changed event body conflicts',()=>{const db=createFixtureStore({course,lesson}),p=plan();assert.equal(db.recordIntent(principal,snapshot,event.eventId,p).duplicate,false);assert.equal(db.recordIntent(principal,snapshot,event.eventId,p).duplicate,true);assert.throws(()=>db.recordIntent(principal,snapshot,event.eventId,{...p,kind:'changed'}),/Idempotency conflict/);});
test('trail read parses numeric identity and never invents partial answers',()=>{const trail=read('../fixtures/trail.synthetic.json');assert.deepEqual(readCompletionFixture(trail,fixture,principal),{fixtureOnly:true,complete:true,partialAnswers:null});trail.runs[0].steps[0].user_id=123;assert.equal(readCompletionFixture(trail,fixture,principal).complete,false);});
test('wrong org trail rejected',()=>{const trail=read('../fixtures/trail.synthetic.json');trail.org_id=42;assert.throws(()=>readCompletionFixture(trail,fixture,principal));});

test('trail read rejects another authenticated fixture learner',()=>assert.throws(()=>readCompletionFixture(read('../fixtures/trail.synthetic.json'),fixture,{...principal,subject:'fixture:learner-b',fixtureUserId:900099})));
test('impossible calendar date rejected',()=>assert.throws(()=>validateEvent({...event,timestamp:'2026-02-30T00:00:00.000Z'},lesson)));
