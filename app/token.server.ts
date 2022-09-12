import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { generators, TokenSet } from "openid-client";
import invariant from "tiny-invariant";

invariant(process.env.AWS_REGION, "AWS_REGION must be set");
invariant(process.env.SESSION_TABLE_NAME, "SESSION_TABLE_NAME must be set");

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_LOCAL,
});

const sessionsTable = process.env.SESSION_TABLE_NAME;

export const getToken = async (sessionId: string) => {
  const getItemCommand = new GetItemCommand({
    Key: marshall({ session: sessionId }),
    TableName: sessionsTable,
  });

  const result = await dynamoDBClient.send(getItemCommand);

  if (result.Item) {
    const item = unmarshall(result.Item);

    if (item.hasOwnProperty("token")) {
      return new TokenSet(item.token);
    }
  }

  return undefined;
};

export const insertToken = async (tokenSet: TokenSet) => {
  const sessionId = generators.random();

  const timestamp = Math.round(Date.now() / 1000);

  const Item = marshall({
    session: sessionId,
    token: { ...tokenSet },
    ttl: timestamp * 30 * 60, // add 30 minutes
  });

  const createItemCommand = new PutItemCommand({
    Item,
    TableName: sessionsTable,
    ConditionExpression: "attribute_not_exists(#session)",
    ExpressionAttributeNames: {
      "#session": "session",
    },
  });

  await dynamoDBClient.send(createItemCommand);

  return sessionId;
};

export const updateToken = async (sessionId: string, tokenSet: TokenSet) => {
  const timestamp = Math.round(Date.now() / 1000);

  const updateItemCommand = new UpdateItemCommand({
    Key: marshall({ session: sessionId }),
    TableName: sessionsTable,

    UpdateExpression: "SET #token = :token, #ttl = :ttl",
    ExpressionAttributeNames: {
      "#name": "name",
      "#ttl": "ttl",
    },
    ExpressionAttributeValues: marshall({
      ":token": { ...tokenSet },
      ":ttl": timestamp * 30 * 60, // add 30 minutes
    }),
  });

  await dynamoDBClient.send(updateItemCommand);
};

export const removeToken = async (sessionId: string) => {
  const removeItemCommand = new DeleteItemCommand({
    Key: marshall({ session: sessionId }),
    TableName: sessionsTable,
  });

  await dynamoDBClient.send(removeItemCommand);
};
