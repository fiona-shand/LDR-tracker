export const PEOPLE = [
  {
    id: "fiona",
    name: "Fiona",
    airport: { iataCode: "MSP", city: "Minneapolis–St Paul" },
  },
  {
    id: "jake",
    name: "Jake",
    airport: { iataCode: "LHR", city: "London Heathrow" },
  },
] as const;

export const FIONA = PEOPLE[0];
export const JAKE = PEOPLE[1];
