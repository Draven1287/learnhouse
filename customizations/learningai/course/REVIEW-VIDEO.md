# Local review video supplement

The LearningAI player accepts an optional `activity.reviewMedia` object with `src`, `captionsSrc` and a `transcript` array. The supplement renders only when `NODE_ENV` is `development`; normal activities and production builds render no review video. No media files, media URLs or transcript content are bundled with this change.

For a private local review, serve the approved review MP4 and an English WebVTT sidecar from the same loopback origin and pass their relative paths and transcript to the activity. Convert SRT timestamp commas to periods and prepend `WEBVTT` without changing cue timing or words. The media server must support HTTP byte ranges for seeking; serve captions as `text/vtt`. This preview does not configure course uploads, storage permissions or production media delivery.

The native player has controls and inline playback, does not autoplay, and offers captions plus an expandable transcript. Missing video reports an error with Retry; missing timed captions reports the transcript fallback. The review label identifies illustrative AI-generated footage and synthetic narration, says human voice review is pending, and disclaims measured local electricity/water data. The video is a supplement, not a replacement for the lesson exercise or a completion requirement.

Before learner release, resolve human voice and content review, confirm the intended lesson placement, and use the existing authorized course-media/video/caption workflow. Verify hosted access, MIME/byte-range/CORS behavior, caption controls and synchronization, mobile playback, transcript access and authenticated acceptance. Do not publish review assets or remove the development gate as part of this preview.
