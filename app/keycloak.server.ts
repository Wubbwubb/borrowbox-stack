import Keycloak, { KeycloakConfig } from "keycloak-connect";
import invariant from "tiny-invariant";

let _keycloak: Keycloak.Keycloak;

invariant(
  process.env.KEYCLOAK_CONFIDENTIAL_PORT,
  "KEYCLOAK_CONFIDENTIAL_PORT must be set"
);
invariant(
  process.env.KEYCLOAK_AUTH_SERVER_URL,
  "KEYCLOAK_AUTH_SERVER_URL must be set"
);
invariant(process.env.KEYCLOAK_RESOURCE, "KEYCLOAK_RESOURCE must be set");
invariant(
  process.env.KEYCLOAK_SSL_REQUIRED,
  "KEYCLOAK_SSL_REQUIRED must be set"
);
invariant(process.env.KEYCLOAK_REALM, "KEYCLOAK_REALM must be set");

const keycloakConfig: KeycloakConfig = {
  "confidential-port": process.env.KEYCLOAK_CONFIDENTIAL_PORT,
  "auth-server-url": process.env.KEYCLOAK_AUTH_SERVER_URL,
  resource: process.env.KEYCLOAK_RESOURCE,
  "ssl-required": process.env.KEYCLOAK_SSL_REQUIRED,
  realm: process.env.KEYCLOAK_REALM,
};
const requiredRealmRole: string | undefined =
  process.env.KEYCLOAK_REQUIRED_REALM_ROLE;

function initKeycloak(store: any) {
  if (_keycloak) {
    console.warn("Trying to init Keycloak again!");
    return _keycloak;
  } else {
    console.log("Initializing Keycloak...");
    _keycloak = new Keycloak({ store }, keycloakConfig);
    return _keycloak;
  }
}

export { requiredRealmRole, initKeycloak };
