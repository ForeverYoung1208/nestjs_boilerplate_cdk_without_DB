import { IAppStackConfig } from "./lib/infra-stack";

// define project name (any) - will be used as part of naming for some resources like docker image, database, etc.
const projectShortName = 'boilerplate';

// define postfix for environment resources to specify
let suffix = '-stage'
const projectName = projectShortName + suffix;

// define your registered domain (you must have one at Route53)
const domainName = 'for-test.click';

// subdomain for api (will be created)
const subDomainNameApi = `api.${projectName}`;
const fullSubDomainNameApi = `${subDomainNameApi}.${domainName}`;

// user for deployment using CI/CD (will be created)
const userDeploerName = `${projectName}-deployer`;

// database name
const databaseName = projectShortName + suffix.replace('-', ''); // DatabaseName must begin with a letter and contain only alphanumeric characters
const databaseUsername = 'postgres';
const companyName = 'Some Test Company Inc';

console.info('using staging config...')    

export const config: IAppStackConfig = {
  databaseName,
  domainName,
  projectName,
  fullSubDomainNameApi,
  userDeploerName,
  databaseUsername,
  companyName,
  targetNodeEnv: 'staging',
}