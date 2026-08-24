import { parseSegments } from './ai-segments';

describe('parseSegments', () => {
  it('parses a plain text reply as a single text segment', () => {
    const segments = parseSegments('Просто объяснение без JSON.');
    expect(segments).toEqual([{ kind: 'text', text: 'Просто объяснение без JSON.' }]);
  });

  it('parses mixed text and widget segments in strict order', () => {
    const reply = JSON.stringify({
      segments: [
        { kind: 'text', text: 'Сначала объяснение.' },
        {
          kind: 'widget',
          widget: {
            type: 'QUIZ',
            payload: { question: 'Чему равен sin(30)?', options: ['0.5', '1'], correctIndex: 0 },
          },
        },
        { kind: 'text', text: 'Теперь следующее.' },
      ],
    });
    const segments = parseSegments(reply);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ kind: 'text', text: 'Сначала объяснение.' });
    expect(segments[1].kind).toBe('widget');
    expect(segments[2]).toEqual({ kind: 'text', text: 'Теперь следующее.' });
  });

  it('drops invalid widgets but keeps text', () => {
    const reply = JSON.stringify({
      segments: [
        { kind: 'text', text: 'Валидный текст.' },
        { kind: 'widget', widget: { type: 'QUIZ', payload: { question: 'x', options: ['a'] } } }, // too few options
        { kind: 'widget', widget: { type: 'UNKNOWN', payload: {} } }, // unknown type
      ],
    });
    const segments = parseSegments(reply);
    expect(segments).toEqual([{ kind: 'text', text: 'Валидный текст.' }]);
  });

  it('caps widget count at 3', () => {
    const widgets = Array.from({ length: 5 }, (_, i) => ({
      kind: 'widget',
      widget: {
        type: 'QUIZ',
        payload: { question: `q${i}`, options: ['a', 'b'], correctIndex: 0 },
      },
    }));
    const reply = JSON.stringify({ segments: widgets });
    const segments = parseSegments(reply);
    const widgetSegments = segments.filter((segment) => segment.kind === 'widget');
    expect(widgetSegments).toHaveLength(3);
  });

  it('extracts JSON from reply wrapped in prose', () => {
    const reply = `Вот ответ:\n\`\`\`json\n${JSON.stringify({
      segments: [
        { kind: 'widget', widget: { type: 'FORMULA_CARD', payload: { title: 'Дискриминант', formula: 'D=b^2-4ac' } } },
      ],
    })}\n\`\`\``;
    const segments = parseSegments(reply);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe('widget');
  });

  it('falls back to plain text on invalid JSON', () => {
    const segments = parseSegments('{"segments": broken');
    expect(segments).toEqual([{ kind: 'text', text: '{"segments": broken' }]);
  });
});
