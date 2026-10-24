/** Page components by `role/page`. */
import type { ComponentType } from 'react';

import type { RoleId } from '../app/roles';
import type { Advertiser } from '../lib/types';
import { AdminControlRoom } from './admin/control-room';
import { AdminDecisions } from './admin/decisions';
import { AdminMasterData } from './admin/master-data';
import { AdminRules } from './admin/rules';
import { AirlineFlights } from './airline/flights';
import { AirlineGates } from './airline/gates';
import { AirlineOffers } from './airline/offers';
import { MediaApprovals } from './media/approvals';
import { MediaDashboard } from './media/dashboard';
import { MediaInsights } from './media/insights';
import { MediaInventory } from './media/inventory';
import { PassengerPlayer } from './passenger/player';
import { Placeholder } from './placeholder';
import { RetailerCampaigns } from './retailer/campaigns';
import { RetailerCreatives } from './retailer/creatives';
import { RetailerDashboard } from './retailer/dashboard';
import { RetailerPromos } from './retailer/promos';

export interface PageProps {
  /** The company the view acts as (retailer and airline roles). */
  persona: Advertiser | undefined;
  /** Extra path segments (the passenger player's screen id). */
  rest: string[];
}

const PAGES = new Map<string, ComponentType<PageProps>>([
  ['passenger/overview', PassengerPlayer],
  ['admin/overview', AdminControlRoom],
  ['admin/master-data', AdminMasterData],
  ['admin/decisions', AdminDecisions],
  ['admin/rules', AdminRules],
  ['retailer/overview', RetailerDashboard],
  ['retailer/campaigns', RetailerCampaigns],
  ['retailer/creatives', RetailerCreatives],
  ['retailer/promos', RetailerPromos],
  ['media/overview', MediaDashboard],
  ['media/inventory', MediaInventory],
  ['media/approvals', MediaApprovals],
  ['media/insights', MediaInsights],
  ['airline/overview', AirlineFlights],
  ['airline/gates', AirlineGates],
  ['airline/offers', AirlineOffers],
]);

export function pageComponent(role: RoleId, page: string): ComponentType<PageProps> {
  return PAGES.get(`${role}/${page}`) ?? Placeholder;
}
