# Plan: Direct Image Upload + Pinata IPFS for NFT Creation

## Goal
Replace the manual `baseURI` text input with a direct image upload flow on the NFT creation page. When a user uploads an image, it gets sent to Pinata (IPFS), metadata JSON is auto-generated and uploaded, and the resulting IPFS link is automatically passed to the contract as the `baseURI`.

## Tasks
- [x] 1. Add `VITE_PINATA_JWT` to `.env` for Pinata authentication
- [x] 2. Create `src/lib/utils/pinata.ts` — upload utility with two functions:
       - `uploadImageToIPFS(file)` — uploads raw image to Pinata, returns `ipfs://<CID>`
       - `uploadMetadataToIPFS(metadata)` — uploads JSON metadata to Pinata, returns `ipfs://<CID>`
       - Uses Pinata REST API directly via `fetch` (no SDK needed, works in browser)
- [x] 3. Modify `src/pages/dashboard/create/nft/page.tsx`:
       - Replace the `baseURI` text input with an image upload area (drag-and-drop + click-to-upload)
       - Show image preview after selection
       - Show upload progress/status (uploading → done → error)
       - **Auto-generate NFT metadata JSON** with: name, symbol, description, and the uploaded image IPFS URL
       - Upload the metadata JSON to Pinata
       - Auto-set `baseURI` state to the metadata JSON's IPFS URL
       - Show the auto-generated URI as a read-only field
       - Disable the "Create Collection" button until image is uploaded successfully
- [x] 4. After implementation, provide explanations for:
       - How a server-side upload proxy helps (security, reliability, rate limiting)
       - What batch upload means for NFT collections

## Assumptions
- Pinata is the IPFS provider
- The contract's `baseURI` parameter accepts an IPFS URI (e.g., `ipfs://Qm...`)
- User has a Pinata account and will provide their JWT in the `.env` file
- Upload happens client-side from the browser to Pinata's API directly

## Out of scope
- No server-side upload proxy (explained but not implemented)
- No batch upload (explained but not implemented)
- No changes to the contract ABI or deployment logic
- No changes to other pages or components