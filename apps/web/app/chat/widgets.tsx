'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

type WidgetPayload = Record<string, unknown>;

function normalizeAnswer(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[;,]+/g, ' ');
}

function QuizWidget({ payload }: { payload: WidgetPayload }) {
  const question = String(payload.question ?? '');
  const options = (payload.options as string[] | undefined) ?? [];
  const correctIndex = Number(payload.correctIndex ?? -1);
  const explanation = payload.explanation ? String(payload.explanation) : '';
  const [selected, setSelected] = useState<number | null>(null);

  const answered = selected !== null;
  const correct = selected === correctIndex;

  return (
    <div className="widget quiz">
      <div className="widget-question">{question}</div>
      <div className="widget-options">
        {options.map((option, index) => {
          let className = 'widget-option';
          if (answered) {
            if (index === correctIndex) className += ' correct';
            else if (index === selected) className += ' wrong';
          }
          return (
            <button
              key={index}
              className={className}
              disabled={answered}
              onClick={() => setSelected(index)}
            >
              <span className="widget-option-key">{String.fromCharCode(65 + index)}.</span>
              {option}
              {answered && index === correctIndex && <span className="widget-mark">✓</span>}
              {answered && index === selected && index !== correctIndex && <span className="widget-mark">✗</span>}
            </button>
          );
        })}
      </div>
      {answered && explanation && (
        <div className="widget-explanation">
          {correct ? 'Верно! ' : 'Неверно. '}
          {explanation}
        </div>
      )}
    </div>
  );
}

function MathExpressionWidget({ payload }: { payload: WidgetPayload }) {
  const prompt = String(payload.prompt ?? '');
  const expected = String(payload.expected ?? '');
  const explanation = payload.explanation ? String(payload.explanation) : '';
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  const check = () => {
    const correct =
      normalizeAnswer(value) === normalizeAnswer(expected) ||
      normalizeAnswer(value).replace(/^[a-zа-я]+\s*=\s*/, '') ===
        normalizeAnswer(expected).replace(/^[a-zа-я]+\s*=\s*/, '');
    setResult(correct ? 'correct' : 'wrong');
  };

  return (
    <div className="widget math">
      <div className="widget-question">{prompt}</div>
      <div className="widget-row">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setResult(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="Ваш ответ…"
        />
        <button onClick={check} disabled={!value.trim() || result !== null}>
          Проверить
        </button>
      </div>
      {result === 'correct' && <div className="widget-explanation ok">Верно! {explanation}</div>}
      {result === 'wrong' && <div className="widget-explanation bad">Неверно. {explanation}</div>}
    </div>
  );
}

function FormulaCardWidget({ payload }: { payload: WidgetPayload }) {
  const title = String(payload.title ?? '');
  const formula = String(payload.formula ?? '');
  const note = payload.note ? String(payload.note) : '';
  return (
    <div className="widget formula">
      {title && <div className="widget-title">{title}</div>}
      <div className="widget-formula">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {`$$${formula}$$`}
        </ReactMarkdown>
      </div>
      {note && <div className="widget-note">{note}</div>}
    </div>
  );
}

function StepByStepWidget({ payload }: { payload: WidgetPayload }) {
  const problem = String(payload.problem ?? '');
  const steps = (payload.steps as { title?: string; content?: string }[] | undefined) ?? [];
  const [revealed, setRevealed] = useState(1);

  return (
    <div className="widget steps">
      <div className="widget-question">Задача: {problem}</div>
      <div className="widget-steps">
        {steps.map((step, index) => {
          const visible = index < revealed;
          return (
            <div key={index} className={`widget-step ${visible ? '' : 'hidden'}`}>
              <div className="widget-step-head">
                <span className="widget-step-num">{index + 1}.</span>
                <span className="widget-step-title">{step.title ?? `Шаг ${index + 1}`}</span>
              </div>
              {visible && (
                <div className="widget-step-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {step.content ?? ''}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {revealed < steps.length && (
        <button className="widget-step-next" onClick={() => setRevealed((r) => r + 1)}>
          Показать шаг {revealed + 1}
        </button>
      )}
    </div>
  );
}

export type WidgetType = 'QUIZ' | 'MATH_EXPRESSION' | 'FORMULA_CARD' | 'STEP_BY_STEP';

export function WidgetRenderer({ type, payload }: { type: string; payload: WidgetPayload }) {
  switch (type) {
    case 'QUIZ':
      return <QuizWidget payload={payload} />;
    case 'MATH_EXPRESSION':
      return <MathExpressionWidget payload={payload} />;
    case 'FORMULA_CARD':
      return <FormulaCardWidget payload={payload} />;
    case 'STEP_BY_STEP':
      return <StepByStepWidget payload={payload} />;
    default:
      return null;
  }
}

/** Static demo widgets shown on the chat page so the team sees each type. */
export function WidgetExamples() {
  return (
    <div className="widget-examples">
      <h3>Примеры виджетов</h3>
      <p className="muted">Эти компоненты модель может вставить в ответ. Каждый появляется в своём месте в диалоге.</p>
      <WidgetRenderer
        type="QUIZ"
        payload={{
          question: 'Чему равен sin(30°)?',
          options: ['0.5', '√3/2', '1', '√2/2'],
          correctIndex: 0,
          explanation: 'sin(30°) = 1/2 = 0.5',
        }}
      />
      <WidgetRenderer
        type="MATH_EXPRESSION"
        payload={{ prompt: 'Реши уравнение 2x + 6 = 0 и введи x.', expected: 'x = -3', explanation: 'Переносим 6 и делим на 2.' }}
      />
      <WidgetRenderer
        type="FORMULA_CARD"
        payload={{ title: 'Квадратное уравнение', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', note: 'D = b² - 4ac' }}
      />
      <WidgetRenderer
        type="STEP_BY_STEP"
        payload={{
          problem: '3(x - 2) = 12',
          steps: [
            { title: 'Раскрываем скобки', content: '3x - 6 = 12' },
            { title: 'Переносим свободный член', content: '3x = 18' },
            { title: 'Делим на коэффициент', content: 'x = 6' },
          ],
        }}
      />
    </div>
  );
}
