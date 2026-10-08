# Learning AI progress event contract v1

The player dispatches a same-window `CustomEvent('learningai:progress', {detail: event})` after initialization, answer changes, page changes, and completion. Consumers must attach before app.js initializes to receive started/resumed. Events are not sent anywhere. No iframe communication is implied.

```json
{
  "schemaVersion": 1,
  "eventId": "random UUID",
  "lessonId": "lai.message-to-judgment",
  "lessonVersion": 1,
  "activityId": "route",
  "attemptId": "random UUID per attempt",
  "type": "answered",
  "timestamp": "ISO-8601 UTC",
  "payload": {"answered": true, "correct": true}
}
```

- `started`, `resumed`: activityId null, empty payload. Reload emits resumed, not another completed event.
- `answered`: stable question ID; payload includes `answered` boolean and `correct` only for questions with a defined correctAnswer. Free-text answer contents are intentionally omitted from the event payload. A cleared conditional answer may emit answered:false.
- `page_changed`: activityId null; payload `{page: stablePageName}`.
- `completed`: activityId null; payload `{score:0..2,maxScore:2,reflectionSubmitted:boolean}`. Only route and verdict contribute to comparable core score. Completion means all required items on the selected path were submitted, not mastery or graded writing.
- Retry/restart removes the current local record and creates a fresh attemptId and started event. There is no durable reset history.

Local record key: `learningai:progress:v1:<lessonId>:<lessonVersion>`. Record contains lessonVersion, attemptId, answers (including practice reflection), page, completed, and the last 100 events. This is a bounded diagnostic buffer, not a durable delivery queue or analytics store. No student identifier is collected.

Future server adapter: validate IDs, allowed answers, versions, timestamp format and event shape; deduplicate on eventId; associate identity on the server; enforce authorization and recompute scores. Treat client data as untrusted. Define offline/retry delivery, conflict resolution and retention independently. If converting to xAPI, use a tested adapter and real activity IRIs and actor handling; this contract is not itself xAPI.
