import { describe, expect, it } from "vitest";
import { formatAthleteName } from "../format";

describe("formatAthleteName", () => {
  it("title-cases an all-caps surname", () => {
    expect(formatAthleteName("MULLER Nicolas")).toBe("Muller Nicolas");
  });

  it("title-cases a fully all-caps name", () => {
    expect(formatAthleteName("MULLER NICOLAS")).toBe("Muller Nicolas");
  });

  it("leaves an already title-cased name unchanged", () => {
    expect(formatAthleteName("Muller Alain")).toBe("Muller Alain");
  });

  it("leaves correctly mixed-case names unchanged", () => {
    expect(formatAthleteName("McDonald Ian")).toBe("McDonald Ian");
    expect(formatAthleteName("van der Berg Jan")).toBe("van der Berg Jan");
  });

  it("handles hyphenated all-caps tokens", () => {
    expect(formatAthleteName("SMITH-JONES Anna")).toBe("Smith-Jones Anna");
  });

  it("handles apostrophes in all-caps tokens", () => {
    expect(formatAthleteName("O'BRIEN Patrick")).toBe("O'Brien Patrick");
  });

  it("restores Mc prefixes in all-caps tokens", () => {
    expect(formatAthleteName("MCDONALD Ian")).toBe("McDonald Ian");
  });

  it("does not special-case Mac prefixes", () => {
    expect(formatAthleteName("MACDONALD Ian")).toBe("Macdonald Ian");
  });

  it("handles accented uppercase letters", () => {
    expect(formatAthleteName("MÜLLER Hans")).toBe("Müller Hans");
    expect(formatAthleteName("GARCÍA José")).toBe("García José");
  });

  it("leaves single-letter initials untouched", () => {
    expect(formatAthleteName("SMITH J")).toBe("Smith J");
    expect(formatAthleteName("SMITH J.")).toBe("Smith J.");
  });

  it("title-cases two-letter all-caps tokens", () => {
    expect(formatAthleteName("NG JJ")).toBe("Ng Jj");
  });

  it("handles empty strings", () => {
    expect(formatAthleteName("")).toBe("");
  });

  it("preserves whitespace exactly", () => {
    expect(formatAthleteName("MULLER  Nicolas")).toBe("Muller  Nicolas");
  });
});
