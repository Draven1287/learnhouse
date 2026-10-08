const $=id=>document.getElementById(id);
try {
const lesson=await fetch('./lessons/message-to-judgment.json').then(r=>{if(!r.ok)throw Error('Lesson unavailable');return r.json()});
const key=`learningai:progress:v1:${lesson.id}:${lesson.version}`;
let state,storageWorks=true;
try{state=JSON.parse(localStorage.getItem(key));}catch{storageWorks=false;}
if(!state||state.lessonVersion!==lesson.version||!state.answers||typeof state.answers!=='object'||!Array.isArray(state.events))state=null;
const resumed=!!state;
state ||= {lessonVersion:lesson.version,attemptId:crypto.randomUUID(),answers:{},page:'trace',completed:false,events:[]};
const survey=new Survey.Model(lesson.survey);
survey.data=state.answers;
const savedPage=survey.pages.find(p=>p.name===state.page&&p.isVisible);
if(savedPage)survey.currentPage=savedPage;
function save(){state.answers=survey.data;state.page=survey.currentPage?.name||state.page;try{localStorage.setItem(key,JSON.stringify(state));}catch{storageWorks=false;} $('save-status').textContent=storageWorks?'Saved on this device only · no account or cloud sync':'Saving unavailable · progress will be lost when you leave';}
function emit(type,activityId=null,payload={}){const event={schemaVersion:1,eventId:crypto.randomUUID(),lessonId:lesson.id,lessonVersion:lesson.version,activityId,attemptId:state.attemptId,type,timestamp:new Date().toISOString(),payload};state.events.push(event);state.events=state.events.slice(-100);window.dispatchEvent(new CustomEvent('learningai:progress',{detail:structuredClone(event)}));save();}
function outcome(){const ids=['route','verdict'];const score=ids.filter(id=>survey.getQuestionByName(id).isAnswerCorrect()).length;$('score').textContent=`${score} of 2 core checks correct in your current answers. Your explanation is recorded for your own review, not graded.`;return {score,maxScore:2,reflectionSubmitted:!!survey.data.explanation};}
function showResult(){outcome();$('activity').hidden=true;$('result').hidden=false;$('result').focus();}
survey.onValueChanged.add((s,o)=>{const q=s.getQuestionByName(o.name);emit('answered',o.name,{answered:!q.isEmpty(),...(q.correctAnswer!==undefined?{correct:q.isAnswerCorrect()}:{})});});
survey.onCurrentPageChanged.add(()=>emit('page_changed',null,{page:survey.currentPage.name}));
survey.onComplete.add(()=>{state.completed=true;emit('completed',null,outcome());showResult();});
survey.render($('activity'));
if(state.completed)showResult();
if(resumed)$('notice').textContent='Resumed your saved attempt on this device.';
emit(resumed?'resumed':'started');
function restart(){try{localStorage.removeItem(key);}catch{}location.reload();}
$('restart').onclick=restart;$('retry').onclick=restart;
} catch(error){$('notice').textContent='The lesson could not load. Start the local server and check that npm install completed.';console.error(error);}
