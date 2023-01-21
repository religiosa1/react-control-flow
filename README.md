# react-control-flow

[SolidJS](https://www.solidjs.com/docs/latest/api#control-flow)-inspired
basic control-flow components and everyday async state hook library for
[React](https://reactjs.org/)

It fulfills everyday needs: iteration, conditional
display, Portals, ErrorBoundaries, and helpers for async operations (fetches or
whatever).

- native typescript support
- lightweight, zero 3d party dependencies, except react
- modern: react 16.8+ .. 18.x, no legacy APIs or weird hacks
- fully tested
- easy to use
- hooks and components for performing async operation; handling cancellations,
  mutations, race conditions and more.
- mostly SolidJs compatible interface (where it makes sense in the react context)
- covers common pitfalls (missed keys in maps, primitives as childrens etc.)
- ⚡⚡💩💩 bLaZinGly FaSt 💩💩⚡⚡

## Installation

```sh
npm install react-solid-flow
```

## Usage

### Components

#### For

```tsx
function For<T, U extends ReactNode>(props: {
  each: ReadonlyArray<T> | undefined | null;
  children: ReactNode | ((item: T, idx: number) => U);
  fallback?: ReactNode;
}): ReactElement | null;

<For each={collection} fallback="list is empty!">
  {(i) => <li key={i.id}>{i.name}</li>}
</For>
```

Rendering a collection of items from _each_ prop.
_children_ can be either a render prop function (more useful) or a static element.

If _each_ isn't an array or has zero length, display optional _fallback_. Any
nullish child is ommited. If every child is ommited, _fallback_ is shown.

You can specify a key prop directly on the root element of a child, using
item's data. If the key isn't specified or is falsy, then array index added as the
key automatically to avoid non-keyed items in collection.

#### Show

```tsx
function Show<T>(props: {
  when: T | undefined | null | false;
  children: ReactNode | ((item: NonNullable<T>) => ReactNode);
  fallback?: ReactNode;
}): ReactElement | null;

<Show when={parentSeen === 'mom'} fallback={<h3>nevermind...</h3>}>
  <h2>Hi mom!</h2>
</Show>
```

Conditionally render, depending on truthiness of _when_ props, either _children_
or (optionally) _fallback_

#### Switch / Match

```tsx
function Switch(props: {
  children: ReactNode;
  fallback?: ReactNode;
}): ReactElement | null;

function Match<T>(props: {
  when: T | undefined | null | false;
  children?: ReactNode | ((item: T) => ReactNode);
}): ReactElement | null;

<Switch fallback={<h3>nevermind...</h3>}>
  <Match when={parentSeen === "mom"}>
    Hi Mom!
  </Match>
  <Match when={parentSeen === "dad"}>
    Hi Dad!
  </Match>
</Switch>
```
Switch-case alike, renders one of mutually exclusive conditions (described in
'when' prop of Match component) of a switch.

Match should be a direct descendant of Switch and only the first
Match with truthy _when_ is rendered.

If no match has truthy _when_, then optional _fallback_ prop is shown.

#### ErrorBoundary

```tsx
class ErrorBoundary extends Component<{
  fallback?: ReactNode | ((err: unknown, reset: () => void) => ReactNode);
  children?: ReactNode;
  onCatch?: (error: unknown, errorInfo: unknown) => void;
}> {}

<ErrorBoundary fallback={(err, reset) => (
  <div className="panel-danger">
    I failed miserably: <code>{String(err)}</code>
    <button type="button" onClick={reset}>
      Try again!
    </button>
  </div>
)}>
  <SomePotentiallyFailingComponent />
</ErrorBoundary>
```

General error boundary, catches synchronous errors in renders and displays _fallback_
content.

_fallback_ can be a static element of a render prop function, which recieves
the occured error and _reset_ callback as its arguments.

A call to _reset_ clears the occured error and performs a rerender of children
content after that.

#### Await

```ts
export interface ResourceLike<T> {
  loading?: boolean;
  data: Awaited<T> | undefined;
  error: any;
}

function Await<T>(props: {
  for: ResourceLike<T>;
  fallback?: (() => ReactNode) | ReactNode;
  catch?: ((err: unknown) => ReactNode) | ReactNode;
  children?: ((data: Awaited<T>) => ReactNode) | ReactNode;
}): ReactElement | null;
```

Component for displaying some resource-like async data. It can be either
a resource returned by the useResource hook in this library, or any other
object, that conforms to this interface (i.e. responses from appollo-client).

```tsx
// See description of useResource hook bellow.
const [ resource ] = useResource(() => fetch(`/api/v1/employees`).then(r => sr.json()));

<Await
  for={resource}
  fallback="loading..."
  catch={(err) => <div>Error: {String(err)}</div>}
>
  {(data) => <div>Resolved data: {data}</div>}
</Await>
```

#### Dynamic

```tsx
type DynamicProps<T> = PropsWithRef<T> & {
  children?: any;
  component?: FunctionComponent<T> | ComponentClass<T> | string | keyof JSX.IntrinsicElements;
}

function Dynamic<T>({
  children,
  component,
  ...props
}: DynamicProps<T>): ReactElement | null;

<Dynamic component={isLink ? "a" : "span"} {...someProps}>
  Maybe click me
</Dynamic>
```

This component lets you insert an arbitrary Component or tag and passes
its props to it (omitting component prop).

#### Portal

```tsx
function Portal(props: {
  mount?: Element | DocumentFragment | string;
  children?: ReactNode;
}): ReactPortal | null;

<Portal mount="#modal-container-id">
  <dialog>
    Hi Mom!
  </dialog>
</Portal>
```
Component for rendering children outside of the component hierarchy root node.

React events still go as usual. _mount_ can be either a native node, or a
querySelector for such a node.

If no node is provided renders nothing.
<!-- _useShadow_ places the element in Shadow Root for style isolation -->

### Hooks

Helpers for async state.

#### useResource

```tsx
function useResource<T, TArgs extends readonly any[]>(
  fetcher:
    | ((...args: [ ...TArgs, FetcherOpts ]) => Promise<T> | T)
    | ((...args: [ ...TArgs ]) => Promise<T> | T),
  deps: [...TArgs] = [] as unknown as [...TArgs],
  opts?: ResourceOptions<T>
): ResourceReturn<T, TArgs>;

type ResourceReturn<T, TArgs extends readonly any[]> = [
  Resource<T>,
  {
    mutate: (v: Awaited<T>) => void;
    refetch: (...args: TArgs) => Promise<T> | T;
    abort: (reason?: any) => void;
  }
];

type ResourceOptions<T> = {
  initialValue?: Awaited<T> | (() => Awaited<T>);
  onCompleted?: (data: Awaited<T>) => void;
  onError?: (error: unknown) => void;
  skipFirstRun?: boolean;
  skipFnMemoization?: boolean;
};

interface FetcherOpts {
  refetching: boolean;
  signal: AbortSignal;
}

class Resource<T> implements ResourceLike<T> {
  loading: boolean;
  data: Awaited<T> | undefined;
  error: any;
  latest: Awaited<T> | undefined;
  state: ResourceState;

  constructor(init?: Partial<ResourceLike<T>>, previous?: { latest?: Awaited<T> });
  static from<T>(data: Promise<T> | Awaited<T> | undefined): Resource<T>;
  static getState(r: ResourceLike<any>): ResourceState;
}

type ResourceState = "unresolved" | "pending" | "ready" | "refreshing" | "errored";
```
Creating a Resource object, that reflects the result of async request, performed
by the fetcher function.

```tsx
const [{ data, error, loading }] = useResouce(
  (id, { signal }) => fetch(`/api/v1/employee/${id}`, { signal }).json(r => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return r.json();
  },
  [id]
);

// or better use Await component from above
return (
  <div className="employee">
    { loading ? (
      <span>Loading...</span>
    ) : error ? (
      <span>Error happened</span>
    ) : (
      {data.name}
    )}
  </div>
);
```

Result of fetcher call is resource `data` field, `loading` represents if there's
a pending call to fetcher, and if the fetcher call was rejected, then the
rejection value is stored in `error` field.

`latest` field of resource will return the last returned value.
This can be useful if you want to show the out-of-date data while the new
data is loading.

`fetcher` function is called every time deps array is changed.

Deps array is passed to the fetcher function as arguments and FetcherOpts object
containing AbortSignal and additional data is added as the last argument.
If deps array is ommited, fetcher is called only on mount.

Resource `state` field represents the current resource state:

| state      | data  | loading | error |
|:-----------|:-----:|:-------:|:-----:|
| unresolved | No    | No      | No    |
| pending    | No    | Yes     | No    |
| ready      | Yes   | No      | No    |
| refreshing | Yes   | Yes     | No    |
| errored    | No    | No      | Yes   |


FetcherOpts `signal` field should be directly passed to your fetch function
(or any other async function supporting AbortController signal) to abort it.

Every unsettled request will be aborted if deps array has been changed, or if the
component with this hook unmounts.

_useResource_ performs checks for race conditions and avoids unmounted state
updates, even if your fetcher function doesn't react on signal abortion
(but it really should though).

_useResource_ optimized to trigger only one rerender on each Resource state
change even in React@16.8, where no batching state updates are available.

```tsx
const Employee = ({ employeeId }) => {
  const [ { data, loading, error} ] = useResource(
    (id, { signal }) => fetch(`/api/v1/employee/${id}`, { signal }),
    [ employeeId ]
  );
};
```

Second value of the return tuple is contol object, which gives you the ability
to handle the resource imperatively.

**`mutate`**

Allows you to directly change the resource value.

**`refetch`**

Allows you to call fetcher function manually with the required arguments.
FetcherOpts with abort signal is added to arguments automatically.

**`abort`**

Allows you to abort the current fetcher call.

If abort is performed with no reason, or with AbortError instance, then
the state is still considered pending/refreshing, resource.error is
not updated, and onError callback is not called.
Any other reason will result in erorred resource state.

Resource won't be refetched until deps change again.

##### useResourceOptions

**`initial value`**

If initial value is passed makes the initial state either ready or pending,
depending on whether it was a sync value or a promise.

**`onCompleted` and `onError`**

callbacks can be passed to the hook to be called when resource resolves or
rejects correspondingly.

**`skip`**

Skip calls of fetcher (can still be called manually with refresh)

It can be useful if you're waiting for some of deps to be in certain state
before calling the fetcher or if you want to trigger the fetcher only
manually on some event.

**`skipFirstRun`**

enables you to skip first automatic trigger of fetcher function. It will be
triggered only after deps change

**`skipFnMemoization`**

with this flag, fetcher function won't be memoized and its change will result
in calls to it (the same way as if deps array was changed)

If no initial value is provided to the useResource, and skip == false,
skipFirstRun == false, resource is created with initial state `"pending"`
(resource `loading` field === true), to avoid flickering of content.
Otherwise, it's created with the `"unresolved"`.

Currently, there's no plans of supporting Suspense. This possibility was
investigated and abbandonded until the React team at least formally approves
the usage of Suspense for anything else, besides components lazy loading.
Implementation of Suspense support will require some global forms of promise
cache and cahce busting, and most likely this implementation will come from
the react itself, so it feels likke reinventing the wheel here.

If you really want to use suspended data fetches, there are some 3d party libs
for that, if you want a recomendation, there's [suspend-react](https://github.com/pmndrs/suspend-react)

Check out useResource-examples.md to see different forms of it in action.

Or check the demo project here [react-control-flow-demo](todo).

## Contributing
If you have any ideas or suggestions or want to report a bug, feel free to
write in the issues section or create a PR.

## License
react-control-flow is MIT licensed.