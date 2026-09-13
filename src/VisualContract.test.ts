import { describe, expect, it } from "vitest";
import "./styles.css";

describe("quantity input visual contract", () => {
  it("keeps editable m² values visibly legible", () => {
    const row = document.createElement("div");
    row.className = "order-line";
    const input = document.createElement("input");
    row.append(input);
    document.body.append(row);
    expect(getComputedStyle(input).fontSize).not.toBe("0px");
    row.remove();
  });
});
