/**
 * Built-in example .castscript files bundled at build time by Vite.
 * The @examples alias resolves to packages/core/examples/ via vite.config.ts.
 * The ?raw suffix imports the file content as a plain string.
 */

import helloWorld from '@examples/hello-world.castscript?raw';
import gitWorkflow from '@examples/git-workflow.castscript?raw';
import styledOutput from '@examples/styled-output.castscript?raw';
import interactive from '@examples/interactive.castscript?raw';
import forgeDeploy from '@examples/forge-deploy.castscript?raw';
import advanced from '@examples/advanced.castscript?raw';

export interface Example {
  name: string;
  description: string;
  script: string;
}

export const EXAMPLES: Example[] = [
  {
    name: 'Hello World',
    description: 'The simplest possible castscript',
    script: helloWorld,
  },
  {
    name: 'Git Workflow',
    description: 'git init, add, commit, push with markers',
    script: gitWorkflow,
  },
  {
    name: 'Styled Output',
    description: 'All inline colour and style tags',
    script: styledOutput,
  },
  {
    name: 'Interactive',
    description: 'SSH login, password entry, type: and hidden:',
    script: interactive,
  },
  {
    name: 'Forge Deploy',
    description: 'Full Forge app build, deploy and install flow',
    script: forgeDeploy,
  },
  {
    name: 'Advanced',
    description: 'raw:, set: mid-script, and include:#block',
    script: advanced,
  },
];
