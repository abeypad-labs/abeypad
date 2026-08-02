import { BigInt } from "@graphprotocol/graph-ts";
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionSettled,
  BidPlaced,
  BidRefundAvailable,
  Withdrawal,
} from "../generated/AuctionHouse/ANSAuctionHouse";
import { Bid, PrimaryAuction, Refund } from "../generated/schema";
import {
  eventId,
  loadAccount,
  recordActivity,
  subtractFloorZero,
} from "./helpers";

function touchAuction(auction: PrimaryAuction, event: AuctionCreated): void {
  auction.updatedAt = event.block.timestamp;
  auction.updatedBlock = event.block.number;
  auction.updatedTx = event.transaction.hash;
}

export function handleAuctionCreated(event: AuctionCreated): void {
  let id = event.params.auctionId.toString();
  let auction = new PrimaryAuction(id);
  auction.auctionId = event.params.auctionId;
  auction.label = event.params.name;
  auction.name = event.params.name + ".abey";
  auction.reservePrice = event.params.reservePrice;
  auction.duration = event.params.duration;
  auction.startTime = event.params.startTime;
  auction.endTime = event.params.endTime;
  auction.bidCount = 0;
  auction.highestBid = BigInt.fromI32(0);
  auction.settled = false;
  auction.cancelled = false;
  auction.createdAt = event.block.timestamp;
  auction.createdBlock = event.block.number;
  auction.createdTx = event.transaction.hash;
  touchAuction(auction, event);
  auction.save();
  recordActivity(
    event,
    "primary_auction",
    "auction_created",
    id,
    null,
    null,
    event.params.reservePrice,
  );
}

export function handleBidPlaced(event: BidPlaced): void {
  let id = event.params.auctionId.toString();
  let auction = PrimaryAuction.load(id);
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
  bid.source = "primary_auction";
  bid.auctionId = event.params.auctionId;
  bid.primaryAuction = id;
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
    "primary_auction",
    "bid_placed",
    id,
    null,
    event.params.bidder,
    event.params.amount,
  );
}

export function handleBidRefundAvailable(event: BidRefundAvailable): void {
  let refund = new Refund(eventId(event));
  refund.source = "primary_auction";
  refund.auctionId = event.params.auctionId;
  refund.account = event.params.bidder;
  refund.amount = event.params.amount;
  refund.timestamp = event.block.timestamp;
  refund.blockNumber = event.block.number;
  refund.transactionHash = event.transaction.hash;
  refund.logIndex = event.logIndex;
  refund.save();

  let balance = loadAccount(event.params.bidder, event);
  balance.primaryRefunds = balance.primaryRefunds.plus(event.params.amount);
  balance.save();
  recordActivity(
    event,
    "primary_auction",
    "refund_available",
    event.params.auctionId.toString(),
    null,
    event.params.bidder,
    event.params.amount,
  );
}

export function handleAuctionCancelled(event: AuctionCancelled): void {
  let id = event.params.auctionId.toString();
  let auction = PrimaryAuction.load(id);
  if (auction == null) return;
  auction.cancelled = true;
  auction.updatedAt = event.block.timestamp;
  auction.updatedBlock = event.block.number;
  auction.updatedTx = event.transaction.hash;
  auction.save();
  recordActivity(
    event,
    "primary_auction",
    "auction_cancelled",
    id,
    null,
    null,
    null,
  );
}

export function handleAuctionSettled(event: AuctionSettled): void {
  let id = event.params.auctionId.toString();
  let auction = PrimaryAuction.load(id);
  if (auction == null) return;
  auction.settled = true;
  auction.winner = event.params.winner;
  auction.settledAmount = event.params.amount;
  auction.updatedAt = event.block.timestamp;
  auction.updatedBlock = event.block.number;
  auction.updatedTx = event.transaction.hash;
  auction.save();
  recordActivity(
    event,
    "primary_auction",
    "auction_settled",
    id,
    null,
    event.params.winner,
    event.params.amount,
  );
}

export function handleWithdrawal(event: Withdrawal): void {
  let balance = loadAccount(event.params.bidder, event);
  balance.primaryRefunds = subtractFloorZero(
    balance.primaryRefunds,
    event.params.amount,
  );
  balance.save();
  recordActivity(
    event,
    "primary_auction",
    "refund_withdrawn",
    null,
    null,
    event.params.bidder,
    event.params.amount,
  );
}
