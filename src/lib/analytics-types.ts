/** Shapes of the analytics read models (see /api/docs, tag "Analytics"). */
import type { Advertiser, SegmentShare } from './types';

export interface Totals {
  plays: number;
  viewers: number;
  cost: number;
  scans: number;
  redemptions: number;
  revenue: number;
  roas: number | null;
  /** (attributed sales − media spend) ÷ media spend, as a fraction (0.5 = +50%). */
  roi: number | null;
}

export interface CampaignRow {
  id: string;
  name: string;
  status: string;
  objective: string;
  today: Totals;
  spend: { today: number; total: number };
  budget: { dailyCap: number; total: number; cpm: number };
  pacing: { daily: number | null; total: number | null };
  performance: number;
  promo: { offerText: string; inStock: boolean } | null;
  schedule: { start: string; end: string };
}

export interface AdvertiserOverview {
  at: string;
  advertiser: Advertiser;
  today: Totals;
  campaigns: CampaignRow[];
  hourly: {
    hour: number;
    plays: number;
    viewers: number;
    cost: number;
    scans: number;
    redemptions: number;
    revenue: number;
  }[];
  recentRedemptions: {
    id: string;
    at: string;
    code: string;
    campaignId: string;
    campaignName: string;
    outletName: string | null;
    screenId: string;
    segment: string | null;
    revenue: number;
    fromPhone: boolean;
  }[];
}

export interface PassengerFlow {
  zones: { id: string; name: string }[];
  at: string;
  next60: {
    averagePax: number;
    peakPax: number;
    international: number;
    topDestinations: { code: string; label: string; share: number }[];
    topNationalities: { code: string; label: string; share: number }[];
    tripPurpose: SegmentShare[];
    partyType: SegmentShare[];
  };
  points: { at: string; pax: number; international: number; families: number; business: number }[];
}

export interface PromoCodes {
  codes: {
    code: string;
    campaignId: string;
    campaignName: string;
    screenId: string;
    flight: string | null;
    parentCode: string | null;
    issuedAt: string;
    expiresAt: string;
    status: 'active' | 'expired' | 'redeemed';
  }[];
  redemptionsToday: number;
  revenueToday: number;
}

export interface CampaignPerformance {
  creatives: {
    creativeId: string;
    name: string;
    plays: number;
    viewers: number;
    scans: number;
    scansPerThousand: number | null;
  }[];
  campaign: { id: string; name: string; status: string; segmentWeights: Record<string, number> };
  today: Totals;
  performance: number;
  modelVersion: string;
  last30: {
    days: {
      date: string;
      plays: number;
      impressions: number;
      scans: number;
      redemptions: number;
      spend: number;
      revenue: number;
      roas: number | null;
      roi: number | null;
    }[];
    spend: number;
    revenue: number;
    redemptions: number;
    impressions: number;
    roas: number | null;
    roi: number | null;
  };
  /** Share of redemptions vs share of passengers, per segment (lift 2 = twice their share). */
  segments: { segment: string; redemptions: number; share: number; passengerShare: number; lift: number }[];
  suggestions: {
    segment: string;
    current: number;
    suggested: number;
    lift: number;
    share: number;
    passengerShare: number;
  }[];
}

export interface CampaignPreview {
  at: string;
  screensPlaced: number;
  screensEligible: number;
  screensPlayable: number;
  minScoreToPlay: number;
  averageMatch: number | null;
  averageScore: number | null;
  estimatedViewersPerHour: number;
  estimatedCostPerHour: number;
  filtered: { rule: string; screens: number }[];
  best: { screenId: string; name: string; zoneId: string; pax: number; match: number; score: number }[];
  audience: { tripPurpose: SegmentShare[]; partyType: SegmentShare[]; international: number } | null;
}

export interface AirlineOverview {
  at: string;
  airline: Advertiser;
  flights: {
    id: string;
    flight: string;
    direction: 'A' | 'D';
    other: string;
    terminal: string;
    gate: string | null;
    gateId: string | null;
    scheduledTime: string;
    estimatedTime: string | null;
    status: string;
    pax: number;
    aircraft: string;
    boardingAt: string | null;
    gateCloseAt: string | null;
    inBoardingWindow: boolean;
    delayMinutes: number;
  }[];
  summary: { departures: number; arrivals: number; delayed: number; paxToday: number; inBoarding: number };
  profile: {
    flights: number;
    tripPurpose: SegmentShare[];
    partyType: SegmentShare[];
    ageBand: SegmentShare[];
    cabin: SegmentShare[];
    international: number;
    topNationalities: { code: string; label: string; share: number }[];
    topDestinations: { code: string; label: string; share: number }[];
  } | null;
  gatePlays: {
    flight: string;
    flightId: string;
    gateId: string | null;
    inBoardingWindow: boolean;
    screens: {
      screenId: string;
      name: string;
      campaignId: string | null;
      campaignName: string | null;
      advertiser: string | null;
      own: boolean;
      mode: string | null;
      score: number | null;
      reason: string | null;
    }[];
  }[];
  campaigns: {
    id: string;
    name: string;
    status: string;
    airlinePriority: boolean;
    triggers: { type: string; minutes?: number; boost: number }[];
    coFundedBy: string | null;
    today: Totals;
  }[];
  goodwill: {
    campaigns: AirlineOverview['campaigns'];
    activations: {
      campaignId: string;
      campaignName: string;
      flight: string;
      delayMinutes: number;
      gateId: string | null;
    }[];
  };
  partnerOffers: {
    campaignId: string;
    name: string;
    advertiser: string;
    offerText: string | null;
    match: number;
  }[];
}

export interface Inventory {
  date: string;
  hours: number[];
  slotsPerHour: number;
  premiumThresholdPax: number;
  occupancy: number;
  screens: {
    screenId: string;
    name: string;
    zoneId: string;
    kind: string;
    basePrice: number;
    cells: {
      hour: number;
      pax: number;
      campaigns: number;
      sold: number;
      status: 'booked' | 'available' | 'premium' | 'quiet';
      premium: boolean;
      price: number;
    }[];
  }[];
}

export interface Forecast7 {
  model: string;
  days: {
    date: string;
    weekday: number;
    paxHours: number;
    index: number;
    occupancy: number;
    averagePrice: number;
  }[];
}

export interface DeliveryRow {
  advertiserId: string;
  name: string;
  kind: string;
  brandColor: string;
  activeCampaigns: number;
  today: Totals;
  pacingTarget: number;
  deliveryRatio: number | null;
  underDelivering: boolean;
}

export interface SegmentHeatmap {
  zoneId: string | null;
  zones: { id: string; name: string }[];
  segments: string[];
  hours: { hour: number; pax: number; shares: number[] }[];
}
