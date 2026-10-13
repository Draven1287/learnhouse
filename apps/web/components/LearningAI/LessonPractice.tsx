import type {
  Lesson,
  ResponseField,
} from '@components/Objects/Activities/LearningAIActivity/LearningAIActivity'

export function PracticeResponse({
  field,
  value,
  disabled,
  answer,
}: {
  field: ResponseField
  value: string
  disabled: boolean
  answer: (_id: string, _value: string) => void
}) {
  return (
    <div className="practice-response">
      <label className="field-lbl" htmlFor={field.id}>
        {field.prompt}
      </label>
      <textarea
        id={field.id}
        required
        maxLength={field.maxLength}
        rows={5}
        disabled={disabled}
        value={value}
        aria-describedby={`${field.id}-criteria`}
        onChange={(event) => answer(field.id, event.target.value)}
      />
      <div id={`${field.id}-criteria`} className="integration-status">
        <ul>
          {field.criteria.map((criterion) => (
            <li key={criterion}>{criterion}</li>
          ))}
        </ul>
        <p>
          Use fictional details. A response is required; its quality is for you
          or an educator to review. Maximum 2,000 characters.
        </p>
      </div>
    </div>
  )
}

export function PredictionTable({ lesson }: { lesson: Lesson }) {
  const table = lesson.teaching?.predictionTable
  if (!table) return null
  return (
    <div className="prediction-evidence">
      <p>{table.context}</p>
      <table>
        <caption>{table.caption}</caption>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]}>
              <th scope="row">{row[0]}</th>
              {row.slice(1).map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
