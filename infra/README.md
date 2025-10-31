# Welcome to your CDK TypeScript project

## Useful commands

* `cdk deploy --context targetEnv=dev`  deploy this stack to your default AWS account/region
* `cdk deploy --context targetEnv=dev --no-rollback` deploy this stack from your default AWS account/region without rollback. FASTER AND LEAVES STACK IN A FAILED STATE
* `cdk destroy --context targetEnv=dev` destroy this stack from your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


# Connecting to the database though bastion

1. Get the SSH key and bastion IP from outputs.

Get bastion IP (same as from CDK output)
```bash
$ aws cloudformation describe-stacks --stack-name boilerplateStack --query 'Stacks[0].Outputs[?OutputKey==`BastionPublicIP`].OutputValue' --output text
```

Get SSH private key 
example: (composed command with KEY_PAIR_ID you can find in outpusts  as SSHKeyCommand)
```bash
aws ssm get-parameter --name "/ec2/keypair/$(aws ec2 describe-key-pairs --key-names boilerplate-bastion-key --query 'KeyPairs[0].KeyPairId' --output text)" --with-decryption --query Parameter.Value --output text > boilerplate-bastion-key.pem
chmod 400 bastion-key.pem
```


2. Setup ssh tunnel port from localhost:5432  to AuroraClusterEndpoint through bastion 18.153.68.156 (use your AuroraClusterEndpoint and your bastion IP )
```bash
ssh -i boilerplate-bastion-key.pem -L 5432:boilerplatestack-boilerplateauroradbc4ff7a80-zolkr8gylbpk.cluster-cniqg8kg8g2s.eu-central-1.rds.amazonaws.com:5432 ec2-user@18.185.100.195
```

3. Then use your db admin tool to connect to port localhost:5432
credentials (username, db, password) you must get from AWS console -> AWS Secrets Manager -> Secrets
or use aws cdk command
```bash
aws secretsmanager get-secret-value --secret-id <<secretName_from_config.ts>> --query SecretString --output text | jq '.'
```
for example
```bash
aws secretsmanager get-secret-value --secret-id boilerplate-db-credentials --query SecretString --output text | jq '.'
```

## Other  useful commands

get stack information: projectName = 'boilerplate' (from config.ts) Stack is created as new AppStack(app, '${projectName}Stack') (from infra.ts) So the final stack name is boilerplateStack
```bash
aws cloudformation describe-stacks --stack-name boilerplateStack
```

Connect to bastion
```bash
ssh -i bastion-key.pem ec2-user@18.153.68.156
```


fetch key to connect to api
```bash
aws ssm get-parameter --name "/ec2/keypair/$(aws ec2 describe-key-pairs --key-names boilerplate-api-key --query 'KeyPairs[0].KeyPairId' --output text)" --with-decryption --query Parameter.Value --output text > boilerplate-api-key.pem
chmod 400 boilerplate-api-key.pem
```


login from bastion to api
```bash
ssh -i boilerplate-api-key.pem ec2-user@ec2-3-69-31-83.eu-central-1.compute.amazonaws.com
```

## postgres
install client
```bash
sudo dnf install postgresql15
```


get credentials
```bash 
aws secretsmanager get-secret-value --secret-id boilerplate-db-credentials --query SecretString --output text | jq '.'
```

connect
```bash
psql -h boilerplatestack-boilerplateauroradbc4ff7a80-zolkr8gylbpk.cluster-cniqg8kg8g2s.eu-central-1.rds.amazonaws.com -U your_username -d your_database_name
```

list databases
```psql
\list
```


change database
```psql
\c boilerplate
```


list tables
```psql
\dt
```