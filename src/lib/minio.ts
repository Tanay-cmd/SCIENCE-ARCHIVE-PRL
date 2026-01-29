import { Client } from "minio";

const minioCredentials = {
  endPoint: "localhost",
  port: 9000,
  useSSL: false,
  accessKey: "Laav10user",
  secretKey: "Laav10pass",
};

const minioNodes = [
  { endPoint: "localhost", port: 9000 },
  { endPoint: "localhost", port: 9002 },
  { endPoint: "localhost", port: 9004 },
  { endPoint: "localhost", port: 9006 },
];

let client: Client | null = null;
let clientInitialized = false;

async function initializeMinioClient(): Promise<Client | null> {
  if (clientInitialized) {
    return client;
  }
  clientInitialized = true; // Attempt initialization only once
  for (const node of minioNodes) {
    try {
      const minioClient = new Client({
        ...minioCredentials,
        endPoint: node.endPoint,
        port: node.port,
      });
      await minioClient.listBuckets();
      console.log(`Connected to Minio node at ${node.endPoint}:${node.port}`);
      client = minioClient;
      return client;
    } catch (err) {
      console.error(
        `Failed to connect to Minio node at ${node.endPoint}:${node.port}`,
        err
      );
    }
  }
  console.error("Failed to connect to any of the Minio nodes.");
  return null;
}

export async function getMinioClient(): Promise<Client | null> {
  if (!client) {
    return await initializeMinioClient();
  }
  return client;
} 