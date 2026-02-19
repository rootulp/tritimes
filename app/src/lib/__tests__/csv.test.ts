import { describe, it, expect } from "vitest";
import { parseCSVRows } from "../data";

describe("parseCSVRows", () => {
  it("parses simple unquoted fields", () => {
    const raw = "a,b,c\n1,2,3\n4,5,6";
    expect(parseCSVRows(raw)).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted field containing a newline", () => {
    const raw = 'Name,City,Country\nJoel,"4490 Jerslev\nJerslev",Denmark';
    expect(parseCSVRows(raw)).toEqual([
      ["Name", "City", "Country"],
      ["Joel", "4490 Jerslev\nJerslev", "Denmark"],
    ]);
  });

  it("handles quoted field containing a comma", () => {
    const raw = 'Name,City,Country\nJoel,"Portland, OR",USA';
    expect(parseCSVRows(raw)).toEqual([
      ["Name", "City", "Country"],
      ["Joel", "Portland, OR", "USA"],
    ]);
  });

  it("handles escaped quotes within a quoted field", () => {
    const raw = 'Name,Nickname\nJoel,"He said ""hello"""';
    expect(parseCSVRows(raw)).toEqual([
      ["Name", "Nickname"],
      ["Joel", 'He said "hello"'],
    ]);
  });

  it("handles empty fields", () => {
    const raw = "a,b,c\n,2,\n,,";
    expect(parseCSVRows(raw)).toEqual([
      ["a", "b", "c"],
      ["", "2", ""],
      ["", "", ""],
    ]);
  });

  it("handles CRLF line endings", () => {
    const raw = "a,b\r\n1,2\r\n3,4";
    expect(parseCSVRows(raw)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quoted field with newline followed by normal rows", () => {
    const raw =
      'FirstName,City,Gender,Country\nLars,"4490 Jerslev\nJerslev",Male,Denmark\nAnna,Berlin,Female,Germany';
    const rows = parseCSVRows(raw);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual(["Lars", "4490 Jerslev\nJerslev", "Male", "Denmark"]);
    expect(rows[2]).toEqual(["Anna", "Berlin", "Female", "Germany"]);
  });

  it("maps headers to values correctly with multiline fields", () => {
    const raw =
      'FirstName,City,Gender,Status\nLars,"4490 Jerslev\nJerslev",Male,Finisher';
    const rows = parseCSVRows(raw);
    const headers = rows[0];
    const values = rows[1];
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || "";
    });
    expect(record.FirstName).toBe("Lars");
    expect(record.City).toBe("4490 Jerslev\nJerslev");
    expect(record.Gender).toBe("Male");
    expect(record.Status).toBe("Finisher");
  });

  it("returns empty array for empty input", () => {
    expect(parseCSVRows("")).toEqual([]);
  });

  it("handles single row with no data rows", () => {
    const raw = "a,b,c";
    expect(parseCSVRows(raw)).toEqual([["a", "b", "c"]]);
  });
});
