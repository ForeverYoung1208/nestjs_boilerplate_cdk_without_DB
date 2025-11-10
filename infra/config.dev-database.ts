import { IDBStackConfig } from './lib/db-stack';

// define project name (any) - will be used as part of naming for some resources like docker image, database, etc.
const projectShortName = 'boilerplateNEW';
const envSuffix = '-dev';

const projectNameWithEnv = `${projectShortName}${envSuffix}`;

// database name
const databaseNameWithEnv = `${projectShortName}${envSuffix.charAt(1).toUpperCase()}${envSuffix.slice(2)}`;

const databaseUsername = 'postgres';

console.info('using dev database config...');

export const config: IDBStackConfig = {
  databaseNameWithEnv,
  databaseUsername,
  projectNameWithEnv,
  apiSecurityGroupId: 'sg-01986bfc474520aca', // get from app stack output
  bastionSecurityGroupId: 'sg-09e1d78ad30d25b93', // get from app stack output
  dbPasswordParameterName: '/boilerplateNEW-dev/db-password', // get from app stack output
  vpcId: 'vpc-090132e4bfea67f0f', // get from app stack output
};
