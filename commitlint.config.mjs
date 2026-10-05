export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        // 본문의 비어 있지 않은 줄 수가 최소 n줄인지 검사
        'body-min-lines': ({ body }, when = 'always', min = 2) => {
          const lines = (body ?? '').split('\n').filter((line) => line.trim() !== '');
          const valid = lines.length >= min;
          return [valid, `본문은 최소 ${min}줄 이상 작성해야 합니다 (현재 ${lines.length}줄)`];
        },
      },
    },
  ],
  rules: {
    // 제목 필수
    'subject-empty': [2, 'never'],
    // 본문 필수 + 최소 2줄
    'body-empty': [2, 'never'],
    'body-min-lines': [2, 'always', 2],
  },
};
