import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function loadHelpers() {
  const source = fs.readFileSync(path.resolve('src/utils/blogRecipeMarkdown.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const module = { exports: {} };
  const context = vm.createContext({});
  const execute = vm.runInContext(`(function(require, module, exports) { ${outputText}\n })`, context);
  execute(() => ({}), module, module.exports);
  return module.exports;
}

const { generateRecipeMarkdown, parseRecipeMarkdown } = loadHelpers();

test('recipe markdown round-trips without losing servings, ingredients, steps, or tips', () => {
  const steps = [
    {
      id: 's1',
      stepNumber: 1,
      title: 'Sơ chế nấm',
      durationMinutes: 8,
      instruction: 'Rửa sạch nấm bào ngư và xé sợi vừa ăn.',
      tip: 'Vắt ráo nước để xào không bị ra nước.',
    },
    {
      id: 's2',
      stepNumber: 2,
      title: 'Kho tộ lửa nhỏ',
      durationMinutes: 15,
      instruction: 'Kho liu riu với nước tương và tiêu xanh.',
      tip: '',
    },
  ];
  const md = generateRecipeMarkdown('3-4 người', '23', '- 300g Nấm bào ngư\n- 2 muỗng Nước tương', steps);
  const parsed = parseRecipeMarkdown(md);

  assert.ok(parsed);
  assert.equal(parsed.servings, '3-4 người');
  assert.equal(parsed.cookTime, '23');
  assert.equal(parsed.ingredientsText, '- 300g Nấm bào ngư\n- 2 muỗng Nước tương');
  assert.equal(parsed.steps.length, 2);
  assert.equal(parsed.steps[0].title, 'Sơ chế nấm');
  assert.equal(parsed.steps[0].durationMinutes, 8);
  assert.equal(parsed.steps[0].tip, 'Vắt ráo nước để xào không bị ra nước.');
  assert.equal(parsed.steps[1].title, 'Kho tộ lửa nhỏ');
  assert.equal(parsed.steps[1].tip, '');
});

test('freeform kitchen prose returns null so editor keeps original text instead of overwriting with defaults', () => {
  const freeform = 'Hôm nay mình chia sẻ trải nghiệm nấu bún riêu chay bằng sữa đậu nành nguyên chất rất béo ngậy.';
  assert.equal(parseRecipeMarkdown(freeform), null);
});
