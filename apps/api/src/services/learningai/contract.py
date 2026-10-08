"""Fixed first-lesson contract; no dependency on client definitions or scores."""
import json
from pathlib import Path

LESSON = json.loads(Path(__file__).with_name("lesson-01.json").read_text())
LESSON_ID = LESSON["id"]
VERSION = LESSON["version"]
CONTENT_VERSION = "2026-10-05-draft.2"

def is_managed(activity):
    return activity.activity_type == "TYPE_CUSTOM" and isinstance(activity.content, dict) and "learningai" in activity.content

def supported(activity):
    return is_managed(activity) and activity.activity_sub_type == "SUBTYPE_CUSTOM" and isinstance(activity.content["learningai"], dict) and type(activity.content["learningai"].get("version")) is int and activity.content["learningai"] == {"lesson_id": LESSON_ID, "version": VERSION, "content_version": CONTENT_VERSION}

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

def validate(answers, page, complete=False):
    if not isinstance(answers, dict) or type(page) is not int or not 0 <= page <= 3:
        raise ContractError("Invalid answers or page")
    activities = LESSON["activities"] + [LESSON["branchActivity"]]
    allowed = {a["id"]: {c["value"] for c in a["choices"]} for a in activities}
    text_id = LESSON["transfer"]["id"]
    if set(answers) - set(allowed) - {text_id}:
        raise ContractError("Unknown answer")
    for key, value in answers.items():
        if key == text_id:
            if text_units(value) > 2000:
                raise ContractError("Invalid reflection")
        elif not isinstance(value, str) or value not in allowed[key]:
            raise ContractError("Invalid choice")
    branch = LESSON["branchActivity"]
    # Clear responses to a branch that is now hidden, matching SurveyJS.
    clean = dict(answers)
    first = clean.get(branch["visibleIfActivity"])
    visible = first is not None and first != branch["visibleIfNotEqual"]
    if not visible:
        clean.pop(branch["id"], None)
    if complete:
        required = [a["id"] for a in LESSON["activities"]]
        if visible:
            required.append(branch["id"])
        if any(k not in clean for k in required) or text_units(clean.get(text_id, ""), trim=True) < 30:
            raise ContractError("Required answers are missing")
    return clean

def transition(current, answers, page, revision, submit=False):
    """Called only while the owning learner row is locked by the database."""
    if type(revision) is not int or revision < 0:
        raise ContractError("Invalid revision")
    clean = validate(answers, page, submit)
    if current["completed"]:
        if submit and clean == current["answers"]:
            return dict(current)  # retry after committed success
        raise ContractError("Completed work is immutable")
    if revision != current["revision"]:
        raise ContractError("Stale revision")
    return {"answers": clean, "page": page, "revision": revision + 1, "completed": submit}
