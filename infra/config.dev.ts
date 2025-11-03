import { IAppStackConfig } from './lib/app-stack';

// define project name (any) - will be used as part of naming for some resources like docker image, database, etc.
const projectShortName = 'boilerplate';

// define postfix for environment resources to specify
let suffix = '-dev';
const projectName = projectShortName + suffix;

// define your registered domain (you must have one at Route53)
const domainName = 'for-test.click';

// subdomain for api (will be created)
const subDomainNameApi = `api.${projectName}`;
const fullSubDomainNameApi = `${subDomainNameApi}.${domainName}`;

// user for deployment using CI/CD (will be created)
const userDeploerName = `${projectName}-deployer`;

const companyName = 'Some Test Company Inc';

console.info('using development config...');

export const config: IAppStackConfig = {
  domainName,
  projectName,
  fullSubDomainNameApi,
  userDeploerName,
  companyName,
  targetNodeEnv: 'development',
  // existingVpcId: 'vpc-0acfffd30c393ad19', // if set will be used, otherwise will be created
  // existingApiSGId: 'sg-06448216466b53b02', // if set will be used, otherwise will be created
  // existingBastionSGId: 'sg-05fee3b362dfc7e7b', // if set will be used, otherwise will be created
};
