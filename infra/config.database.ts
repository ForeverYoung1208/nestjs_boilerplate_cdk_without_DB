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
  apiSecurityGroupId: 'sg-06448216466b53b02',
  bastionSecurityGroupId: 'sg-05fee3b362dfc7e7b',
  dbPasswordParameterName: '/boilerplate-dev/db-password',
  vpcId: 'vpc-0acfffd30c393ad19',
}