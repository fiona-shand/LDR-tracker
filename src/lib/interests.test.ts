import { describe, expect, it } from "vitest";
import { catalogInterests, interestMatch, parseInterests } from "@/lib/interests";
import { FIONA, JAKE } from "@/lib/people";

describe("catalogInterests", () => {
  it("covers both home cities", () => {
    // Without these, visiting each other scores zero on interest match and is
    // silently penalised the moment any interest is chosen.
    expect(catalogInterests(FIONA.airport.iataCode).length).toBeGreaterThan(0);
    expect(catalogInterests(JAKE.airport.iataCode).length).toBeGreaterThan(0);
  });

  it("returns nothing for an airport we have no opinion about", () => {
    expect(catalogInterests("ZZZ")).toEqual([]);
  });
});

describe("interestMatch", () => {
  it("is neutral when nothing has been chosen", () => {
    expect(interestMatch(["food"], [])).toBe(0.5);
  });

  it("scores a full match at 1", () => {
    expect(interestMatch(["food", "history"], ["food", "history"])).toBe(1);
  });

  it("scores a partial match proportionally", () => {
    expect(interestMatch(["food"], ["food", "history"])).toBe(0.5);
  });

  it("scores no overlap at 0", () => {
    expect(interestMatch(["skiing"], ["beaches"])).toBe(0);
  });

  it("does not reward a destination for tags nobody asked for", () => {
    const broad = interestMatch(["food", "nature", "museums", "beaches"], ["food"]);
    const narrow = interestMatch(["food"], ["food"]);
    expect(broad).toBe(narrow);
  });
});

describe("parseInterests", () => {
  it("drops values that aren't real interests", () => {
    expect(parseInterests(["food", "not-a-thing", "skiing"])).toEqual(["food", "skiing"]);
  });
});
