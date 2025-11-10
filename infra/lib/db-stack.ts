import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cr from 'aws-cdk-lib/custom-resources';
import { SecretValue } from 'aws-cdk-lib';

import { Construct } from 'constructs';

export interface IDBStackConfig {
  databaseNameWithEnv: string;
  databaseUsername: string;
  projectNameWithEnv: string;
  vpcId: string;
  apiSecurityGroupId?: string;
  bastionSecurityGroupId?: string;
  dbPasswordParameterName?: string;
}

export class DbStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    {
      databaseNameWithEnv,
      databaseUsername,
      projectNameWithEnv,
      apiSecurityGroupId,
      bastionSecurityGroupId,
      vpcId,
      dbPasswordParameterName,
    }: IDBStackConfig,
    props?: cdk.StackProps,
  ) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, `${projectNameWithEnv}Vpc`, {
      vpcId,
    });

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_15_7,
    });
    // Aurora PostgreSQL Serverless
    const dbSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectNameWithEnv}DatabaseSecurityGroup`,
      {
        vpc,
        description: 'Security group for RDS',
        allowAllOutbound: true,
      },
    );

    const dbPasswordParameterValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');

    // Upsert DB password parameter
    new cr.AwsCustomResource(this, `${projectNameWithEnv}DbPasswordUpsert`, {
      onCreate: {
        service: 'SSM',
        action: 'putParameter',
        parameters: {
          Name: dbPasswordParameterName,
          Value: dbPasswordParameterValue,
          Type: 'SecureString', // or 'String' if that’s how it was created
          Overwrite: true,
        },
        physicalResourceId: cr.PhysicalResourceId.of(
          `${dbPasswordParameterName}-v1`,
        ),
      },
      onUpdate: {
        service: 'SSM',
        action: 'putParameter',
        parameters: {
          Name: dbPasswordParameterName,
          Value: dbPasswordParameterValue,
          Type: 'SecureString',
          Overwrite: true,
        },
        physicalResourceId: cr.PhysicalResourceId.of(
          `${dbPasswordParameterName}-v1`,
        ),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [
          // Use the parameter ARN if you have it, else fallback to '*'
          'arn:aws:ssm:*',
        ],
      }),
    });

    // Get appropriate subnets for RDS - never use public subnets
    let dbSubnets: ec2.ISubnet[];
    if (vpc.isolatedSubnets.length > 0) {
      dbSubnets = vpc.isolatedSubnets;
    } else if (vpc.privateSubnets.length > 0) {
      dbSubnets = vpc.privateSubnets;
    } else {
      throw new Error('No private or isolated subnets available for RDS. RDS cannot be placed in public subnets for security reasons.');
    }

    // Create new DB subnet group
    const dbSubnetGroup = new rds.SubnetGroup(this, `${projectNameWithEnv}NewDbSubnetGroup`, {
      description: `DB subnet group for ${projectNameWithEnv} in new VPC`,
      vpc,
      vpcSubnets: {
        subnets: dbSubnets,
      },
    });

    // create cluster with dev database as default one
    const dbCluster = new rds.DatabaseCluster(
      this,
      `${projectNameWithEnv}AuroraDB`,
      {
        engine,
        vpc,
        subnetGroup: dbSubnetGroup,
        securityGroups: [dbSecurityGroup],
        writer: rds.ClusterInstance.serverlessV2('writer'),
        serverlessV2MinCapacity: 0.5, // Minimum ACU (0.5 is the minimum?)
        serverlessV2MaxCapacity: 1, // Maximum ACU
        parameterGroup: new rds.ParameterGroup(
          this,
          `${projectNameWithEnv}RdsParameterGroup`,
          {
            engine,
            parameters: {
              // Terminate idle session for Aurora Serverless V2 auto-pause
              idle_session_timeout: '60000',
            },
          },
        ),

        defaultDatabaseName: databaseNameWithEnv,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        credentials: rds.Credentials.fromPassword(
          databaseUsername,
          SecretValue.unsafePlainText(dbPasswordParameterValue),
        ),
      },
    );

    // workaround to set minimum capacity to 0 to allow full stop of the database if not used
    (dbCluster.node.defaultChild as cdk.CfnResource).addPropertyOverride(
      'ServerlessV2ScalingConfiguration.MinCapacity',
      0,
    );

    // assign necessary access permissions

    // allow api to access db
    if (apiSecurityGroupId) {
      const apiSecurityGroup = ec2.SecurityGroup.fromLookupById(
        this,
        `${projectNameWithEnv}ApiSecurityGroup`,
        apiSecurityGroupId,
      );
      dbSecurityGroup.addIngressRule(
        apiSecurityGroup,
        ec2.Port.tcp(5432),
        'Allow PostgreSQL access from API',
      );
      dbCluster.connections.allowFrom(
        apiSecurityGroup,
        ec2.Port.tcp(5432),
        'Allow database access from API',
      );
    }

    // Allow bastion to access Aurora
    if (bastionSecurityGroupId) {
      const bastionSecurityGroup = ec2.SecurityGroup.fromLookupById(
        this,
        `${projectNameWithEnv}BastionSecurityGroup`,
        bastionSecurityGroupId,
      );
      dbSecurityGroup.addIngressRule(
        bastionSecurityGroup,
        ec2.Port.tcp(5432),
        'Allow PostgreSQL access from Bastion',
      );
      dbCluster.connections.allowFrom(
        bastionSecurityGroup,
        ec2.Port.tcp(5432),
        'Allow database access from Bastion',
      );
    }

    new cdk.CfnOutput(this, `${projectNameWithEnv}DbClusterEndpoint`, {
      value: dbCluster.clusterEndpoint.socketAddress,
    });

    new cdk.CfnOutput(this, `${projectNameWithEnv}DatabaseName`, {
      value: databaseNameWithEnv,
    });

    new cdk.CfnOutput(this, `${projectNameWithEnv}DbUsername`, {
      value: databaseUsername,
    });

    new cdk.CfnOutput(this, `${projectNameWithEnv}Port`, {
      value: '5432',
    });

    new cdk.CfnOutput(this, `${projectNameWithEnv}DbPasswordParameterName`, {
      value: dbPasswordParameterName || '',
    });

    new cdk.CfnOutput(this, `${projectNameWithEnv}DbPasswordParameterValue`, {
      value: dbPasswordParameterValue,
    });
  }
}