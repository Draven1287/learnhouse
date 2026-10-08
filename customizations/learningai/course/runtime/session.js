// Shared player/controller. No network, identity, or backend assumptions.
export function createSession({lesson,Model,storage,uuid=()=>crypto.randomUUID(),now=()=>new Date().toISOString(),dispatch=()=>{},onStatus=()=>{}}){
 const key=`learningai:progress:v1:${lesson.id}:${lesson.version}`;
 let storageWorks=true,saved=null;
 try{saved=JSON.parse(storage.getItem(key));}catch{storageWorks=false;}
 const valid=saved&&saved.lessonVersion===lesson.version&&typeof saved.attemptId==='string'&&saved.answers&&typeof saved.answers==='object'&&!Array.isArray(saved.answers)&&Array.isArray(saved.events);
 const survey=new Model(lesson.survey);
 const fresh=()=>({lessonVersion:lesson.version,attemptId:uuid(),answers:{},page:survey.pages[0].name,completed:false,events:[]});
 let state=valid?saved:fresh();
 // Only known activity values are restored. Validate completion independently.
 survey.data=Object.fromEntries(Object.entries(state.answers).filter(([name])=>lesson.activityIds.includes(name)));
 const page=survey.pages.find(p=>p.name===state.page&&p.isVisible);if(page)survey.currentPage=page;
 const textLimits=q=>({min:Math.max(1,...q.validators.map(v=>v.minLength||0)),max:q.maxLength>0?q.maxLength:2000});
 const requiredComplete=()=>survey.getAllQuestions().filter(q=>q.isVisible&&q.page.isVisible&&q.isRequired).every(q=>{
  if(q.isEmpty())return false;
  if(q.getType()==='comment'){const {min,max}=textLimits(q);return typeof q.value==='string'&&q.value.trim().length>=min&&q.value.length<=max;}
  return q.choices.some(c=>c.value===q.value);
 });
 state.completed=!!state.completed&&requiredComplete();
 function persist(){state.answers=structuredClone(survey.data);state.page=survey.currentPage?.name||state.page;try{storage.setItem(key,JSON.stringify(state));storageWorks=true;}catch{storageWorks=false;}onStatus(storageWorks);}
 function emit(type,activityId=null,payload={}){const event={schemaVersion:1,eventId:uuid(),lessonId:lesson.id,lessonVersion:lesson.version,activityId,attemptId:state.attemptId,type,timestamp:now(),payload};state.events.push(event);state.events=state.events.slice(-100);dispatch(structuredClone(event));persist();return event;}
 function result(){return {score:lesson.coreActivityIds.filter(id=>survey.getQuestionByName(id).isAnswerCorrect()).length,maxScore:lesson.coreActivityIds.length,reflectionSubmitted:typeof survey.data[lesson.reflectionId]==='string'&&survey.data[lesson.reflectionId].trim().length>=30};}
 function complete(){if(!requiredComplete())return false;if(!state.completed){state.completed=true;emit('completed',null,result());}return true;}
 survey.onValueChanged.add((s,o)=>{if(!lesson.activityIds.includes(o.name))return;state.completed=false;const q=s.getQuestionByName(o.name);emit('answered',o.name,{answered:!q.isEmpty(),...(q.correctAnswer!==undefined?{correct:q.isAnswerCorrect()}:{})});});
 survey.onCurrentPageChanged.add(()=>emit('page_changed',null,{page:survey.currentPage.name}));
 survey.onCompleting.add((s,o)=>{if(!requiredComplete()){o.allowComplete=false;s.validate();}});
 // Standard SurveyJS text validator counts whitespace; add a semantic-free trim check.
 survey.onValidateQuestion.add((s,o)=>{const q=s.getQuestionByName(o.name);if(q?.getType()==='comment'&&typeof o.value==='string'&&o.value.trim().length<textLimits(q).min)o.error=`Add at least ${textLimits(q).min} non-padding characters of work to submit.`;});
 survey.onComplete.add(()=>complete());
 emit(valid?'resumed':'started');
 return {survey,key,result,complete,requiredComplete,get state(){return structuredClone(state)},get storageWorks(){return storageWorks},resumed:!!valid,restart(){try{storage.removeItem(key);}catch{onStatus(false);return false;}return true;}};
}
