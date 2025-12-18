import { describe, test, expect, mock } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  test("renders button with correct title for dark theme", () => {
    const onToggle = mock(() => {});
    const { getByTitle } = render(<ThemeToggle theme="dark" onToggle={onToggle} />);
    expect(getByTitle("Switch to light mode")).toBeDefined();
  });

  test("renders button with correct title for light theme", () => {
    const onToggle = mock(() => {});
    const { getByTitle } = render(<ThemeToggle theme="light" onToggle={onToggle} />);
    expect(getByTitle("Switch to dark mode")).toBeDefined();
  });

  test("calls onToggle when clicked", () => {
    const onToggle = mock(() => {});
    const { container } = render(<ThemeToggle theme="dark" onToggle={onToggle} />);
    const button = container.querySelector("button")!;
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("renders sun icon for dark theme", () => {
    const onToggle = mock(() => {});
    const { container } = render(<ThemeToggle theme="dark" onToggle={onToggle} />);
    const svg = container.querySelector("svg")!;
    // Sun icon has the path with "12 3v1m0 16v1m9-9h-1" pattern
    const path = svg.querySelector("path")!;
    expect(path.getAttribute("d")).toContain("12 3v1");
  });

  test("renders moon icon for light theme", () => {
    const onToggle = mock(() => {});
    const { container } = render(<ThemeToggle theme="light" onToggle={onToggle} />);
    const svg = container.querySelector("svg")!;
    // Moon icon has the path with "20.354 15.354" pattern
    const path = svg.querySelector("path")!;
    expect(path.getAttribute("d")).toContain("20.354 15.354");
  });
});
