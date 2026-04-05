export type BiasDirection = "Bullish" | "Bearish" | "Neutral";
export type PremiumDiscount = "Premium" | "Discount" | "Equilibrium";

export interface OrderBlock {
  timestamp: string;
  high: number;
  low: number;
  kind: "bullish" | "bearish";
  mitigated: boolean;
}

export interface FVG {
  timestamp: string;
  top: number;
  bottom: number;
  ce: number;
  kind: "bullish" | "bearish";
  filled: boolean;
}

export interface LiquidityLevel {
  price: number;
  kind: "BSL" | "SSL";
  equal: boolean;
}

export interface InstrumentBias {
  symbol: string;
  current_price: number;
  weekly_bias: BiasDirection;
  daily_bias: BiasDirection;
  structure_label: string;
  last_bos: string;
  swing_high: number;
  swing_low: number;
  equilibrium: number;
  premium_discount: PremiumDiscount;
  previous_day_high: number;
  previous_day_low: number;
  previous_week_high: number;
  previous_week_low: number;
  nearest_ob: OrderBlock | null;
  nearest_fvg: FVG | null;
  liquidity_levels: LiquidityLevel[];
  draw_on_liquidity: string;
  key_poi_label: string;
  confidence: number;
  narrative: string;
}

export interface DailyBias {
  date: string;
  generated_at: string;
  market_overview: string;
  instruments: InstrumentBias[];
}
