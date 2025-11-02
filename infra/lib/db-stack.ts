import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cr from 'aws-cdk-lib/custom-resources';
import { SecretValue } from 'aws-cdk-lib';

import { Construct } from 'constructs';

export interface IDBStackConfig {
  databaseName: string;
  databaseUsername: string;
  projectName: string;
  apiSecurityGroupId: string;
  bastionSecurityGroupId: string;
  vpcId: string;
  dbPasswordParameterName: string;
}

export class DbStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    {
      databaseName,
      databaseUsername,
      projectName,
      apiSecurityGroupId,
      bastionSecurityGroupId,
      vpcId,
      dbPasswordParameterName,
    }: IDBStackConfig,
    props?: cdk.StackProps,
  ) {
    super(scope, id, props);

    const apiSecurityGroup = ec2.SecurityGroup.fromLookupById(
      this,
      `${projectName}ApiSecurityGroup`,
      apiSecurityGroupId,
    );

    const bastionSecurityGroup = ec2.SecurityGroup.fromLookupById(
      this,
      `${projectName}BastionSecurityGroup`,
      bastionSecurityGroupId,
    );

    const vpc = ec2.Vpc.fromLookup(this, `${projectName}Vpc`, {
      vpcId,
    });

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_15_7,
    });
    // Aurora PostgreSQL Serverless
    const dbSecurityGroup = new ec2.SecurityGroup(
      this,
      `${projectName}DatabaseSecurityGroup`,
      {
        vpc,
        description: 'Security group for RDS',
        allowAllOutbound: true,
      },
    );

    dbSecurityGroup.addIngressRule(
      apiSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from API',
    );

    const dbPasswordParameterValue = Array(10)
      .fill(null)
      .map(() => Math.floor(Math.random() * 36).toString(36))
      .join('');

    // Upsert DB password parameter
    new cr.AwsCustomResource(this, `${projectName}DbPasswordUpsert`, {
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

    const dbCluster = new rds.DatabaseCluster(this, `${projectName}AuroraDB`, {
      engine,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      writer: rds.ClusterInstance.serverlessV2('writer'),
      serverlessV2MinCapacity: 0.5, // Minimum ACU (0.5 is the minimum?)
      serverlessV2MaxCapacity: 1, // Maximum ACU
      parameterGroup: new rds.ParameterGroup(
        this,
        `${projectName}RdsParameterGroup`,
        {
          engine,
          parameters: {
            // Terminate idle session for Aurora Serverless V2 auto-pause
            idle_session_timeout: '60000',
          },
        },
      ),

      defaultDatabaseName: databaseName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      credentials: rds.Credentials.fromPassword(
        databaseUsername,
        SecretValue.unsafePlainText(dbPasswordParameterValue),
      ),
    });

    // workaround to set minimum capacity to 0 to allow full stop of the database if not used
    (dbCluster.node.defaultChild as cdk.CfnResource).addPropertyOverride(
      'ServerlessV2ScalingConfiguration.MinCapacity',
      0,
    );

    // assign necessary access permissions
    dbCluster.connections.allowFrom(
      apiSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow database access from API',
    );

    // Allow bastion to access Aurora
    dbSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Bastion',
    );

    new cdk.CfnOutput(this, `${projectName}DbClusterEndpoint`, {
      value: dbCluster.clusterEndpoint.socketAddress,
    });

    new cdk.CfnOutput(this, `${projectName}DatabaseName`, {
      value: databaseName,
    });

    new cdk.CfnOutput(this, `${projectName}DbUsername`, {
      value: databaseUsername,
    });

    new cdk.CfnOutput(this, `${projectName}Port`, {
      value: '5432',
    });
  }
}