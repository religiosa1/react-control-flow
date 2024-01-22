import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";

import { useResourceReducer } from "../useResourceReducer";
import { NullishError } from "../../models/NullishError";
import { ErrorBoundary } from "../../components/ErrorBoundary";

describe("useResourceReducer", () => {
  it("returns the initial state", () => {
    const { result } = renderHook(() => useResourceReducer<boolean>());
    const [resource, dispatch] = result.current;
    expect(resource.loading).toBe(true);
    expect(resource.data).toBeUndefined();
    expect(resource.error).toBeUndefined();
    expect(resource.latest).toBeUndefined();
    expect(resource.state).toBe("pending");
    expect(dispatch).toBeInstanceOf(Function);
  });

  it("accepts static sync initializer", () => {
    const { result } = renderHook(() => useResourceReducer<boolean>(true));
    const [resource] = result.current;
    expect(resource.loading).toBe(true);
    expect(resource.data).toBe(true);
    expect(resource.state).toBe("refreshing");
  });

  it("accepts defered sync initializer", () => {
    const { result } = renderHook(() => useResourceReducer<boolean>(() => false));
    const [resource] = result.current;
    expect(resource.loading).toBe(true);
    expect(resource.data).toBe(false);
    expect(resource.state).toBe("refreshing");
  });

  it("allows to change state to pending", () => {
    const { result } = renderHook(() => useResourceReducer<boolean>());
    const [, dispatch] = result.current;
    act(() => dispatch({ type: "PEND" }));
    const [resource] = result.current;
    expect(resource.loading).toBe(true);
    expect(resource.data).toBeUndefined();
    expect(resource.error).toBeUndefined();
    expect(resource.latest).toBeUndefined();
    expect(resource.state).toBe("pending");
  });

  it("allows to resolve pending state", async () => {
    const { result } = renderHook(() => useResourceReducer<boolean>());
    const [, dispatch] = result.current;
    act(() => {
      dispatch({ type: "PEND" });
      dispatch({ type: "RESOLVE", payload: true });
    });
    const [resource] = result.current;
    expect(resource.loading).toBe(false);
    expect(resource.data).toBe(true);
    expect(resource.error).toBeUndefined();
    expect(resource.latest).toBe(true);
    expect(resource.state).toBe("ready");
  });

  it("'ready' -> 'refreshing' by the next 'PEND' call", () => {
    const { result } = renderHook(() => useResourceReducer<boolean>());
    const [, dispatch] = result.current;
    act(() => {
      dispatch({ type: "PEND" });
      dispatch({ type: "RESOLVE", payload: true });
      dispatch({ type: "PEND" });
    });
    const [resource] = result.current;
    expect(resource.loading).toBe(true);
    expect(resource.data).toBe(true);
    expect(resource.error).toBeUndefined();
    expect(resource.latest).toBe(true);
    expect(resource.state).toBe("refreshing");
  });

  it("allows to reject pending state", async () => {
    const { result } = renderHook(() => useResourceReducer<boolean>());
    const [, dispatch] = result.current;
    act(() => {
      dispatch({ type: "PEND" });
      dispatch({ type: "REJECT", payload: true });
    });
    const [resource] = result.current;
    expect(resource.loading).toBe(false);
    expect(resource.data).toBeUndefined();
    expect(resource.error).toBe(true);
    expect(resource.latest).toBeUndefined();
    expect(resource.state).toBe("errored");
  });

  it("puts a special error type into Error on nullish rejects", async () => {
    const { result } = renderHook(() => useResourceReducer<boolean>());
    const [, dispatch] = result.current;
    act(() => {
      dispatch({ type: "REJECT", payload: null });
    });
    const [resource] = result.current;
    const { error } = resource;
    expect(error).toBeInstanceOf(NullishError);
    // As error object doesn't have a cause field in node <= 14, don't test for that
    if (process.version.slice(1).split(".")[0] > "14") {
      expect(error instanceof NullishError && error.cause).toBeNull();
    }
  });

  it("throws an error on wrong dispatch types", async () => {
    const CustomTestComponent = () => {
      const [, dispatch] = useResourceReducer<boolean>(true);
      //@ts-expect-error bad dispatch
      dispatch({ type: "FAKE", payload: true });
      return <div />;
    };
    render((
      <ErrorBoundary fallback={err => err?.toString()}>
        <CustomTestComponent />
      </ErrorBoundary>
    ));
    screen.debug();
    expect(screen.queryAllByText("Error: Invalid action type").length).toBe(1);
  });
});