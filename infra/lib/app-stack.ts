import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Construct } from 'constructs';

export interface IAppStackConfig {
  domainName: string;
  projectNameWithEnv: string;
  fullSubDomainNameApi: string;
  userDeploerName: string;
  companyName: string;
  targetNodeEnv: string;
  existingVpcId?: string;
  existingApiSGId?: string;
  existingBastionSGId?: string;
  existingAlbSGId?: string;
}

export class AppStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    config: IAppStackConfig,
    props?: cdk.StackProps,
  ) {
    super(scope, id, props);

    const {
      domainName,
      projectNameWithEnv,
      fullSubDomainNameApi,
      userDeploerName,
      companyName,
      targetNodeEnv,
      existingVpcId,
      existingApiSGId,
      existingBastionSGId,
      existingAlbSGId,
    } = config;

    /**
     *
     *
     *
     * COMMON
     *
     *
     *
     */

    // Add tag for cost tracking
    cdk.Tags.of(this).add('AppManagerCFNStackKey', this.stackName);

    // Create secrets

    const apiKeySecretValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');
    const apiKeySSMParameter = new ssm.StringParameter(
      this,
      `${projectNameWithEnv}ApiKeyParameter`,
      {
        parameterName: `/${projectNameWithEnv}/api-key`,
        stringValue: apiKeySecretValue,
        description: `API key for the ${projectNameWithEnv} application`,
      },
    );

    const dbPasswordSSMParameterName = `/${projectNameWithEnv}/db-password`;
    let dbPasswordSSMParameter: ssm.IStringParameter;

    try {
      dbPasswordSSMParameter =
        ssm.StringParameter.fromSecureStringParameterAttributes(
          this,
          `${projectNameWithEnv}DbPasswordParameter`,
          {
            parameterName: dbPasswordSSMParameterName,
            // If you need to specify the version
            // version: 1
          },
        );
    } catch (e) {
      // Create new security group if lookup fails or no ID provided
      dbPasswordSSMParameter = new ssm.StringParameter(
        this,
        `${projectNameWithEnv}DbPasswordParameter`,
        {
          parameterName: dbPasswordSSMParameterName,
          stringValue: 'place-here-db-password', // This will be used if parameter doesn't exist
          description: `Database password for ${projectNameWithEnv}`,
        },
      );
      dbPasswordSSMParameter.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
    }

    const mailPasswordSSMParameter = new ssm.StringParameter(
      this,
      `${projectNameWithEnv}MailPasswordParameter`,
      {
        parameterName: `/${projectNameWithEnv}/mail-password`,
        stringValue: 'place-here-mail-password',
        description: `Mail password for the ${projectNameWithEnv} application`,
      },
    );

    /**
     *
     *
     *
     * NETWORKS
     *
     *
     *
     */

    // VPC
    let vpc: ec2.IVpc;
    try {
      // Try to look up existing VPC
      if (!existingVpcId) {
        throw new Error(
          'No existing VPC ID provided, proceed to create new VPC',
        );
      }
      vpc = ec2.Vpc.fromLookup(this, `${projectNameWithEnv}Vpc`, {
        vpcId: existingVpcId,
      });
    } catch (e) {
      // Create new VPC if it doesn't exist
      const newVpc = new ec2.Vpc(this, `${projectNameWithEnv}VPC`, {
        ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
        maxAzs: 2, // Need 2 AZs for Aurora
        natGateways: 0,
        subnetConfiguration: [
          {
            cidrMask: 24,
            name: 'Public',
            subnetType: ec2.SubnetType.PUBLIC,
          },
          {
            cidrMask: 23,
            name: 'Private',
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          },
        ],
      });

      // Apply RETAIN policy to all subnets and vpc
      newVpc.publicSubnets.forEach((subnet) => {
        (subnet.node.defaultChild as ec2.CfnSubnet).applyRemovalPolicy(
          cdk.RemovalPolicy.RETAIN,
        );
      });

      newVpc.isolatedSubnets.forEach((subnet) => {
        (subnet.node.defaultChild as ec2.CfnSubnet).applyRemovalPolicy(
          cdk.RemovalPolicy.RETAIN,
        );
      });
      newVpc.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
      vpc = newVpc;
    }

    //Lookup the zone based on domain name
    const zone = route53.HostedZone.fromLookup(
      this,
      `${projectNameWithEnv}Zone`,
      {
        domainName: domainName,
      },
    );

    // ACM Certificate
    const certificate = new certificatemanager.Certificate(
      this,
      `${projectNameWithEnv}Certificate`,
      {
        domainName: fullSubDomainNameApi,
        validation: certificatemanager.CertificateValidation.fromDns(zone),
      },
    );

    let apiSecurityGroup: ec2.ISecurityGroup;
    try {
      if (existingApiSGId) {
        apiSecurityGroup = ec2.SecurityGroup.fromLookupById(
          this,
          `${projectNameWithEnv}ApiSecurityGroup`,
          existingApiSGId,
        );
      } else {
        throw new Error(
          'No existing security group ID provided, proceed to create new security group',
        );
      }
    } catch (e) {
      // Create new security group if lookup fails or no ID provided
      const newSg = new ec2.SecurityGroup(
        this,
        `${projectNameWithEnv}ApiSecurityGroup`,
        {
          vpc,
          description: `Security group for API ${projectNameWithEnv}`,
          allowAllOutbound: true,
        },
      );
      newSg.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
      apiSecurityGroup = newSg;
    }

    let albSecurityGroup: ec2.ISecurityGroup;
    try {
      if (existingAlbSGId) {
        albSecurityGroup = ec2.SecurityGroup.fromLookupById(
          this,
          `${projectNameWithEnv}AlbSecurityGroup`,
          existingAlbSGId,
        );
      } else {
        throw new Error(
          'No existing security group ID provided, proceed to create new security group',
        );
      }
    } catch (e) {
      // Create new security group if lookup fails or no ID provided
      albSecurityGroup = new ec2.SecurityGroup(
        this,
        `${projectNameWithEnv}AlbSecurityGroup`,
        {
          vpc,
          description: `Security group for API ALB ${projectNameWithEnv}`,
          allowAllOutbound: true,
        },
      );
      albSecurityGroup.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
    }

    apiSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSecurityGroup.securityGroupId),
      ec2.Port.tcp(3000),
      'Allow traffic from ALB',
    );

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS',
    );

    // VVV todo: remove after debugging - leave connection possibility only through bastion (uncomment if want to have direct access)
    apiSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow ssh',
    );
    // ^^^

    /**
     *
     *
     *
     *  QUEUE
     *
     *
     *
     */

    // ElastiCache Redis
    const redisSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectNameWithEnv}RedisSG`,
      {
        vpc,
        allowAllOutbound: true,
      },
    );
    // Add security group rule to allow Redis access
    redisSecurityGroup.addIngressRule(
      apiSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis access from API',
    );

    // Redis parameter group with noeviction policy
    const redisParameterGroup = new elasticache.CfnParameterGroup(
      this,
      `${projectNameWithEnv}RedisParameterGroup`,
      {
        cacheParameterGroupFamily: 'redis7',
        description: `Redis parameter group for queue system ${projectNameWithEnv}`,
        properties: {
          'maxmemory-policy': 'noeviction', // noeviction - Redis will return errors instead of evicting data when memory is full
        },
      },
    );

    // Get appropriate subnets for Redis
    const redisSubnets =
      vpc.isolatedSubnets.length > 0
        ? vpc.isolatedSubnets
        : vpc.privateSubnets.length > 0
          ? vpc.privateSubnets
          : vpc.publicSubnets;

    const redis = new elasticache.CfnCacheCluster(
      this,
      `${projectNameWithEnv}RedisCluster`,
      {
        cacheNodeType: 'cache.t3.micro',
        engine: 'redis',
        engineVersion: '7.0',
        numCacheNodes: 1,
        cacheParameterGroupName: redisParameterGroup.ref,
        vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
        cacheSubnetGroupName: new elasticache.CfnSubnetGroup(
          this,
          `${projectNameWithEnv}RedisSubnetGroup`,
          {
            description: `Subnet group for Redis cluster ${projectNameWithEnv}`,
            subnetIds: redisSubnets.map((subnet) => subnet.subnetId),
          },
        ).ref,
      },
    );

    /**
     *
     *
     *
     * API
     *
     *
     *
     */

    // Create an S3 bucket to use while deploying with GA workflows using elastic beanstalk

    const ebAppBucket = new s3.Bucket(this, 'ElasticBeanstalkAppBucket', {
      bucketName: `${projectNameWithEnv.toLowerCase()}-eb-artifacts`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create an S3 asset for CDK to manage application code

    const appAsset = new s3assets.Asset(this, `${projectNameWithEnv}ApiAsset`, {
      path: '../', // Point to parent directory
      exclude: [
        '.git',
        '.github',
        '.vscode',
        'docker',
        'infra', // exclude CDK infrastructure code
        'src',
        'test',
        '.env*',
        '**/*.spec.ts',
        'node_modules',
        // add any other files/folders you want to exclude
      ],
    });

    // Create IAM role for EC2 instances
    const ebInstanceRole = new iam.Role(
      this,
      `${projectNameWithEnv}EBInstanceRole`,
      {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'AWSElasticBeanstalkWebTier',
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'AWSElasticBeanstalkWorkerTier',
          ),
        ],
      },
    );

    // Add Secrets Manager permissions
    ebInstanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:*`],
      }),
    );
    ebInstanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ec2:DescribeSubnets',
          'ec2:DescribeVpcs',
          'ec2:DescribeSecurityGroups',
          's3:GetObjectAcl',
          's3:PutObjectAcl',
        ],
        resources: ['*'],
      }),
    );

    // Create instance profile
    const ebInstanceProfile = new iam.CfnInstanceProfile(
      this,
      `${projectNameWithEnv}EBInstanceProfile`,
      {
        roles: [ebInstanceRole.roleName],
      },
    );

    // Create Elastic Beanstalk application
    const app = new elasticbeanstalk.CfnApplication(
      this,
      `${projectNameWithEnv}Application`,
      {
        applicationName: `${projectNameWithEnv}-application`,
      },
    );
    if (!app.applicationName) {
      throw new Error('app.applicationName is undefined');
    }

    const versionLabel = this.createApplicationVersion(
      app,
      `${projectNameWithEnv}AppVersion`,
      appAsset,
    );

    // Create SSM parameters with mock values
    const dbHostParam = new ssm.StringParameter(this, 'DbHostParam', {
      parameterName: `/${projectNameWithEnv}/db/host`,
      stringValue: 'localhost',
    });

    const dbPortParam = new ssm.StringParameter(this, 'DbPortParam', {
      parameterName: `/${projectNameWithEnv}/db/port`,
      stringValue: '5432',
    });

    const dbNameParam = new ssm.StringParameter(this, 'DbNameParam', {
      parameterName: `/${projectNameWithEnv}/db/name`,
      stringValue: 'mydb',
    });

    const dbUsernameParam = new ssm.StringParameter(this, 'DbUsernameParam', {
      parameterName: `/${projectNameWithEnv}/db/username`,
      stringValue: 'postgres',
    });

    const envVars = [
      ...this.createEnvironmentVariables({
        NODE_ENV: targetNodeEnv,
        PORT: '3000',
        SITE_ORIGIN: `https://${fullSubDomainNameApi}`,
        REDIS_HOST: redis.attrRedisEndpointAddress,
        REDIS_PORT: redis.attrRedisEndpointPort,
        TYPEORM_LOGGING: 'false',
        MAILER_TRANSPORT: 'smtp',
        MAIL_HOST: 'smtp-pulse.com',
        MAIL_PORT: '2525',
        MAIL_ENCRYPTION: 'false',
        MAIL_TLS: 'true',
        MAIL_USERNAME: 'siafin2010@gmail.com',
        MAIL_FROM_EMAIL: 'ihor.shcherbyna@clockwise.software',
        COMPANY_NAME: companyName,
        PROJECT_NAME: projectNameWithEnv,
      }),

      {
        namespace: 'aws:elasticbeanstalk:application:environmentsecrets',
        optionName: 'DB_HOST',
        value: dbHostParam.parameterArn,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environmentsecrets',
        optionName: 'DB_PORT',
        value: dbPortParam.parameterArn,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environmentsecrets',
        optionName: 'DB_DATABASE',
        value: dbNameParam.parameterArn,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environmentsecrets',
        optionName: 'DB_USERNAME',
        value: dbUsernameParam.parameterArn,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environmentsecrets',
        optionName: 'API_KEY',
        value: apiKeySSMParameter.parameterArn,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environmentsecrets',
        optionName: 'MAIL_PASSWORD',
        value: mailPasswordSSMParameter.parameterArn,
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environmentsecrets',
        optionName: 'DB_PASSWORD',
        value: dbPasswordSSMParameter.parameterArn,
      },
    ];

    const keyPairApi = new ec2.CfnKeyPair(
      this,
      `${projectNameWithEnv}ApiKeyPair`,
      {
        keyName: `${projectNameWithEnv}-api-key`,
      },
    );

    const apiEnvironment = new elasticbeanstalk.CfnEnvironment(
      this,
      `${projectNameWithEnv}ApiEnvironment`,
      {
        environmentName: `${projectNameWithEnv}-Api-Environment`,
        applicationName: app.applicationName,
        tier: {
          name: 'WebServer',
          type: 'Standard',
        },
        solutionStackName: '64bit Amazon Linux 2023 v6.6.0 running Node.js 22', // Choose appropriate platform
        optionSettings: [
          {
            namespace: 'aws:ec2:vpc',
            optionName: 'VPCId',
            value: vpc.vpcId,
          },
          {
            namespace: 'aws:autoscaling:launchconfiguration',
            optionName: 'IamInstanceProfile',
            value: ebInstanceProfile.attrArn,
          },
          {
            namespace: 'aws:ec2:instances',
            optionName: 'InstanceTypes',
            value: 't3.medium', // todo: reduce after debugging
          },
          {
            namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
            optionName: 'StreamLogs',
            value: 'true',
          },
          {
            namespace: 'aws:elasticbeanstalk:cloudwatch:logs:health',
            optionName: 'HealthStreamingEnabled',
            value: 'true',
          },
          {
            namespace: 'aws:autoscaling:launchconfiguration',
            optionName: 'EC2KeyName',
            value: keyPairApi.keyName,
          },
          {
            namespace: 'aws:ec2:vpc',
            optionName: 'Subnets',
            value: vpc.publicSubnets.map((subnet) => subnet.subnetId).join(','),
          },
          {
            namespace: 'aws:elbv2:loadbalancer',
            optionName: 'SecurityGroups',
            value: albSecurityGroup.securityGroupId,
          },
          {
            namespace: 'aws:elasticbeanstalk:environment',
            optionName: 'EnvironmentType',
            value: 'LoadBalanced',
          },
          {
            namespace: 'aws:autoscaling:asg',
            optionName: 'MinSize',
            value: '1',
          },
          {
            namespace: 'aws:autoscaling:asg',
            optionName: 'MaxSize',
            value: '2', // Increased to allow for replacement during updates
          },
          {
            namespace: 'aws:elasticbeanstalk:environment',
            optionName: 'LoadBalancerType',
            value: 'application',
          },
          {
            namespace: 'aws:elasticbeanstalk:environment:process:default',
            optionName: 'Port',
            value: '3000',
          },
          {
            namespace: 'aws:elasticbeanstalk:environment:process:default',
            optionName: 'Protocol',
            value: 'HTTP',
          },
          {
            namespace: 'aws:elbv2:listener:443',
            optionName: 'Protocol',
            value: 'HTTPS',
          },
          // Redirect HTTP to HTTPS
          {
            namespace: 'aws:elbv2:listener:default',
            optionName: 'ListenerEnabled',
            value: 'false',
          },
          {
            namespace: 'aws:elbv2:listener:443',
            optionName: 'SSLCertificateArns',
            value: certificate.certificateArn,
          },
          {
            namespace: 'aws:autoscaling:launchconfiguration',
            optionName: 'SecurityGroups',
            value: apiSecurityGroup.securityGroupId,
          },
          {
            namespace: 'aws:elasticbeanstalk:environment:process:default',
            optionName: 'HealthCheckPath',
            value: '/',
          },
          {
            namespace: 'aws:elasticbeanstalk:environment:process:default',
            optionName: 'HealthCheckInterval',
            value: '15',
          },
          {
            namespace: 'aws:elasticbeanstalk:environment:process:default',
            optionName: 'HealthyThresholdCount',
            value: '2',
          },
          {
            namespace: 'aws:elasticbeanstalk:environment:process:default',
            optionName: 'UnhealthyThresholdCount',
            value: '10',
          },
          ...envVars,
        ],
        versionLabel,
      },
    );

    /**
     *
     *
     *
     * Bastion instance for debugging purposes
     *
     *
     *
     */

    let bastionSecurityGroup: ec2.ISecurityGroup;
    try {
      if (existingBastionSGId) {
        bastionSecurityGroup = ec2.SecurityGroup.fromLookupById(
          this,
          `${projectNameWithEnv}BastionSecurityGroup`,
          existingBastionSGId,
        );
      } else {
        throw new Error('No existing bastion security group ID provided');
      }
    } catch (e) {
      // Create new security group if lookup fails or no ID provided
      const newSg = new ec2.SecurityGroup(
        this,
        `${projectNameWithEnv}BastionSecurityGroup`,
        {
          vpc,
          description: `Security group for Bastion Host ${projectNameWithEnv}`,
          allowAllOutbound: true,
        },
      );
      newSg.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
      bastionSecurityGroup = newSg;
    }

    // Allow SSH access
    bastionSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH',
    );

    const keyPair = new ec2.CfnKeyPair(
      this,
      `${projectNameWithEnv}BastionKeyPair`,
      {
        keyName: `${projectNameWithEnv}-bastion-key`,
      },
    );

    // Create bastion host
    const bastion = new ec2.Instance(this, `${projectNameWithEnv}BastionHost`, {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: bastionSecurityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.NANO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      keyPair: ec2.KeyPair.fromKeyPairName(
        this,
        'BastionKeyPairReference',
        keyPair.keyName,
      ),
    });

    // Allow bastion to access Redis
    redisSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis access from Bastion',
    );

    // Allow bastion to access Api
    apiSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(22),
      'Allow SSH access from Bastion to API',
    );

    /**
     *
     *
     *
     * Finalize access and dependancies
     *
     *
     *
     */

    const apiAlias = new route53.CnameRecord(
      this,
      `${projectNameWithEnv}ApiAlias`,
      {
        zone,
        recordName: fullSubDomainNameApi,
        domainName: apiEnvironment.attrEndpointUrl,
      },
    );

    apiAlias.node.addDependency(apiEnvironment);

    // Only add dependencies if they are not imported resources
    if (apiSecurityGroup instanceof ec2.SecurityGroup) {
      // Only true for newly created security groups
      apiEnvironment.addDependency(
        apiSecurityGroup.node.defaultChild as cdk.CfnResource,
      );
    }
    if (vpc instanceof ec2.Vpc) {
      // Only true for newly created VPCs
      apiEnvironment.addDependency(vpc.node.defaultChild as cdk.CfnResource);
    }

    // Add IAM user to deploy code
    const userDeploer = new iam.User(this, `${projectNameWithEnv}Deployer`, {
      userName: userDeploerName,
    });

    // user policy to deploy code
    userDeploer.attachInlinePolicy(
      new iam.Policy(this, `${projectNameWithEnv}DeployerPolicy`, {
        policyName: `publish-to-${projectNameWithEnv}`,
        statements: [
          new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:ssm:${this.region}:${this.account}:parameter/${projectNameWithEnv}*`,
            ],
          }),

          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:*'],
            resources: [
              `arn:aws:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}`,
              `arn:aws:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}/*`,
            ],
          }),

          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['iam:PassRole', 'sts:AssumeRole'],
            resources: [
              `arn:aws:iam::${this.account}:role/cdk-hnb659fds-deploy-role-${this.account}-${this.region}`,
              `arn:aws:iam::${this.account}:role/cdk-hnb659fds-file-publishing-role-${this.account}-${this.region}`,
            ],
          }),

          new iam.PolicyStatement({
            actions: [
              's3:PutObject',
              's3:GetObject',
              's3:ListBucket',
              's3:DeleteObject',
            ],
            resources: [
              `arn:aws:s3:::${projectNameWithEnv.toLowerCase()}-eb-artifacts`,
              `arn:aws:s3:::${projectNameWithEnv.toLowerCase()}-eb-artifacts/*`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              's3:CreateBucket',
              's3:Get*',
              's3:ListBucket',
              's3:PutObject',
              's3:PutObjectAcl',
              's3:DeleteObject',
              's3:PutBucketVersioning',
            ],
            resources: [
              `arn:aws:s3:::elasticbeanstalk-${this.region}-${this.account}`,
              `arn:aws:s3:::elasticbeanstalk-${this.region}-${this.account}/*`,
            ],
          }),

          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'elasticbeanstalk:CreateApplicationVersion',
              'elasticbeanstalk:UpdateEnvironment',
            ],
            resources: [
              `arn:aws:elasticbeanstalk:${this.region}:${this.account}:application/${projectNameWithEnv}-application`,
              `arn:aws:elasticbeanstalk:${this.region}:${this.account}:applicationversion/${projectNameWithEnv}-application/*`,
              `arn:aws:elasticbeanstalk:${this.region}:${this.account}:environment/${projectNameWithEnv}-application/${projectNameWithEnv}*`,
            ],
          }),
          new iam.PolicyStatement({
            actions: [
              'cloudformation:Describe*',
              'cloudformation:Get*',
              'cloudformation:List*',
              'cloudformation:TagResource',
              'cloudformation:ValidateTemplate',
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*'], // EB creates stacks with unpredictable names
          }),
          // EC2 permissions for EB environment management
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ec2:Describe*'],
            resources: ['*'],
          }),

          // Auto Scaling permissions
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'autoscaling:Describe*',
              'autoscaling:SuspendProcesses',
              'autoscaling:ResumeProcesses',
              'autoscaling:UpdateAutoScalingGroup',
            ],
            resources: ['*'],
          }),
          // CloudWatch Logs permissions
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:*'],
            resources: ['*'],
          }),
        ],
      }),
    );

    /**
     *
     *
     *
     *  Outputs
     *
     *
     *
     */
    // Bastion's public IP to connect
    new cdk.CfnOutput(this, 'BastionPublicIP', {
      value: bastion.instancePublicIp,
    });

    // Output just the key name instead of trying to get the private key
    new cdk.CfnOutput(this, 'BastionSSHKeyOutput', {
      value: keyPair.keyName,
      description:
        'Key pair name for SSH access to bastion host. Get the private key from SSM Parameter Store.',
    });
    new cdk.CfnOutput(this, 'ApiSSHKeyOutput', {
      value: keyPairApi.keyName,
      description:
        'Key pair name for SSH access to bastion host. Get the private key from SSM Parameter Store.',
    });

    // Add output for the command to retrieve the private key
    new cdk.CfnOutput(this, 'SSHKeyCommand', {
      value: `aws ssm get-parameter --name /ec2/keypair/${keyPair.getAtt('KeyPairId')} --with-decryption --query Parameter.Value --output text`,
      description: 'Command to get the private key from SSM Parameter Store',
    });

    new cdk.CfnOutput(this, 'ApiInstanceAddress', {
      value: apiEnvironment.attrEndpointUrl,
      description: 'IP(case single instance)/URL(case ALB) of the API instance',
    });

    new cdk.CfnOutput(this, 'ApiInstancePublicDNS', {
      value: `aws ec2 describe-instances --filters "Name=tag:elasticbeanstalk:environment-name,Values=${apiEnvironment.environmentName}" "Name=instance-state-name,Values=running" --query "Reservations[0].Instances[0].PublicDnsName" --output text`,
      description: 'Command to get API instance public DNS for SSH access',
    });

    // Outputs for connecting via Bastion
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redis.attrRedisEndpointAddress,
      description: 'Redis cluster endpoint address',
    });
    new cdk.CfnOutput(this, 'RedisPort', {
      value: redis.attrRedisEndpointPort,
      description: 'Redis cluster port',
    });

    new cdk.CfnOutput(this, 'ElasticBeanstalkAppBucketName', {
      value: ebAppBucket.bucketName,
      description: 'App bucket to use with elastic beanstalk deployments',
    });

    new cdk.CfnOutput(this, 'ApplicationName', {
      value: app.applicationName,
      description: 'ApplicationName',
    });

    new cdk.CfnOutput(this, 'ApiEnvironmentName', {
      value: apiEnvironment.environmentName || 'undefined - Error!',
      description: 'ApiEnvironmentName',
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID - used in DB stack',
    });

    new cdk.CfnOutput(this, 'ApiSecurityGroupId', {
      value: apiSecurityGroup.securityGroupId,
      description: 'API Security Group ID - used in DB stack',
    });

    new cdk.CfnOutput(this, 'BastionSecurityGroupId', {
      value: bastionSecurityGroup.securityGroupId,
      description: 'Bastion Security Group ID - used in DB stack',
    });

    new cdk.CfnOutput(this, 'DbPasswordParameterName', {
      value: dbPasswordSSMParameter.parameterName,
      description: 'DB password parameter name',
    });
  }

  /// ===========

  private createApplicationVersion(
    app: elasticbeanstalk.CfnApplication,
    versionLabel: string,
    asset: s3assets.Asset,
  ): string {
    if (!app.applicationName) {
      throw new Error('app.applicationName is undefined');
    }
    const version = new elasticbeanstalk.CfnApplicationVersion(
      this,
      versionLabel,
      {
        applicationName: app.applicationName,
        sourceBundle: {
          s3Bucket: asset.s3BucketName,
          s3Key: asset.s3ObjectKey,
        },
      },
    );
    version.addDependency(app);
    return version.ref;
  }

  private createEnvironmentVariables(envVars: Record<string, string>) {
    return Object.entries(envVars).map(([key, value]) => ({
      namespace: 'aws:elasticbeanstalk:application:environment',
      optionName: key,
      value: value,
    }));
  }
}