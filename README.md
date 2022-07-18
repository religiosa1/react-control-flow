# Basic flow react components

[SolidJS](https://www.solidjs.com/docs/latest/api#control-flow)-inspired
basic control-flow components and everyday hooks library.

Also your common everyday needs, such as Portals, ErrorBoundaries, conditional
display, iteration, async helpers etc.

- typescript support
- lightweight, zero 3d party dependencies, except react
- modern: react 17+, no legacy APIs, HOCs or weird hacks
- fully tested
- easy to use
- your everyday general async helpers with optional Suspense support
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
  each: ReadonlyArray<T> | null | undefined;
  children: ReactNode | ((item: T, idx: number) => U);
  fallback?: ReactNode;
}): ReactElement | null;

<For each={collection} fallback="list is empty!">
  {(i) => <li key={i.name}>{i.name}</li>}
</For>
```

Rendering a collection of items from _each_ prop. If _each_ isn't an array
or has zero length, display optional _fallback_. _children_ can be either a
random prop (more useful) or a static element. If a child is missing a key
property, than it's added automatically (using its array index).
Any nullish child is ommited. If every child is ommited, fallback is shown.

#### Show

```tsx
function Show<T>(props: {
  when: T | undefined | null | false;
  children: ReactNode | ((item: T) => ReactNode);
  fallback?: ReactNode;
}): ReactElement | null;

<Show when={parentSeen() === 'mom'} fallback={<h3>nevermind...</h3>}>
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
```
Switch-case alike, render one of mutually exclusive conditions (described in
'when' prop of Match component) of a switch.

Match should be a direct descendant of Switch and only the first
Match with truthy _when_ is rendered.

#### ErrorBoundary

```tsx
class ErrorBoundary extends Component<{
  fallback?: ReactNode | ((err: unknown, reset: () => void) => ReactNode);
  children?: ReactNode;
  onCatch?: (error: unknown, errorInfo: unknown) => void;
}> {}

<ErrorBoundary fallback={(err, reset) => (
  <div className="panel-danger">
    I failed miserably:
    <code>{JSON.stringify(err, undefined, 2)}</code>
    <button type="button" onClick={reset}>
      Try again!
    </button>
  </div>
)}>
  <SomePotentiallyFailingComponent />
</ErrorBoundary>
```

General error boundary, catching synchronous error in renders and displays fallback content
in that case. Also supports callback form which passes in error and a reset function.

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
the props through to it.

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
Component for rendering children outside of the Component Hierarchy root node.
React events still go as usual. _mount_ can be either a native node, or a
querySelector for such a node.
_useShadow_ places the element in a Shadow Root for style isolation

### Hooks

Helpers for async state /suspenses.

#### useResource

```ts
interface AsyncState<T> {
  loading: boolean;
  error: unknown | null;
  result: Awaited<T> | null;
  promise: Promise<T> | null;
}

function useResource<T, TContext = never>(
  initialValue?: Promise<T> | Awaited<T>,
  opts?: {
    onCompleted?: (data: Awaited<T>, context: TContext) => void;
    onError?: (error: unknown, context: TContext) => void;
    /** arbitrary data, passed to callbacks, capturing context at the moment in which resource was set */
    context?: TContext
  }
): AsyncState<T> & {
  /** setting async state to the next value */
  set: (val: Promise<T> | Awaited<T>) => void;
  /** getter for using state inside of a suspense */
  read: () => Awaited<T> | null;
};
```

Turning a promise into async state / resource and enabling its usage inside of
Suspense.

If initial value or set argument isn't a promise, it's resolved imidietly, and
promise field contains fake immediately resolved promise (for consistency) and
loading immediately set no false.

After call to set(), previous result or error are reset to null.

For use in Suspense, access data through the read method inside render (make sure
not to call it before any of hook calls in the component).


```tsx
const Comp = () => {
  const resource = useResource(fetch("/api/v1/employees"));
  ...
  return (
    <div>{resource.read()}</div>
  )
};


<Suspense fallback="loading...">
  <Comp />
</Suspense>
```

#### useRequest

```ts
function useRequest<T, Args extends readonly any[]>(
  asyncFunction:
    ((...args: [ ...Args, cbOpts: { signal: AbortSignal } ]) => Promise<T> | Awaited<T>) |
    ((...args: [ ...Args ]) => Promise<T> | Awaited<T>),
  params: [ ...Args ],
  opts?: {
    /** initial value (before the first callback call, null otherwise) */
    initialValue?: Promise<T> | Awaited<T>;
    /** Skip first run (before params change)  */
    skipFirstRun?: boolean;
    /** Don't memoize asyncFunction, rerun it every time it changes */
    skipFnMemoization?: boolean;
    onCompleted?: (data: Awaited<T>, context: Args) => void;
    onError?: (error: unknown, context: Args) => void;
  }
): AsyncState<T> & {
  set: (val: Promise<T> | Awaited<T>) => void;
  read: () => Awaited<T> | null;
  /** Immediately rerun asyncFunction with provided args */
  execute: (...args: Args) => void;
};
```

Extension of useResource, tying an asyncFunction serving as a getter, to be run
every time, when it's dependencies change (passing those dependencies as its
arguments). Besides dependencies, async function also recieves an abort signal,
which will trigger onAbort, with each rerun (so you can drop a current request).

```tsx
const Employee = ({ employeeId }) => {
  const resource = useRequest(
    (id, { signal }) => fetch(`/api/v1/employee/${id}`, { signal }),
    [ employeeId ]
  );

  return  (
    <div>{resource.read()}</div>
  );
}

<Suspense fallback="loading...">
  <Employee employeeId={100500} />
</Suspense>
```

## License and stuff
### License
react-control-flow is MIT licensed.