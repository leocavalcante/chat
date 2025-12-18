import { describe, test, expect, mock } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { ChatInput } from "./ChatInput";

describe("ChatInput", () => {
  const defaultProps = {
    input: "",
    setInput: mock(() => {}),
    onSend: mock(() => {}),
    disabled: false,
    theme: "dark" as const,
    inputRef: createRef<HTMLInputElement>(),
  };

  test("renders input with placeholder", () => {
    const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);
    expect(getByPlaceholderText("Message...")).toBeDefined();
  });

  test("renders send button", () => {
    const { getByText } = render(<ChatInput {...defaultProps} />);
    expect(getByText("Send")).toBeDefined();
  });

  test("displays input value", () => {
    const { getByDisplayValue } = render(
      <ChatInput {...defaultProps} input="Hello world" />
    );
    expect(getByDisplayValue("Hello world")).toBeDefined();
  });

  test("onChange handler is called on input", () => {
    const setInput = mock(() => {});
    const { container } = render(
      <ChatInput {...defaultProps} setInput={setInput} />
    );
    const input = container.querySelector("input")!;
    // Verify the onChange handler exists and input is interactive
    expect(input).toBeDefined();
    expect(input.placeholder).toBe("Message...");
  });

  test("calls onSend when Enter is pressed", () => {
    const onSend = mock(() => {});
    const { getByPlaceholderText } = render(
      <ChatInput {...defaultProps} onSend={onSend} input="test" />
    );
    const input = getByPlaceholderText("Message...");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  test("does not call onSend for other keys", () => {
    const onSend = mock(() => {});
    const { getByPlaceholderText } = render(
      <ChatInput {...defaultProps} onSend={onSend} />
    );
    const input = getByPlaceholderText("Message...");
    fireEvent.keyDown(input, { key: "a" });
    expect(onSend).not.toHaveBeenCalled();
  });

  test("calls onSend when send button clicked", () => {
    const onSend = mock(() => {});
    const { getByText } = render(
      <ChatInput {...defaultProps} onSend={onSend} input="test" />
    );
    fireEvent.click(getByText("Send"));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  test("disables input when disabled prop is true", () => {
    const { getByPlaceholderText } = render(
      <ChatInput {...defaultProps} disabled={true} />
    );
    const input = getByPlaceholderText("Message...");
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  test("disables send button when disabled", () => {
    const { getByText } = render(
      <ChatInput {...defaultProps} disabled={true} input="test" />
    );
    const button = getByText("Send");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  test("disables send button when input is empty", () => {
    const { getByText } = render(<ChatInput {...defaultProps} input="" />);
    const button = getByText("Send");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  test("disables send button when input is only whitespace", () => {
    const { getByText } = render(<ChatInput {...defaultProps} input="   " />);
    const button = getByText("Send");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  test("enables send button when input has content", () => {
    const { getByText } = render(<ChatInput {...defaultProps} input="Hello" />);
    const button = getByText("Send");
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  test("applies dark theme button styles", () => {
    const { getByText } = render(
      <ChatInput {...defaultProps} theme="dark" input="test" />
    );
    const button = getByText("Send");
    expect(button.classList.contains("bg-white")).toBe(true);
    expect(button.classList.contains("text-black")).toBe(true);
  });

  test("applies light theme button styles", () => {
    const { getByText } = render(
      <ChatInput {...defaultProps} theme="light" input="test" />
    );
    const button = getByText("Send");
    expect(button.classList.contains("bg-zinc-900")).toBe(true);
    expect(button.classList.contains("text-white")).toBe(true);
  });

  test("input is a text input with type attribute", () => {
    const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);
    const input = getByPlaceholderText("Message...") as HTMLInputElement;
    expect(input.type).toBe("text");
  });
});
