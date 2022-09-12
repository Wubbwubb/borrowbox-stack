#! /bin/zsh

export $(cat .env | xargs)

aws dynamodb --endpoint-url http://localhost:8000 create-table --table-name $SESSION_TABLE_NAME \
  --attribute-definitions AttributeName=session,AttributeType=S --key-schema AttributeName=session,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --no-cli-pager

aws dynamodb --endpoint-url http://localhost:8000 update-time-to-live --table-name $SESSION_TABLE_NAME \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" --no-cli-pager
