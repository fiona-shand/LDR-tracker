declare module "amadeus" {
  export interface AmadeusOptions {
    clientId: string;
    clientSecret: string;
    hostname?: "test" | "production";
  }

  export interface AmadeusResponse<T = unknown> {
    statusCode: number;
    body: string;
    result: unknown;
    data: T;
  }

  export default class Amadeus {
    constructor(options: AmadeusOptions);
    shopping: {
      flightOffersSearch: {
        get(params: Record<string, string>): Promise<AmadeusResponse<unknown[]>>;
      };
    };
  }
}
