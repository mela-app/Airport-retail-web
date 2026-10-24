/** Shapes of the API responses the web app reads (see docs/openapi.json and /api/docs). */

export interface ClockState {
  now: string;
  playing: boolean;
  speed: number;
  start: string;
  end: string;
}

export interface SimState {
  clock: ClockState;
  airport: { code: string; utcOffsetMinutes: number; currency: string };
  day: { date: string; festival: string | null; schoolHoliday: boolean };
  startTime: string;
  injection: { flights: boolean; screens: boolean };
  adapters: { flights: string; space: string; audience: string };
}

export interface PublicConfig {
  publicBaseUrl: string;
  airport: { code: string; utcOffsetMinutes: number };
  currency: string;
  simDate: string;
  slotSeconds: number;
  aiProvider: string;
}

export type AdvertiserKind = 'retailer' | 'fnb' | 'airline' | 'brand' | 'service';

export interface Advertiser {
  id: string;
  name: string;
  kind: AdvertiserKind;
  category: string;
  airlineIata: string | null;
  brandColor: string;
  active?: boolean;
}

export interface FlightView {
  id: string;
  direction: 'A' | 'D';
  airlineIata: string;
  flightNumber: string;
  origin: string;
  destination: string;
  terminal: string;
  scheduledTime: string;
  estimatedTime: string | null;
  gate: string | null;
  stand: string | null;
  aircraftTypeIcao: string;
  seats: number;
  pax: number | null;
  status: string;
  delayCodes: string[];
  /** `T2-42`. */
  gateId: string | null;
  delayMinutes: number;
  otherCity: string | null;
}

export type ScreenKind = 'gate_display' | 'totem' | 'video_wall' | 'fids_ad_panel';

export interface ScreenView {
  id: string;
  name: string;
  terminalId: string;
  zoneId: string;
  position: { x: number; y: number };
  kind: ScreenKind;
  orientation: 'landscape' | 'portrait';
  nearestGateIds: string[];
  basePricePerSlot: number;
  status: string;
}

export interface SimEvent {
  action: string;
  detail: Record<string, unknown>;
  at: string;
}

export interface SegmentShare {
  segment: string;
  share: number;
}

export interface CreativeView {
  id: string;
  advertiserId?: string;
  name?: string;
  template: 'offer_split' | 'hero_full' | 'gate_message' | 'voucher' | 'destination';
  artwork: string;
  palette: { accent: string; background: string; foreground: string };
  content: Record<'en' | 'ar', { headline: string; body: string; badge?: string | null; cta?: string }>;
  formats?: string[];
  status?: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface ScoreTerm {
  segment: string;
  share: number;
  weight: number;
}

export interface CandidateView {
  campaignId: string;
  campaignName: string;
  advertiserName: string;
  eligible: boolean;
  failed: { rule: string; passed: boolean; detail: string }[];
  score: {
    final: number;
    match: number;
    boost: number;
    performance: number;
    audienceWeight: number;
    performanceWeight: number;
    triggers: { type: string; boost: number; detail: string }[];
    dimensions: { dimension: string; value: number; terms: ScoreTerm[] }[];
  } | null;
}

export interface CrowdFlight {
  flightId: string;
  flight: string;
  destination: string;
  gateId: string | null;
  pax: number;
  delayMin: number;
  dwellMin: number;
  status: string;
}

export interface DecisionRunView {
  id: string;
  screenId: string;
  slotStart: string;
  slotEnd: string;
  slots: number;
  decidedAt: string;
  mode: 'ai_verified' | 'ai_rejected' | 'rule_based' | 'manual_pin' | 'house';
  campaignId: string | null;
  creativeId: string | null;
  score: number | null;
  contextId: string;
  checks: CheckResult[];
  rules: { rule: string; campaignId?: string; detail: string }[];
  reason: string;
}

export interface ScreenNow {
  screen: ScreenView & { sizeInches: number; resolution: string };
  status: { status: 'online' | 'degraded' | 'offline'; since: string; latencyMs: number | null } | null;
  run: DecisionRunView | null;
  claim: { token: string; url: string; expiresAt: string; flightId: string | null } | null;
  campaign: { id: string; name: string; advertiserId: string; promo: { offerText: string } | null } | null;
  creative: CreativeView | null;
  context: {
    id: string;
    computedAt: string;
    windowStart: string;
    crowd: {
      pax: number;
      medianDwellMin: number;
      maxDelayMin: number;
      /** Percent (0–100). */
      international: number;
      tripPurpose: SegmentShare[];
      partyType: SegmentShare[];
      ageBand: SegmentShare[];
      topNationalities: { code: string; label: string; share: number }[];
      topDestinations: { code: string; label: string; share: number }[];
      flights: CrowdFlight[];
    };
    candidates: CandidateView[];
    order: string[];
    ai: { provider: string; model: string; status: string; checks: CheckResult[]; rationale: string | null };
    evidenceCount: number;
  } | null;
}

export interface ClaimOffer {
  token: string;
  status: 'open' | 'expired';
  expiresAt: string;
  secondsLeft: number;
  shared: boolean;
  campaign: { id: string; name: string; advertiser: string; offerText: string; shareable: boolean };
  creative: Pick<CreativeView, 'id' | 'content' | 'palette' | 'artwork'> | null;
  outlet: { id: string; name: string; zoneId: string; zoneName: string | null; terminalId: string } | null;
  flight: { id: string; label: string; gate: string | null; gateCloseAt: string | null } | null;
  screen: { id: string; name: string } | null;
}

export interface ClaimedCode {
  code: string;
  expiresAt: string;
  offerText: string;
  outlet: ClaimOffer['outlet'];
  shareable: boolean;
  parentCode: string | null;
}

export interface ClaimLink {
  token: string;
  url: string;
  expiresAt: string;
}

export type Trigger =
  | { type: 'delay_over'; minutes: number; airlineIata: string | null; destinations: string[]; boost: number }
  | { type: 'gate_change'; boost: number }
  | { type: 'boarding_starts'; boost: number }
  | { type: 'festival_day'; boost: number };

export interface Campaign {
  id: string;
  advertiserId: string;
  name: string;
  objective: 'awareness' | 'footfall' | 'conversion' | 'goodwill';
  status: 'draft' | 'pending_review' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  creativeIds: string[];
  segmentWeights: Record<string, number>;
  hardFilters: {
    market: 'domestic' | 'international' | null;
    destinationRegions: string[];
    destinations: string[];
    minDwellMinutes: number | null;
    minCrowd: number | null;
  };
  placement: {
    zoneIds: string[];
    screenIds: string[];
    gateIds: string[];
    schedule: {
      start: string;
      end: string;
      daysOfWeek: number[];
      hours: { from: number; to: number } | null;
    };
  };
  budget: { total: number; dailyCap: number; cpm: number; frequencyCapPerScreenHour: number };
  triggers: Trigger[];
  promo: {
    offerText: string;
    codePrefix: string;
    validity: { mode: 'boarding_close' } | { mode: 'minutes'; minutes: number };
    shareable: boolean;
    outletId: string | null;
    inStock: boolean;
  } | null;
  airlinePriority: boolean;
  coFundedBy: string | null;
  competitorGroup: string | null;
  performanceIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Outlet {
  id: string;
  advertiserId: string;
  name: string;
  category: string;
  zoneId: string;
  terminalId: string;
  averageBasket: number;
}

export interface Locations {
  terminals: { id: string; name: string; outline: { x: number; y: number; width: number; height: number } }[];
  zones: {
    id: string;
    terminalId: string;
    name: string;
    kind: string;
    side: 'landside' | 'airside';
    area: { x: number; y: number; width: number; height: number };
  }[];
  gates: {
    id: string;
    code: string;
    terminalId: string;
    zoneId: string;
    remote: boolean;
    position: { x: number; y: number };
    active?: boolean;
  }[];
}
