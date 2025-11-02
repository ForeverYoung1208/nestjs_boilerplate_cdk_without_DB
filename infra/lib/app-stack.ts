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
  projectName: string;
  fullSubDomainNameApi: string;
  userDeploerName: string;
  companyName: string;
  targetNodeEnv: string;
  existingVpcId?: string;
  existingApiSGId?: string;
  existingBastionSGId?: string;  
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
      projectName,
      fullSubDomainNameApi,
      userDeploerName,
      companyName,
      targetNodeEnv,
      existingVpcId,
      existingApiSGId,
      existingBastionSGId
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
      `${projectName}ApiKeyParameter`,
      {
        parameterName: `/${projectName}/api-key`,
        stringValue: apiKeySecretValue,
        description: 'API key for the application',
      },
    );
    
    let dbPasswordSSMParameter: ssm.IStringParameter;
    try {
      dbPasswordSSMParameter = ssm.StringParameter.fromStringParameterName(
        this,
        `${projectName}DbPasswordParameter`,
        `/${projectName}/db-password`,
      );
    } catch (error) {
      // Create new parameter if it doesn't exist
      const param = new ssm.StringParameter(
        this,
        `${projectName}DbPasswordParameter`,
        {
          parameterName: `/${projectName}/db-password`,
          stringValue: 'place-here-db-password',
          description: 'DB password',
        }
      );
      param.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
      dbPasswordSSMParameter = param;
    }

    const mailPasswordSSMParameter = new ssm.StringParameter(
      this,
      `${projectName}MailPasswordParameter`,
      {
        parameterName: `/${projectName}/mail-password`,
        stringValue: 'place-here-mail-password',
        description: 'Mail password',
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
      vpc = ec2.Vpc.fromLookup(this, `${projectName}Vpc`, {
        vpcId: existingVpcId,
      });
    } catch (e) {
      // Create new VPC if it doesn't exist
      const newVpc = new ec2.Vpc(this, `${projectName}VPC`, {
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
      newVpc.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
      vpc = newVpc;
    }

    //Lookup the zone based on domain name
    const zone = route53.HostedZone.fromLookup(this, `${projectName}Zone`, {
      domainName: domainName,
    });

    // ACM Certificate
    const certificate = new certificatemanager.Certificate(
      this,
      `${projectName}Certificate`,
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
          `${projectName}ApiSecurityGroup`,
          existingApiSGId,
        );
      } else {
        throw new Error('No existing security group ID provided');
      }
    } catch (e) {
      // Create new security group if lookup fails or no ID provided
      const newSg = new ec2.SecurityGroup(
        this,
        `${projectName}ApiSecurityGroup`,
        {
          vpc,
          description: 'Security group for API',
          allowAllOutbound: true,
        }
      );
      newSg.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
      apiSecurityGroup = newSg;
    }


    const albSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectName}AlbSecurityGroup`,
      {
        vpc,
        description: 'Security group for API ALB',
        allowAllOutbound: true,
      },
    );

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
      `${projectName}RedisSG`,
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
      `${projectName}RedisParameterGroup`,
      {
        cacheParameterGroupFamily: 'redis7',
        description: 'Redis parameter group for queue system',
        properties: {
          'maxmemory-policy': 'noeviction', // noeviction - Redis will return errors instead of evicting data when memory is full
        },
      },
    );

    const redis = new elasticache.CfnCacheCluster(
      this,
      `${projectName}RedisCluster`,
      {
        cacheNodeType: 'cache.t3.micro',
        engine: 'redis',
        engineVersion: '7.0',
        numCacheNodes: 1,
        cacheParameterGroupName: redisParameterGroup.ref,
        vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
        cacheSubnetGroupName: new elasticache.CfnSubnetGroup(
          this,
          `${projectName}RedisSubnetGroup`,
          {
            description: 'Subnet group for Redis cluster',
            subnetIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
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
      bucketName: `${projectName.toLowerCase()}-eb-artifacts`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create an S3 asset for CDK to manage application code

    const appAsset = new s3assets.Asset(this, `${projectName}ApiAsset`, {
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
    const ebInstanceRole = new iam.Role(this, `${projectName}EBInstanceRole`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AWSElasticBeanstalkWebTier',
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AWSElasticBeanstalkWorkerTier',
        ),
      ],
    });

    // Add Secrets Manager permissions
    ebInstanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/${projectName}/*`,
        ],
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
      `${projectName}EBInstanceProfile`,
      {
        roles: [ebInstanceRole.roleName],
      },
    );

    // Create Elastic Beanstalk application
    const app = new elasticbeanstalk.CfnApplication(
      this,
      `${projectName}Application`,
      {
        applicationName: `${projectName}-application`,
      },
    );
    if (!app.applicationName) {
      throw new Error('app.applicationName is undefined');
    }

    const versionLabel = this.createApplicationVersion(
      app,
      `${projectName}AppVersion`,
      appAsset,
    );
    const envVars = [
      ...this.createEnvironmentVariables({
        NODE_ENV: targetNodeEnv,
        PORT: '3000',
        SITE_ORIGIN: `https://${fullSubDomainNameApi}`,
        DB_HOST: 'change to real dbHost',
        DB_PORT: 'change to real dbPort',
        DB_DATABASE: 'change to real dbName',
        DB_USERNAME: 'change to real dbUsername',
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
      }),

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

    const keyPairApi = new ec2.CfnKeyPair(this, `${projectName}ApiKeyPair`, {
      keyName: `${projectName}-api-key`,
    });

    const apiEnvironment = new elasticbeanstalk.CfnEnvironment(
      this,
      `${projectName}ApiEnvironment`,
      {
        environmentName: `${projectName}-Api-Environment`,
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
          `${projectName}BastionSecurityGroup`,
          existingBastionSGId,
        );
      } else {
        throw new Error('No existing bastion security group ID provided');
      }
    } catch (e) {
      // Create new security group if lookup fails or no ID provided
      const newSg = new ec2.SecurityGroup(
        this,
        `${projectName}BastionSecurityGroup`,
        {
          vpc,
          description: 'Security group for Bastion Host',
          allowAllOutbound: true,
        }
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

    const keyPair = new ec2.CfnKeyPair(this, `${projectName}BastionKeyPair`, {
      keyName: `${projectName}-bastion-key`,
    });

    // Create bastion host
    const bastion = new ec2.Instance(this, `${projectName}BastionHost`, {
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

    const apiAlias = new route53.CnameRecord(this, `${projectName}ApiAlias`, {
      zone,
      recordName: fullSubDomainNameApi,
      domainName: apiEnvironment.attrEndpointUrl,
    });

    apiAlias.node.addDependency(apiEnvironment);

    // Only add dependencies if they are not imported resources
    if (apiSecurityGroup instanceof ec2.SecurityGroup) {  // Only true for newly created security groups
      apiEnvironment.addDependency(apiSecurityGroup.node.defaultChild as cdk.CfnResource);
    }
    if (vpc instanceof ec2.Vpc) {  // Only true for newly created VPCs
      apiEnvironment.addDependency(vpc.node.defaultChild as cdk.CfnResource);
    }

    // Add IAM user to deploy code
    const userDeploer = new iam.User(this, `${projectName}Deployer`, {
      userName: userDeploerName,
    });

    // user policy to deploy code
    userDeploer.attachInlinePolicy(
      new iam.Policy(this, `${projectName}DeployerPolicy`, {
        policyName: `publish-to-${projectName}`,
        statements: [
          new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:ssm:${this.region}:${this.account}:parameter/${projectName}*`,
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
              `arn:aws:s3:::${projectName.toLowerCase()}-eb-artifacts`,
              `arn:aws:s3:::${projectName.toLowerCase()}-eb-artifacts/*`,
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
              `arn:aws:elasticbeanstalk:${this.region}:${this.account}:application/${projectName}-application`,
              `arn:aws:elasticbeanstalk:${this.region}:${this.account}:applicationversion/${projectName}-application/*`,
              `arn:aws:elasticbeanstalk:${this.region}:${this.account}:environment/${projectName}-application/${projectName}*`,
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