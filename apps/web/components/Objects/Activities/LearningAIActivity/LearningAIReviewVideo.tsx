'use client'
import React, { useState, useRef, useEffect } from 'react'

export type LearningAIReviewMedia = { src: string; captionsSrc: string; transcript: string[] }

/** Development-only supplement preview. Review assets are never bundled here. */
export default function LearningAIReviewVideo({ media }: { media: LearningAIReviewMedia }) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [captionFailed, setCaptionFailed] = useState(false)
  const track = useRef<HTMLTrackElement>(null)
  useEffect(() => {
    const element = track.current
    if (!element) return
    const failed = () => setCaptionFailed(true)
    element.addEventListener('error', failed)
    return () => element.removeEventListener('error', failed)
  }, [attempt])
  if (process.env.NODE_ENV !== 'development') return null
  return <aside aria-label="Review video supplement">
    <h2>AI impact: review-only video supplement</h2>
    <p>Illustrative AI-generated footage and synthetic narration. Human voice review is pending. This clip contains no measured local electricity or water data and does not replace the lesson exercise.</p>
    <video key={attempt} controls playsInline preload="metadata" aria-label="AI impact review video" style={{ width: '100%', maxWidth: '100%' }} onError={() => setFailed(true)}>
      <source src={media.src} type="video/mp4" onError={() => setFailed(true)} />
      <track ref={track} kind="captions" src={media.captionsSrc} srcLang="en" label="English" default onError={() => setCaptionFailed(true)} />
      Your browser cannot play this video. Read the transcript below.
    </video>
    {failed && <p role="status">The review video could not load. Read the transcript or <button onClick={() => { setFailed(false); setCaptionFailed(false); setAttempt(previous => previous + 1) }}>Retry video</button>.</p>}
    {captionFailed && <p role="status">Timed captions could not load. The transcript remains available below.</p>}
    <details><summary>Read the video transcript</summary>{media.transcript.map((line, index) => <p key={index}>{line}</p>)}</details>
  </aside>
}
