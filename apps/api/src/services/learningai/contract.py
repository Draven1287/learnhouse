"""Explicit pilot lesson allowlist; no client definitions or scores are trusted."""
import json
from pathlib import Path

LESSONS = {
    lesson["id"]: lesson
    for lesson in (json.loads(Path(__file__).with_name(f"lesson-{number:02d}.json").read_text()) for number in (1, 2, 3))
}
LESSON_VERSIONS = {(lesson["id"], lesson["version"]): lesson for lesson in LESSONS.values()}
for number in (1, 2):
    archived = json.loads(Path(__file__).with_name(f"lesson-{number:02d}-v1.json").read_text())
    LESSON_VERSIONS[(archived["id"], 1)] = archived
LESSON = LESSON_VERSIONS[("lai.ai-you-can-use.l01", 1)]
LESSON_ID = LESSON["id"]
VERSION = LESSON["version"]
CONTENT_VERSION = "2026-10-05-draft.2"

def is_managed(activity):
    return activity.activity_type == "TYPE_CUSTOM" and isinstance(activity.content, dict) and "learningai" in activity.content

def supported(activity):
    return lesson_for(activity) is not None

def lesson_for(activity, attempt_version=None):
    if not is_managed(activity) or activity.activity_sub_type != "SUBTYPE_CUSTOM":
        return None
    definition = activity.content["learningai"]
    if not isinstance(definition, dict) or not isinstance(definition.get("lesson_id"), str):
        return None
    if type(definition.get("version")) is not int:
        return None
    lesson = LESSON_VERSIONS.get((definition["lesson_id"], definition["version"]))
    if lesson and type(definition.get("version")) is int and definition == {"lesson_id": lesson["id"], "version": lesson["version"], "content_version": CONTENT_VERSION}:
        return lesson if attempt_version is None else LESSON_VERSIONS.get((lesson["id"], attempt_version))
    return None

class ContractError(ValueError):
    pass

JS_WHITESPACE = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"

def text_units(value, trim=False):
    if not isinstance(value, str):
        raise ContractError("Invalid reflection")
    try:
        return len((value.strip(JS_WHITESPACE) if trim else value).encode("utf-16-le")) // 2
    except UnicodeEncodeError:
        raise ContractError("Invalid reflection text") from None

def validate(answers, page, complete=False, lesson=LESSON):
    if not isinstance(answers, dict) or type(page) is not int or not 0 <= page <= 3:
        raise ContractError("Invalid answers or page")
    activities = lesson["activities"] + [lesson["branchActivity"]]
    allowed = {a["id"]: {c["value"] for c in a["choices"]} for a in activities}
    text_id = lesson["transfer"]["id"]
    fields = {f["id"]: f for f in lesson.get("responseFields", [])}
    fields[text_id] = {"minLength": lesson["transfer"].get("minLength", 30), "maxLength": 2000}
    if set(answers) - set(allowed) - set(fields):
        raise ContractError("Unknown answer")
    for key, value in answers.items():
        if key in fields:
            if text_units(value) > fields[key]["maxLength"]:
                raise ContractError("Invalid reflection")
        elif not isinstance(value, str) or value not in allowed[key]:
            raise ContractError("Invalid choice")
    branch = lesson["branchActivity"]
    # Clear responses to a branch that is now hidden, matching SurveyJS.
    clean = dict(answers)
    first = clean.get(branch["visibleIfActivity"])
    visible = first is not None and first != branch["visibleIfNotEqual"]
    if not visible:
        clean.pop(branch["id"], None)
    if page > 0 and any(f.get("stage") == 0 and text_units(clean.get(k, ""), trim=True) < f["minLength"] for k, f in fields.items()):
        raise ContractError("Save your first attempt before continuing")
    if complete:
        required = [a["id"] for a in lesson["activities"]]
        if visible:
            required.append(branch["id"])
        if any(k not in clean for k in required) or any(text_units(clean.get(k, ""), trim=True) < f["minLength"] for k, f in fields.items()):
            raise ContractError("Required answers are missing")
    return clean

def transition(current, answers, page, revision, submit=False, lesson=LESSON):
    """Called only while the owning learner row is locked by the database."""
    if type(revision) is not int or revision < 0:
        raise ContractError("Invalid revision")
    clean = validate(answers, page, submit, lesson)
    if current["completed"]:
        if submit and clean == current["answers"]:
            return dict(current)  # retry after committed success
        raise ContractError("Completed work is immutable")
    if revision != current["revision"]:
        raise ContractError("Stale revision")
    return {"answers": clean, "page": page, "revision": revision + 1, "completed": submit}
