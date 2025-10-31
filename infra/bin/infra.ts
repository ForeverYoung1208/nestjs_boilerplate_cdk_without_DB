#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { execSync } from 'child_process';
import { AppStack, IAppStackConfig } from '../lib/infra-stack';

const app = new cdk.App();

// load config
const targetEnv = app.node.tryGetContext('targetEnv');

let config: IAppStackConfig;

switch (targetEnv) {
  case 'dev':
    config = require('../config.dev').config;
    break;
  case 'stage':
    config = require('../config.stage').config;
    break;
  case 'prod':
    config = require('../config.prod').config;
    break;
  default:
    throw new Error(
      'target targetEnv is not defined; use `npx cdk deploy --context targetEnv=dev` , where targetEnv= dev | stage | prod',
    );
}

// Build the application before deployment
console.log('Building application...');
try {
  execSync('npm run build', { cwd: '../', stdio: 'inherit' });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed!');
  process.exit(1);
}

new AppStack(app, `${config.projectName}Stack`, config, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});