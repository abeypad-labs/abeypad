/**
 * Pinata IPFS upload utilities.
 *
 * Uses the Pinata REST API directly via fetch (works in browser, no SDK needed).
 * Requires VITE_PINATA_JWT env var — get yours at https://app.pinata.cloud/developers/api-keys
 */

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

function getAuthHeaders(): HeadersInit {
  if (!PINATA_JWT) {
    throw new Error(
      "Missing VITE_PINATA_JWT env var. Add it to your .env file (get one at https://app.pinata.cloud/developers/api-keys)",
    );
  }
  return { Authorization: `Bearer ${PINATA_JWT}` };
}

/**
 * Upload a raw file (image, video, etc.) to IPFS via Pinata.
 * Returns the IPFS URI in the form `ipfs://<CID>`.
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Pinata file upload failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Upload a JSON metadata blob to IPFS via Pinata.
 * Returns the IPFS URI in the form `ipfs://<CID>`.
 */
export async function uploadJSONToIPFS(
  metadata: Record<string, unknown>,
  name?: string,
): Promise<string> {
  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: name ?? `${String(metadata.name ?? "nft")}-metadata.json`,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Pinata JSON upload failed (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Convenience: upload an image, then create and upload NFT metadata JSON
 * that references the image. Returns the metadata IPFS URI.
 */
export async function uploadNFTImageWithMetadata(
  imageFile: File,
  nftName: string,
  nftSymbol: string,
  description?: string,
): Promise<{ imageUri: string; metadataUri: string }> {
  // 1. Upload the raw image
  const imageUri = await uploadFileToIPFS(imageFile);

  // 2. Build the metadata JSON (ERC-721/1155 compatible)
  const metadata = {
    name: nftName,
    symbol: nftSymbol,
    description:
      description ?? `${nftName} — NFT collection deployed on AbeyPad`,
    image: imageUri,
    external_url: "https://abeypad.com",
  };

  // 3. Upload metadata JSON
  const metadataUri = await uploadJSONToIPFS(metadata, `${nftName}-metadata`);

  return { imageUri, metadataUri };
}