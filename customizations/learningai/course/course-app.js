import {createSession} from './runtime/session.js';
const $=id=>document.getElementById(id);
try{
 const n=new URL(location.href).searchParams.get('lesson')||'1';
 if(!/^(?:[1-9]|1[0-5])$/.test(n))throw Error('Choose a lesson from 1 to 15.');
 const lesson=await fetch(`lessons/course-${n.padStart(2,'0')}.json`).then(r=>{if(!r.ok)throw Error('Lesson could not load.');return r.json()});
 const manifest=await fetch('curriculum/course-manifest.json').then(r=>r.json());
 for(const part of manifest.parts){const label=document.createElement('p');label.textContent=`Part ${part.number}: ${part.title}`;$('lesson-links').append(label);for(const item of manifest.lessons.filter(l=>l.part===part.number)){const a=document.createElement('a');a.href=`course.html?lesson=${item.number}`;a.textContent=`${item.number}. ${item.title}`;a.style.display='block';if(String(item.number)===n)a.setAttribute('aria-current','page');$('lesson-links').append(a);}}
 $('title').textContent=`${n}. ${lesson.title}`;document.title=`${lesson.title} · Learning AI draft`;
 for(const source of manifest.sources.filter(s=>lesson.sourceIds.includes(s.id))){const li=document.createElement('li'),a=document.createElement('a');a.href=source.url;a.textContent=source.title;li.append(a,document.createTextNode(' — '+source.supports));$('sources').append(li);}
 // Defer localStorage access so blocked storage still permits the lesson to run.
 const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
 const session=createSession({lesson,Model:Survey.Model,storage,dispatch:event=>window.dispatchEvent(new CustomEvent('learningai:progress',{detail:event})),onStatus:ok=>$('save-status').textContent=ok?'Saved on this device only · no account or cloud sync':'Saving unavailable · progress will be lost when you leave'});
 function finish(){const r=session.result();$('score').textContent=`${r.score} of ${r.maxScore} core checks correct in your current answers. You can retry after reviewing the feedback.`;$('activity').hidden=true;$('result').hidden=false;$('result').focus();if(Number(n)<15){$('next-lesson').href=`course.html?lesson=${Number(n)+1}`;$('next-lesson').hidden=false;}else{$('next-lesson').hidden=true;}}
 session.survey.onComplete.add(()=>{if(session.state.completed)finish();});
 session.survey.render($('activity'));
 if(session.resumed)$('notice').textContent='Resumed this lesson’s saved attempt on this device.';
 if(session.state.completed)finish();
 function restart(){if(session.restart())location.reload();else $('notice').textContent='Could not clear the saved attempt. Browser storage is unavailable; your existing record has not been confirmed erased.';}
 $('restart').onclick=restart;$('retry').onclick=restart;
}catch(error){$('notice').textContent=error.message;}
