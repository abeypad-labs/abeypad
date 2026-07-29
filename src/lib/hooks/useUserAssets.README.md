# User Assets Hooks

This module provides comprehensive hooks for tracking and managing user-created blockchain assets including tokens, NFT collections, token locks, and presales.

## Available Hooks

### 1. `useUserTokens()`

Track all ERC20 tokens created by a user.

```typescript
import { useUserTokens } from '@/lib/hooks/useUserAssets';

function TokenDashboard() {
  const { tokens, isLoading, refetch } = useUserTokens();

  if (isLoading) return <div>Loading tokens...</div>;

  return (
    <div>
      <h2>Your Tokens</h2>
      {tokens.map(token => (
        <div key={token.address}>
          <h3>{token.name} ({token.symbol})</h3>
          <p>Total Supply: {token.totalSupply.toString()}</p>
          <p>Decimals: {token.decimals}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. `useUserNFTCollections()`

Track all NFT collections created by a user.

```typescript
import { useUserNFTCollections } from '@/lib/hooks/useUserAssets';

function NFTDashboard() {
  const { collections, isLoading } = useUserNFTCollections();

  if (isLoading) return <div>Loading NFT collections...</div>;

  return (
    <div>
      <h2>Your NFT Collections</h2>
      {collections.map(collection => (
        <div key={collection.address}>
          <h3>{collection.name} ({collection.symbol})</h3>
          <p>Total Supply: {collection.totalSupply.toString()}</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. `useUserTokenBalances()`

Track balances of user-created tokens in the user's wallet.

```typescript
import { useUserTokenBalances } from '@/lib/hooks/useUserAssets';

function BalanceDashboard() {
  const { balances, isLoading } = useUserTokenBalances();

  if (isLoading) return <div>Loading balances...</div>;

  return (
    <div>
      <h2>Your Token Balances</h2>
      {Object.entries(balances).map(([tokenAddress, balance]) => (
        <div key={tokenAddress}>
          <p>{tokenAddress}: {balance.toString()}</p>
        </div>
      ))}
    </div>
  );
}
```

### 4. `useUserAssets()`

Combined hook that provides all user asset data.

```typescript
import { useUserAssets } from '@/lib/hooks/useUserAssets';

function UserAssetsDashboard() {
  const { tokens, collections, balances, isLoading } = useUserAssets();

  if (isLoading) return <div>Loading assets...</div>;

  return (
    <div>
      <h2>Your Blockchain Assets</h2>

      <h3>Tokens</h3>
      {/* Token list */}

      <h3>NFT Collections</h3>
      {/* Collection list */}

      <h3>Token Balances</h3>
      {/* Balance list */}
    </div>
  );
}
```

## Store Architecture

The hooks use a persistent local store (`useUserAssetsStore`) that:

1. **Caches Data**: Stores fetched asset data with timestamps
2. **Manages Loading States**: Tracks loading status for different asset types
3. **Persists to LocalStorage**: Automatically saves data between sessions
4. **Handles BigInt Serialization**: Properly serializes BigInt values for storage

## Features

### Automatic Refresh

- Data refreshes automatically every 30 seconds
- Manual refresh available via `refetch()` function
- Smart caching prevents unnecessary network requests

### Type Safety

- Full TypeScript support with proper typing
- Strict null checking and error handling
- Automatic type inference for contract data

### Performance Optimizations

- Memoized computations to prevent unnecessary re-renders
- Batched contract calls using `useReadContracts`
- Efficient cache invalidation strategies

## Integration with Existing Stores

This module works alongside existing stores:

- `useBlockchainStore` - For backward compatibility
- `useLaunchpadPresaleStore` - For presale tracking
- Existing token and NFT hooks - For simple address lists

## Usage Examples

### Dashboard Component

```typescript
import { useUserAssets } from '@/lib/hooks/useUserAssets';

export function UserDashboard() {
  const { tokens, collections, balances, isLoading, refetch } = useUserAssets();

  if (isLoading) {
    return <div className="loading">Loading your assets...</div>;
  }

  return (
    <div className="dashboard">
      <div className="header">
        <h1>Your Assets</h1>
        <button onClick={refetch}>Refresh</button>
      </div>

      <section>
        <h2>Tokens ({tokens.length})</h2>
        {tokens.map(token => (
          <TokenCard key={token.address} token={token} />
        ))}
      </section>

      <section>
        <h2>NFT Collections ({collections.length})</h2>
        {collections.map(collection => (
          <NFTCard key={collection.address} collection={collection} />
        ))}
      </section>

      <section>
        <h2>Your Balances</h2>
        <BalanceList balances={balances} />
      </section>
    </div>
  );
}
```

### Asset Management Component

```typescript
import { useUserTokens, useUserNFTCollections } from '@/lib/hooks/useUserAssets';

export function AssetManager() {
  const {
    tokens,
    collections,
    isLoading: assetsLoading,
    refetch
  } = useUserAssets();

  const handleCreateToken = async () => {
    // Implement token creation logic
    // Then refresh the asset list
    await refetch();
  };

  if (assetsLoading) {
    return <Spinner />;
  }

  return (
    <div>
      <button onClick={handleCreateToken}>
        Create New Token
      </button>

      <div className="assets-grid">
        {tokens.map(token => (
          <AssetItem
            key={token.address}
            type="token"
            data={token}
          />
        ))}

        {collections.map(collection => (
          <AssetItem
            key={collection.address}
            type="nft"
            data={collection}
          />
        ))}
      </div>
    </div>
  );
}
```
