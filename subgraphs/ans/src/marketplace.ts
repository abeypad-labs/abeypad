import { BigInt } from "@graphprotocol/graph-ts";
import {
  BidPlaced,
  BidRefundAvailable,
  Listed,
  ListingCancelled,
  ListingPurchased,
  ProceedsAvailable,
  ProceedsWithdrawal,
  SecondaryAuctionCancelled,
  SecondaryAuctionCreated,
  SecondaryAuctionSettled,
  Withdrawal,
} from "../generated/Marketplace/ANSMarketplaceEscrow";
import {
  Bid,
  MarketplaceAuction,
  MarketplaceListing,
  ProceedsCredit,
  Refund,
} from "../generated/schema";
import {
  applyLabel,
  eventId,
  loadAccount,
  loadDomain,
  recordActivity,
  subtractFloorZero,
} from "./helpers";

export function handleListed(event: Listed): void {
  let id = event.params.listingId.toString();
  let domain = loadDomain(event.params.node, event);
  applyLabel(domain, event.params.name);
  domain.owner = event.address;
  domain.save();

  let listing = new MarketplaceListing(id);
  listing.listingId = event.params.listingId;
  listing.domain = domain.id;
  listing.node = event.params.node;
  listing.label = event.params.name;
  listing.name = event.params.name + ".abey";
  listing.seller = event.params.seller;
  listing.price = event.params.price;
  listing.active = true;
  listing.createdAt = event.block.timestamp;
  listing.createdBlock = event.block.number;
  listing.createdTx = event.transaction.hash;
  listing.updatedAt = event.block.timestamp;
  listing.updatedBlock = event.block.number;
  listing.updatedTx = event.transaction.hash;
  listing.save();
  recordActivity(
    event,
    "marketplace",
    "listing_created",
    id,
    event.params.node,
    event.params.seller,
    event.params.price,
  );
}

export function handleListingCancelled(event: ListingCancelled): void {
  let id = event.params.listingId.toString();
  let listing = MarketplaceListing.load(id);
  if (listing == null) return;
  listing.active = false;
  listing.updatedAt = event.block.timestamp;
  listing.updatedBlock = event.block.number;
  listing.updatedTx = event.transaction.hash;
  listing.save();
  recordActivity(
    event,
    "marketplace",
    "listing_cancelled",
    id,
    listing.node,
    listing.seller,
    null,
  );
}

export function handleListingPurchased(event: ListingPurchased): void {
  let id = event.params.listingId.toString();
  let listing = MarketplaceListing.load(id);
  if (listing == null) return;
  listing.active = false;
  listing.buyer = event.params.buyer;
  listing.purchasedPrice = event.params.price;
  listing.updatedAt = event.block.timestamp;
  listing.updatedBlock = event.block.number;
  listing.updatedTx = event.transaction.hash;
  listing.save();
  let domain = loadDomain(listing.node, event);
  domain.owner = event.params.buyer;
  domain.save();
  recordActivity(
    event,
    "marketplace",
    "listing_purchased",
    id,
    listing.node,
    event.params.buyer,
    event.params.price,
  );
}

export function handleSecondaryAuctionCreated(
  event: SecondaryAuctionCreated,
): void {
  let id = event.params.auctionId.toString();
  let domain = loadDomain(event.params.node, event);
  applyLabel(domain, event.params.name);
  domain.owner = event.address;
  domain.save();

  let auction = new MarketplaceAuction(id);
  auction.auctionId = event.params.auctionId;
  auction.domain = domain.id;
  auction.node = event.params.node;
  auction.label = event.params.name;
  auction.name = event.params.name + ".abey";
  auction.seller = event.params.seller;
  auction.reservePrice = event.params.reservePrice;
  auction.startTime = event.params.startTime;
  auction.endTime = event.params.endTime;
  auction.bidCount = 0;
  auction.highestBid = BigInt.fromI32(0);
  auction.settled = false;
  auction.cancelled = false;
  auction.createdAt = event.block.timestamp;
  auction.createdBlock = event.block.number;
  auction.createdTx = event.transaction.hash;
  auction.updatedAt = event.block.timestamp;
  auction.updatedBlock = event.block.number;
  auction.updatedTx = event.transaction.hash;
  auction.save();
  recordActivity(
    event,
    "marketplace",
    "auction_created",
    id,
    event.params.node,
    event.params.seller,
    event.params.reservePrice,
  );
}

export function handleBidPlaced(event: BidPlaced): void {
  let id = event.params.auctionId.toString();
  let auction = MarketplaceAuction.load(id);
  if (auction == null) return;
  auction.highestBidder = event.params.bidder;
  auction.highestBid = event.params.amount;
  auction.endTime = event.params.endTime;
  auction.currentExtensionWindow = event.params.nextExtensionWindow;
  auction.bidCount = auction.bidCount + 1;
  auction.updatedAt = event.block.timestamp;
  auction.updatedBlock = event.block.number;
  auction.updatedTx = event.transaction.hash;
  auction.save();

  let bid = new Bid(eventId(event));
  bid.source = "marketplace";
  bid.auctionId = event.params.auctionId;
  bid.marketplaceAuction = id;
  bid.bidder = event.params.bidder;
  bid.amount = event.params.amount;
  bid.endTime = event.params.endTime;
  bid.nextExtensionWindow = event.params.nextExtensionWindow;
  bid.timestamp = event.block.timestamp;
  bid.blockNumber = event.block.number;
  bid.transactionHash = event.transaction.hash;
  bid.logIndex = event.logIndex;
  bid.save();
  recordActivity(
    event,
    "marketplace",
    "bid_placed",
    id,
    auction.node,
    event.params.bidder,
    event.params.amount,
  );
}

export function handleBidRefundAvailable(event: BidRefundAvailable): void {
  let refund = new Refund(eventId(event));
  refund.source = "marketplace";
  refund.auctionId = event.params.auctionId;
  refund.account = event.params.bidder;
  refund.amount = event.params.amount;
  refund.timestamp = event.block.timestamp;
  refund.blockNumber = event.block.number;
  refund.transactionHash = event.transaction.hash;
  refund.logIndex = event.logIndex;
  refund.save();
  let balance = loadAccount(event.params.bidder, event);
  balance.marketplaceRefunds = balance.marketplaceRefunds.plus(
    event.params.amount,
  );
  balance.save();
  recordActivity(
    event,
    "marketplace",
    "refund_available",
    event.params.auctionId.toString(),
    null,
    event.params.bidder,
    event.params.amount,
  );
}

export function handleSecondaryAuctionCancelled(
  event: SecondaryAuctionCancelled,
): void {
  let id = event.params.auctionId.toString();
  let auction = MarketplaceAuction.load(id);
  if (auction == null) return;
  auction.cancelled = true;
  auction.updatedAt = event.block.timestamp;
  auction.updatedBlock = event.block.number;
  auction.updatedTx = event.transaction.hash;
  auction.save();
  recordActivity(
    event,
    "marketplace",
    "auction_cancelled",
    id,
    auction.node,
    auction.seller,
    null,
  );
}

export function handleSecondaryAuctionSettled(
  event: SecondaryAuctionSettled,
): void {
  let id = event.params.auctionId.toString();
  let auction = MarketplaceAuction.load(id);
  if (auction == null) return;
  auction.settled = true;
  auction.winner = event.params.winner;
  auction.settledAmount = event.params.amount;
  auction.updatedAt = event.block.timestamp;
  auction.updatedBlock = event.block.number;
  auction.updatedTx = event.transaction.hash;
  auction.save();
  let domain = loadDomain(auction.node, event);
  domain.owner = event.params.winner.toHexString() ==
    "0x0000000000000000000000000000000000000000"
    ? auction.seller
    : event.params.winner;
  domain.save();
  recordActivity(
    event,
    "marketplace",
    "auction_settled",
    id,
    auction.node,
    event.params.winner,
    event.params.amount,
  );
}

export function handleProceedsAvailable(event: ProceedsAvailable): void {
  let credit = new ProceedsCredit(eventId(event));
  credit.entityId = event.params.entityId;
  credit.isAuction = event.params.isAuction;
  credit.account = event.params.account;
  credit.amount = event.params.amount;
  credit.timestamp = event.block.timestamp;
  credit.blockNumber = event.block.number;
  credit.transactionHash = event.transaction.hash;
  credit.logIndex = event.logIndex;
  credit.save();
  let balance = loadAccount(event.params.account, event);
  balance.marketplaceProceeds = balance.marketplaceProceeds.plus(
    event.params.amount,
  );
  balance.save();
  recordActivity(
    event,
    "marketplace",
    "proceeds_available",
    event.params.entityId.toString(),
    null,
    event.params.account,
    event.params.amount,
  );
}

export function handleProceedsWithdrawal(event: ProceedsWithdrawal): void {
  let balance = loadAccount(event.params.account, event);
  balance.marketplaceProceeds = subtractFloorZero(
    balance.marketplaceProceeds,
    event.params.amount,
  );
  balance.save();
  recordActivity(
    event,
    "marketplace",
    "proceeds_withdrawn",
    null,
    null,
    event.params.account,
    event.params.amount,
  );
}

export function handleWithdrawal(event: Withdrawal): void {
  let balance = loadAccount(event.params.account, event);
  balance.marketplaceRefunds = subtractFloorZero(
    balance.marketplaceRefunds,
    event.params.amount,
  );
  balance.save();
  recordActivity(
    event,
    "marketplace",
    "refund_withdrawn",
    null,
    null,
    event.params.account,
    event.params.amount,
  );
}
