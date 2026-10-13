"""Dependency-free tests of actual submission rules; run via unittest discovery."""
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest

path = Path(__file__).resolve().parents[2] / 'services/learningai/contract.py'
spec = importlib.util.spec_from_file_location('learningai_contract', path)
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)

class ContractTests(unittest.TestCase):
    def test_integrated_reflection_matches_canonical_curriculum(self):
        root = Path(__file__).resolve().parents[5]
        manifest = json.loads((root / 'customizations/learningai/course/curriculum/course-manifest.json').read_text())
        authored = next(lesson for lesson in manifest['lessons'] if lesson['id'] == c.LESSON_ID)
        self.assertEqual(c.LESSONS[c.LESSON_ID]['transfer'], authored['transfer'])
        self.assertEqual(c.LESSON['completionPolicy'], authored['completionPolicy'])
        portable = json.loads((root / 'customizations/learningai/course/lessons/course-01.json').read_text())
        reflection = next(element for page in portable['survey']['pages'] for element in page['elements'] if element['name'] == c.LESSON['transfer']['id'])
        self.assertEqual(reflection['title'], authored['transfer']['prompt'])

    def setUp(self):
        self.first, self.second = [a['id'] for a in c.LESSON['activities']]
        self.branch = c.LESSON['branchActivity']['id']
        self.text = c.LESSON['transfer']['id']
        self.answers = {self.first: 'paper', self.second: 'fit', self.text: 'Run a ten minute paper game; ask all participants if everyone can join.'}
        self.empty = dict(answers={}, page=0, revision=0, completed=False)
    def test_correct_complete(self):
        self.assertTrue(c.transition(self.empty, self.answers, 3, 0, True)['completed'])
    def test_wrong_answers_still_formative(self):
        self.answers.update({self.first:'paid', self.second:'obey', self.branch:'label'})
        self.assertTrue(c.transition(self.empty, self.answers, 3, 0, True)['completed'])
    def test_wrong_answer_requires_branch(self):
        self.answers[self.first]='paid'
        with self.assertRaises(c.ContractError):
            c.validate(self.answers, 3, True)
    def test_hidden_branch_cleared(self):
        self.answers[self.branch]='limits'
        self.assertNotIn(self.branch,c.validate(self.answers,3,True))
    def test_missing_choice_and_short_reflection(self):
        for patch in [{self.first:''},{self.text:'short'},{self.text:' '*31}]:
            with self.subTest(patch=patch),self.assertRaises(c.ContractError):
                c.validate(self.answers|patch,3,True)
    def test_invalid_unknown_choices_and_identity(self):
        for patch in [{'user_id':'someone'},{'score':'100'},{self.first:'invented'},{self.first:[]},{self.text:'x'*2001}]:
            with self.subTest(patch=list(patch)),self.assertRaises(c.ContractError):
                c.validate(self.answers|patch,3)
    def test_bad_page_revision_types(self):
        for page in [-1,4,True,'1']:
            with self.assertRaises(c.ContractError):
                c.validate({},page)
        for rev in [-1,True,'0']:
            with self.assertRaises(c.ContractError):
                c.transition(self.empty,{},0,rev)
    def test_partial_save_not_complete(self):
        saved=c.transition(self.empty,{self.first:'paper'},0,0)
        self.assertFalse(saved['completed'])
        self.assertEqual(saved['revision'],1)
    def test_concurrent_stale_revision_rejected(self):
        first=c.transition(self.empty,{self.first:'paper'},0,0)
        with self.assertRaisesRegex(c.ContractError,'Stale'):
                c.transition(first,{self.first:
                'paid'},0,0)
    def test_retry_after_success_idempotent_and_no_overwrite(self):
        saved=c.transition(self.empty,self.answers,3,0,True)
        self.assertEqual(saved,c.transition(saved,self.answers,3,0,True))
        with self.assertRaisesRegex(c.ContractError,'immutable'):
                c.transition(saved,self.answers|{self.second:
                'obey'},3,1,True)
    def test_unicode_matches_browser_text_limits(self):
        self.assertEqual(c.text_units('😀' * 15), 30)
        self.answers[self.text] = '😀' * 15
        self.assertTrue(c.transition(self.empty, self.answers, 3, 0, True)['completed'])
        for text in ['😀' * 1001, '\ud800', '\ufeff' * 30]:
            with self.subTest(text=repr(text)), self.assertRaises(c.ContractError):
                c.validate(self.answers | {self.text:text}, 3, True)
    def test_definition_allowlist(self):
        activity=SimpleNamespace(activity_type='TYPE_CUSTOM',activity_sub_type='SUBTYPE_CUSTOM',content={'learningai':{'lesson_id':c.LESSON_ID,'version':1,'content_version':c.CONTENT_VERSION}})
        self.assertTrue(c.supported(activity))
        activity.content['learningai']['version']=999
        self.assertFalse(c.supported(activity))
        activity.activity_type='TYPE_VIDEO'
        self.assertFalse(c.is_managed(activity))

    def test_each_pilot_bundle_matches_canonical_and_preserves_fifteen_lesson_plan(self):
        root = Path(__file__).resolve().parents[5]
        manifest = json.loads((root / 'customizations/learningai/course/curriculum/course-manifest.json').read_text())
        self.assertEqual([item['number'] for item in manifest['lessons']], list(range(1, 16)))
        self.assertEqual(set(c.LESSONS), {'lai.ai-you-can-use.l01', 'lai.ai-you-can-use.l02', 'lai.ai-you-can-use.l03'})
        for lesson in c.LESSONS.values():
            self.assertEqual(lesson, next(item for item in manifest['lessons'] if item['id'] == lesson['id']))
            self.assertTrue(lesson['teaching']['practice']['instructions'])
            self.assertTrue(lesson['teaching']['independentPractice'])

    def test_second_lesson_has_isolated_validation_and_formative_completion(self):
        lesson = c.LESSONS['lai.ai-you-can-use.l02']
        answers = {a['id']: a['correctAnswer'] for a in lesson['activities']}
        answers[lesson['transfer']['id']] = 'If a timer reaches zero, show a reminder. Test a learned tool on new labeled examples.'
        answers.update({f['id']: 'My evidence and limit.' for f in lesson['responseFields']})
        self.assertTrue(c.transition(self.empty, answers, 3, 0, True, lesson)['completed'])
        with self.assertRaisesRegex(c.ContractError, 'Unknown answer'):
            c.validate(self.answers, 3, True, lesson)
        with self.assertRaisesRegex(c.ContractError, 'Unknown answer'):
            c.validate(answers, 3, True)
        answers[lesson['activities'][0]['id']] = 'output'
        with self.assertRaisesRegex(c.ContractError, 'Required'):
            c.validate(answers, 3, True, lesson)
        answers[lesson['branchActivity']['id']] = 'no'
        self.assertTrue(c.transition(self.empty, answers, 3, 0, True, lesson)['completed'])
        answers[lesson['activities'][0]['id']] = 'mix'
        self.assertNotIn(lesson['branchActivity']['id'], c.validate(answers, 3, True, lesson))

    def test_lesson_registry_rejects_unreleased_and_malformed_definitions(self):
        activity = SimpleNamespace(activity_type='TYPE_CUSTOM', activity_sub_type='SUBTYPE_CUSTOM', content={})
        for lesson_id in ['lai.ai-you-can-use.l02', 'lai.ai-you-can-use.l03', [], None]:
            activity.content = {'learningai': {'lesson_id': lesson_id, 'version': 1, 'content_version': c.CONTENT_VERSION}}
            self.assertEqual(c.supported(activity), lesson_id == 'lai.ai-you-can-use.l02')

    def test_new_editions_require_practice_presence_without_claiming_a_grade(self):
        for lesson in c.LESSONS.values():
            answers = {a['id']: a['correctAnswer'] for a in lesson['activities']}
            answers[lesson['transfer']['id']] = 'x'
            for field in lesson['responseFields']:
                answers[field['id']] = 'x'
            self.assertTrue(c.transition(self.empty, answers, 3, 0, True, lesson)['completed'])
            for field in lesson['responseFields']:
                with self.subTest(field=field['id']), self.assertRaises(c.ContractError):
                    c.validate(answers | {field['id']: '  '}, 3, True, lesson)
        first = c.LESSONS[c.LESSON_ID]
        with self.assertRaisesRegex(c.ContractError, 'first attempt'):
            c.validate({}, 1, False, first)
        self.assertEqual(c.validate({}, 0, False, first), {})

    def test_third_lesson_attempt_evidence_remediation_and_isolation(self):
        lesson = c.LESSONS['lai.ai-you-can-use.l03']
        with self.assertRaisesRegex(c.ContractError, 'first attempt'):
            c.validate({}, 1, lesson=lesson)
        work = {a['id']: a['correctAnswer'] for a in lesson['activities']}
        work.update({f['id']: 'My evidence, explanation and limit.' for f in lesson['responseFields']})
        work[lesson['transfer']['id']] = 'Withhold the food claim; ask the organizer. Generation is inference.'
        self.assertTrue(c.transition(self.empty, work, 3, 0, True, lesson)['completed'])
        work[lesson['activities'][1]['id']] = 'latest'
        with self.assertRaisesRegex(c.ContractError, 'Required'):
            c.validate(work, 3, True, lesson)
        work[lesson['branchActivity']['id']] = 'repeat'
        self.assertTrue(c.transition(self.empty, work, 3, 0, True, lesson)['completed'])
        work[lesson['activities'][1]['id']] = 'source'
        self.assertNotIn(lesson['branchActivity']['id'], c.validate(work, 3, True, lesson))
        for old in c.LESSON_VERSIONS.values():
            if old['id'] != lesson['id']:
                with self.assertRaisesRegex(c.ContractError, 'Unknown'):
                    c.validate(work, 3, True, old)
        for number in range(4, 16):
            for version in (1, 2):
                activity = SimpleNamespace(activity_type='TYPE_CUSTOM', activity_sub_type='SUBTYPE_CUSTOM', content={'learningai': {'lesson_id': f'lai.ai-you-can-use.l{number:02d}', 'version': version, 'content_version': c.CONTENT_VERSION}})
                self.assertFalse(c.supported(activity))

    def test_attempt_edition_pins_original_answer_meaning(self):
        activity = SimpleNamespace(activity_type='TYPE_CUSTOM', activity_sub_type='SUBTYPE_CUSTOM',
            content={'learningai': {'lesson_id': c.LESSON_ID, 'version': 2, 'content_version': c.CONTENT_VERSION}})
        self.assertEqual(c.lesson_for(activity)['version'], 2)
        self.assertEqual(c.lesson_for(activity, 1), c.LESSON)
        self.assertIsNone(c.lesson_for(activity, 999))
        self.assertTrue(c.transition(self.empty, self.answers, 3, 0, True, c.lesson_for(activity, 1))['completed'])

if __name__ == '__main__':
    unittest.main()
