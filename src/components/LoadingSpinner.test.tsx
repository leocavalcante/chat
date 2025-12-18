import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { LoadingSpinner } from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  test("renders three dots", () => {
    const { container } = render(<LoadingSpinner />);
    const dots = container.querySelectorAll(".typing-dot");
    expect(dots.length).toBe(3);
  });

  test("dots have correct classes", () => {
    const { container } = render(<LoadingSpinner />);
    const dots = container.querySelectorAll(".typing-dot");
    dots.forEach((dot) => {
      expect(dot.classList.contains("rounded-full")).toBe(true);
    });
  });

  test("container has animation class", () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("animate-fade-up")).toBe(true);
  });
});
