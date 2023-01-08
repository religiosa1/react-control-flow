import { defaultStorage, IResourceStorage, PromiseControls } from "./ResourceStorage";

export interface ResourceLike<T> {
  /** Is new data currently loading */
  loading?: boolean;
  /** Resolved resource data for sync access
   *
   * Don't use it inside of a suspense, use function-accessor instead. This
   * field just resolves in undefined, without suspending the suspense.
   */
  data: Awaited<T> | undefined;
  /** Rejected resource error */
  error: any;
}

export type ResourceState = "unresolved" | "pending" | "ready" | "refreshing" | "errored";
export interface Resource<T> extends ResourceLike<T> {
  /** State name
   *
   * | state      | data  | loading | error |
   * |:-----------|:-----:|:-------:|:-----:|
   * | unresolved | No    | No      | No    |
   * | pending    | No    | Yes     | No    |
   * | ready      | Yes   | No      | No    |
   * | refreshing | Yes   | Yes     | No    |
   * | errored    | No    | No      | Yes   |
   */
  state: ResourceState;
  loading: boolean;
  /** last resolved value
  *
  * This can be useful if you want to show the out-of-date data while the new
  * data is loading.
  */
  latest: Awaited<T> | undefined;
  /** A promise that resolves/rejects with the resource.
   *
   * It is NOT the same promise as the one, that was provided by the fetcher,
   * as it changes only when the resource at whole resolves/rejects or reloads.
   * Also this promise can be rejected with AbortError at any time on refetch.
   */
  promise: Promise<T>;
  /** accessor for Suspense
   *
   * If you're using the resource in a Suspense, you __must__ call it inside,
   * the suspense. Just reading data won't cut it, as it won't suspend it.
   *
   * @example
   * ```tsx
   * const resource = useResource(fetcher);
   *
   * <Suspense fallback="loading...">
   *   {resource().someData}
   * </Suspense>
   * ```
   */
  (): T;
}

//------------------------------------------------------------------------------

/** Create a new resource */
export function createResource<T>(
  data?: Promise<T> | Awaited<T>,
  storage = defaultStorage
): Resource<T> {
  const res: Resource<T> = function(this: Resource<T>) {
    if (res.loading) {
      if (!(res.promise instanceof Promise)) {
        throw Promise.reject(new Error("incorrect resource state"));
      }
      throw res.promise;
    }
    if (res.error) {
      throw res.error;
    }
    return res.data!;
  };

  if (data instanceof Promise) {
    res.data = undefined as Awaited<T>;
    res.loading = true;
    renew(storage, res);
  } else {
    res.data = data;
    res.loading = false;
    if (data !== undefined) {
      res.promise = Promise.resolve(data);
    } else {
      renew(storage, res);
    }
  }
  res.error = undefined;
  res.latest = undefined;
  res.state = getResourceStateByData(res);
  return res;
}

/**
 * Determine resource-like state, based on its fields values.
 *
 * | state      | data  | loading | error |
 * |:-----------|:-----:|:-------:|:-----:|
 * | unresolved | No    | No      | No    |
 * | pending    | No    | Yes     | No*   |
 * | ready      | Yes   | No      | No    |
 * | refreshing | Yes   | Yes     | No*   |
 * | errored    | No*   | No      | Yes   |
 *
 * Values marked with * symbol are expected to equal the specified value,
 * but actually ignored, when determining the status.
 */
export function getResourceStateByData(i: ResourceLike<any>): ResourceState {
  if (i.data !== undefined && i.loading) {
    return "refreshing";
  }
  if (i.loading) {
    return "pending";
  }
  if (i.error !== undefined) {
    return "errored";
  }
  if (i.data) {
    return "ready";
  }
  return "unresolved";
}

/**
 * Creating a new derived resource, based on the existing resource,
 * setting its core data to the provided values and performing the required
 * side-effects (promises resolution/rejecting/renewal, setting latest data etc.)
 *
 * @param target source resource
 * @param data data to patch into the resource
 * @returns new resource
 */
export function nextResource<T>(target: Resource<T>, data: {
  loading: boolean,
  data?: Awaited<T>,
  error: any,
}, storage = defaultStorage): Resource<T> {
  const result = createResource<T>();

  result.data = data.data;
  result.loading = !!data.loading;
  result.error = data.error;
  // latest we merge separately -- avoiding overwriting if it doesn't have anything
  if (result.data != null) {
    result.latest = result.data;
  }
  result.state = getResourceStateByData(result);
  if (target.loading != result.loading) {
    // Resoving, rejecting or recreating the promise, as the loading state has changed
    if (result.loading) {
      renew(storage, result);
    } else if (result.error !== undefined) {
      reject(storage, result);
    } else {
      resolve(storage, result);
    }
  } else {
    // otherwise, reusing the old promise, so Suspense is happy
    result.promise = target.promise;
  }
  return result;
}

function renew<T>(storage: IResourceStorage, res: Resource<T>): void {
  if (res.promise) {
    storage.delete(res.promise);
  }
  let controls: PromiseControls;
  const promise = new Promise<T>((resolve, reject) => {
    controls = { resolve, reject };
  });
  res.promise = promise;
  storage.set(promise, controls!);
}

function resolve<T>(storage: IResourceStorage, res: Resource<T>) {
  if (!res?.promise) {
    return;
  }
  const controls = storage.get(res.promise);
  if (controls?.resolve instanceof Function) {
    controls.resolve(res.data);
  }
  storage.delete(res.promise);
}

function reject<T>(storage: IResourceStorage, res: Resource<T>) {
  if (!res?.promise) {
    return;
  }
  const controls = storage.get(res.promise);
  if (controls?.reject instanceof Function) {
    controls.reject(res.data);
  }
  storage.delete(res.promise);
}