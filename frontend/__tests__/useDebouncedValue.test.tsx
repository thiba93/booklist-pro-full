import type { ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "../hooks/useDebouncedValue";

function TestDebounce(props: {
  value: string;
  onValue: (value: string) => void;
  children?: ReactNode;
}) {
  const debounced = useDebouncedValue(props.value, 300);
  props.onValue(debounced);
  return <>{props.children}</>;
}

describe("useDebouncedValue", () => {
  it("waits 300 ms before exposing the next value", async () => {
    vi.useFakeTimers();
    const onValue = vi.fn();
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(<TestDebounce value="du" onValue={onValue} />);
    });
    await act(async () => {
      screen?.update(<TestDebounce value="dune" onValue={onValue} />);
    });

    expect(onValue).not.toHaveBeenLastCalledWith("dune");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(onValue).toHaveBeenLastCalledWith("dune");
    vi.useRealTimers();
  });
});
