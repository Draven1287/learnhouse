import {readFileSync} from 'node:fs';
import {validateMapping} from './adapter.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const course=read('../../curriculum/course-manifest.json');
validateMapping(read('./lesson-mapping.json'),course);
validateMapping(read('./fixtures/mapping.synthetic.json'),course);
console.log('PASS: 15 stable lesson IDs and course version validated; real targets remain UNMAPPED. Synthetic targets are fixture-only. No requests sent.');
