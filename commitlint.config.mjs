// Conventional Commits, as the backend: the commit-msg hook (lefthook.yml)
// checks each commit, CI (.github/workflows/ci.yml) the pull request's title,
// which the squash merge uses as main's commit subject.
export default {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: !process.env.GITHUB_ACTIONS,
  ignores: [(message) => message.startsWith('Revert "')],
  rules: {
    'subject-case': [0],
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
