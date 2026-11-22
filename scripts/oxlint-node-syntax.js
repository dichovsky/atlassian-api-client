// CommonJS permits legacy literals even in .js files inside a CommonJS package.
export default {
  meta: { name: 'node-syntax' },
  rules: {
    'no-legacy-literal': {
      create(context) {
        return {
          Literal(node) {
            const raw = node.raw;
            const legacyNumber = typeof node.value === 'number' && /^0\d/.test(raw);
            // Pairs of escaped backslashes are literal text. A lone \0 is valid.
            const legacyEscape =
              typeof node.value === 'string' && /(?:^|[^\\])(?:\\\\)*\\(?:[1-9]|0\d)/.test(raw);
            if (legacyNumber || legacyEscape) {
              context.report({ node, message: 'Use a modern numeric literal or string escape.' });
            }
          },
        };
      },
    },
  },
};
