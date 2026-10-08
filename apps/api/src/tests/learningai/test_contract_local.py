"""Dependency-free tests of actual submission rules; run via unittest discovery."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

path = Path(__file__).resolve().parents[2] / 'services/learningai/contract.py'
spec = importlib.util.spec_from_file_location('learningai_contract', path)
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)

class ContractTests(unittest.TestCase):
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
        with self.assertRaises(c.ContractError):c.validate(self.answers, 3, True)
    def test_hidden_branch_cleared(self):
        self.answers[self.branch]='limits'
        self.assertNotIn(self.branch,c.validate(self.answers,3,True))
    def test_missing_choice_and_short_reflection(self):
        for patch in [{self.first:''},{self.text:'short'},{self.text:' '*31}]:
            with self.subTest(patch=patch),self.assertRaises(c.ContractError):c.validate(self.answers|patch,3,True)
    def test_invalid_unknown_choices_and_identity(self):
        for patch in [{'user_id':'someone'},{'score':'100'},{self.first:'invented'},{self.first:[]},{self.text:'x'*2001}]:
            with self.subTest(patch=list(patch)),self.assertRaises(c.ContractError):c.validate(self.answers|patch,3)
    def test_bad_page_revision_types(self):
        for page in [-1,4,True,'1']:
            with self.assertRaises(c.ContractError):c.validate({},page)
        for rev in [-1,True,'0']:
            with self.assertRaises(c.ContractError):c.transition(self.empty,{},0,rev)
    def test_partial_save_not_complete(self):
        saved=c.transition(self.empty,{self.first:'paper'},0,0)
        self.assertFalse(saved['completed']);self.assertEqual(saved['revision'],1)
    def test_concurrent_stale_revision_rejected(self):
        first=c.transition(self.empty,{self.first:'paper'},0,0)
        with self.assertRaisesRegex(c.ContractError,'Stale'):c.transition(first,{self.first:'paid'},0,0)
    def test_retry_after_success_idempotent_and_no_overwrite(self):
        saved=c.transition(self.empty,self.answers,3,0,True)
        self.assertEqual(saved,c.transition(saved,self.answers,3,0,True))
        with self.assertRaisesRegex(c.ContractError,'immutable'):c.transition(saved,self.answers|{self.second:'obey'},3,1,True)
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
        activity.content['learningai']['version']=2;self.assertFalse(c.supported(activity))
        activity.activity_type='TYPE_VIDEO';self.assertFalse(c.is_managed(activity))

if __name__ == '__main__':unittest.main()
