import { describe, it } from "vitest";
import { createResource } from "../createResource";
import { nextResource } from "../nextResource";
import { ResourceStorage } from "../ResourceStorage";

describe("nextResource", () => {
  const storage = new ResourceStorage();

  it("correctly updates core data", () => {
    let res = nextResource(createResource<string>(), {
      data: "test1",
      loading: true,
      error: "test2",
    });
    expect(res.data).toBe("test1");
    expect(res.loading).toBe(true);
    expect(res.error).toBe("test2");
  });

  it("keeps latest data in the state", () => {
    let res = nextResource(createResource<string>(), {
      data: "test1",
      loading: false,
      error: undefined,
    });
    res = nextResource(res, {
      data: undefined,
      loading: true,
      error: undefined,
    });
    res = nextResource(res, {
      data: undefined,
      loading: false,
      error: "test2",
    });
    res.promise.catch(() => {});
    expect(res.latest).toBe("test1");
  });

  it("updates resource state name", () => {
    let res = nextResource(createResource<string>(), {
      data: undefined,
      loading: true,
      error: undefined,
    });
    expect(res.state).toBe("pending")
    res = nextResource(res, {
      data: "test",
      loading: false,
      error: undefined,
    });
    expect(res.state).toBe("ready")
  });

  it("keeps the same promise if loading state keeps to be false", () => {
    let res = nextResource(createResource<string>(), {
      data: undefined,
      loading: false,
      error: undefined,
    });
    const prms1 = res.promise;
    res = nextResource(res, {
      data: "test",
      loading: false,
      error: undefined,
    });
    const prms2 = res.promise;
    expect(prms1).toBe(prms2);
  });

  it("resolves the promise, if advanced from loaded state with data", async () => {
    let res = nextResource(createResource<string>(), {
      data: undefined,
      loading: true,
      error: undefined,
    });
    res = nextResource(res, {
      data: "test1",
      loading: false,
      error: undefined,
    });
    await expect(res.promise).resolves.toBe("test1");
  });

  it("resolves the promise on sync data updates", async () => {
    let res = nextResource(createResource<string>(undefined, storage), {
      data: undefined,
      loading: false,
      error: undefined,
    }, storage);
    res = nextResource(res, {
      data: "test1",
      loading: false,
      error: undefined,
    }, storage);
    expect(storage.has(res.promise)).toBeTruthy();
    await expect(res.promise).resolves.toBe("test1");
    expect(storage.has(res.promise)).toBeFalsy();
  });

  it("rejects the promise, if advanced from loaded state with data", async () => {
    let res = nextResource(createResource<boolean>(undefined, storage), {
      data: undefined,
      loading: true,
      error: undefined,
    }, storage);
    res = nextResource(res, {
      data: undefined,
      loading: false,
      error: "test2",
    }, storage);
    expect(storage.has(res.promise)).toBeTruthy();
    await expect(res.promise).rejects.toThrow("test2");
    // resolved promise is removed from the storage
    expect(storage.has(res.promise)).toBeFalsy();
  });

  it("rejects the promise on sync errors", async () => {
    let res = nextResource(createResource<boolean>(undefined, storage), {
      data: undefined,
      loading: false,
      error: undefined,
    }, storage);
    res = nextResource(res, {
      data: undefined,
      loading: false,
      error: "test2",
    }, storage);
    expect(storage.has(res.promise)).toBeTruthy();
    await expect(res.promise).rejects.toThrow("test2");
    // rejected promise is removed from the storage
    expect(storage.has(res.promise)).toBeFalsy();
  });

  it("pending to refreshing state change also cancels old promise", async () => {
    let resPending = createResource<boolean>(Promise.resolve(true));
    let prms1 = resPending.promise;
    let res = nextResource(resPending, {
      data: false,
      loading: true,
    });
    let prms2 = res.promise;
    expect(prms1).not.toBe(prms2);
    await expect(prms1).rejects.toThrow();
  });

  it("refreshing to pending state change also cancels old promise", async () => {
    let resRefreshing = nextResource(createResource<boolean>(true), {
      data: true,
      loading: true,
    });
    let prms1 = resRefreshing.promise;
    let res = nextResource(resRefreshing, {
      data: undefined,
      loading: true,
    });
    let prms2 = res.promise;
    expect(prms1).not.toBe(prms2);
    await expect(prms1).rejects.toThrow();
  });
});