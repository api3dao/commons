import { sleep } from '../utils';

import { runTask } from '.';

describe(runTask.name, () => {
  it('should run the task', async () => {
    await runTask(
      () => {
        console.info('Hello');
      },
      { timeoutMs: 2000 }
    );

    expect(true).toBe(true);
  });

  it('works for nested tasks', async () => {
    let fail = true;
    await runTask(
      async () => {
        await runTask(
          async () => {
            await sleep(50);
            // eslint-disable-next-line jest/no-conditional-in-test
            if (fail) {
              fail = false;
              console.info('Child fail');
              throw new Error('Failed');
            }
            console.info('Child success');
          },
          { name: 'child' }
        );
      },
      { timeoutMs: 2000, name: 'parent' }
    );

    expect(true).toBe(true);
  });
});
