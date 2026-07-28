// Real IATA metropolitan-area codes for well-known multi-airport cities.
// Airport "municipality" data doesn't consistently group true metro areas
// (e.g. Newark's municipality is "Newark", not "New York"), so this small,
// hand-verified list powers the "all airports in this city" option in
// destination search. Member codes are cross-checked against
// airports-dataset.json.
export type MetroGroup = { code: string; cityName: string; memberCodes: string[] };

export const METRO_GROUPS: MetroGroup[] = [
  { code: "LON", cityName: "London", memberCodes: ["LHR", "LGW", "STN", "LTN", "LCY"] },
  { code: "NYC", cityName: "New York", memberCodes: ["JFK", "LGA", "EWR"] },
  { code: "PAR", cityName: "Paris", memberCodes: ["CDG", "ORY", "BVA"] },
  { code: "TYO", cityName: "Tokyo", memberCodes: ["NRT", "HND"] },
  { code: "CHI", cityName: "Chicago", memberCodes: ["ORD", "MDW"] },
  { code: "WAS", cityName: "Washington DC", memberCodes: ["IAD", "DCA", "BWI"] },
  { code: "MIL", cityName: "Milan", memberCodes: ["MXP", "LIN", "BGY"] },
  { code: "ROM", cityName: "Rome", memberCodes: ["FCO", "CIA"] },
  { code: "MOW", cityName: "Moscow", memberCodes: ["SVO", "DME", "VKO"] },
  { code: "STO", cityName: "Stockholm", memberCodes: ["ARN", "BMA"] },
  { code: "OSA", cityName: "Osaka", memberCodes: ["KIX", "ITM"] },
  { code: "SEL", cityName: "Seoul", memberCodes: ["ICN", "GMP"] },
  { code: "BJS", cityName: "Beijing", memberCodes: ["PEK", "PKX"] },
  { code: "BUE", cityName: "Buenos Aires", memberCodes: ["EZE", "AEP"] },
  { code: "SAO", cityName: "São Paulo", memberCodes: ["GRU", "CGH"] },
  { code: "RIO", cityName: "Rio de Janeiro", memberCodes: ["GIG", "SDU"] },
  { code: "YTO", cityName: "Toronto", memberCodes: ["YYZ", "YTZ"] },
];
