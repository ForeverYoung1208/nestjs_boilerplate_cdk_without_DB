import { IDBStackConfig } from "./lib/db-stack";

// define project name (any) - will be used as part of naming for some resources like docker image, database, etc.
const projectShortName = 'boilerplate';

const projectName = projectShortName

// database name
const databaseName = projectShortName+'Db'
const databaseUsername = 'postgres';

console.info('using database config...')    

export const config: IDBStackConfig = {
  databaseName,
  databaseUsername,
  projectName,
  apiSecurityGroupId: 'sg-0bb4dd29526889de0',
  bastionSecurityGroupId: 'sg-0fd80d120909a5f2f',
  dbPasswordParameterName: '/boilerplate-dev/db-password',
  vpcId: 'vpc-0891653e25003641d',
};